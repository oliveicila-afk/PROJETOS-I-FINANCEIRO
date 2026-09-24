import { createSign } from 'node:crypto';

export type GoogleDriveConfig = {
  serviceAccountEmail: string;
  privateKey: string;
  rootFolderId: string;
};

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  createdTime: string;
  modifiedTime: string;
};

export type DriveFolder = {
  id: string;
  name: string;
  mimeType: 'application/vnd.google-apps.folder';
  createdTime: string;
};

export class GoogleDriveClient {
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(private config: GoogleDriveConfig) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const payload = {
      iss: this.config.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();
    const signature = signer.sign(this.config.privateKey).toString('base64url');
    const assertion = `${unsignedToken}.${signature}`;
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      })
    });

    if (!response.ok) throw new Error(`Google OAuth error: ${response.status} ${response.statusText}`);
    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + Math.max(data.expires_in - 60, 60) * 1000;
    return this.accessToken;
  }

  async searchFilesByCustomer(customerIdentifier: string): Promise<DriveFile[]> {
    const identifierTokens = this.normalizeSearchText(customerIdentifier).split(' ').filter((token) => token.length > 2);
    const candidates = new Map<string, DriveFile>();

    for (const token of identifierTokens) {
      const query = `trashed=false and mimeType = 'application/vnd.google-apps.folder' and name contains "${token}"`;
      const matches = await this.searchFiles(query, this.config.rootFolderId);
      matches.forEach((match) => candidates.set(match.id, match));
    }

    return [...candidates.values()].filter((folder) => {
      const folderName = this.normalizeSearchText(folder.name);
      return identifierTokens.every((token) => folderName.includes(token));
    });
  }

  async searchBankDocuments(customerIdentifier: string): Promise<DriveFile[]> {
    const folders = await this.searchFilesByCustomer(customerIdentifier);
    const documents: DriveFile[] = [];
    for (const folder of folders) {
      await this.collectBankDocuments(folder.id, documents);
    }
    return documents;
  }

  async getFolderContents(folderId: string): Promise<DriveFile[]> {
    return this.searchFiles(`trashed=false and "${folderId}" in parents`, folderId);
  }

  private async searchFiles(query: string, parentId: string): Promise<DriveFile[]> {
    const scopedQuery = `'${parentId}' in parents and (${query})`;
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      q: scopedQuery,
      pageSize: '100',
      spaces: 'drive',
      fields: 'files(id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime)'
    });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { files?: DriveFile[] };
    return data.files || [];
  }

  private async collectBankDocuments(folderId: string, documents: DriveFile[]): Promise<void> {
    const contents = await this.getFolderContents(folderId);
    for (const file of contents) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        await this.collectBankDocuments(file.id, documents);
      } else if (/contracheque|holerite|extrato|banco|consign|comprovante/i.test(file.name)) {
        documents.push(file);
      }
    }
  }

  private normalizeSearchText(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      fields: 'id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime'
    });

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<DriveFile>;
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const token = await this.getAccessToken();

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async getFileDownloadUrl(fileId: string): Promise<string> {
    const metadata = await this.getFileMetadata(fileId);
    return metadata.webContentLink || metadata.webViewLink;
  }
}
