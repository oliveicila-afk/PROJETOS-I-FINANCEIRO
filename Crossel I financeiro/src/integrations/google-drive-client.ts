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

    throw new Error('JWT signing não implementado - use biblioteca crypto do Node.js');
  }

  async searchFilesByCustomer(customerIdentifier: string): Promise<DriveFile[]> {
    const query = `trashed=false and (name contains "${customerIdentifier}" or fullText contains "${customerIdentifier}")`;

    return this.searchFiles(query);
  }

  async searchBankDocuments(customerIdentifier: string): Promise<DriveFile[]> {
    const query = `trashed=false and (
      name contains "${customerIdentifier}"
      and (
        name contains "contracheque"
        or name contains "extrato"
        or name contains "comprovante"
      )
    )`;

    return this.searchFiles(query);
  }

  async getFolderContents(folderId: string): Promise<DriveFile[]> {
    const query = `trashed=false and "${folderId}" in parents`;

    return this.searchFiles(query);
  }

  private async searchFiles(query: string): Promise<DriveFile[]> {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      q: query,
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
    const token = await this.getAccessToken();

    const metadata = await this.getFileMetadata(fileId);
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${token}`;
  }
}
