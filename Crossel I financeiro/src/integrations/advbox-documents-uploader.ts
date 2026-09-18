export type AdvBoxDocumentConfig = {
  apiToken: string;
  uploadUrl?: string;
};

export type UploadResult = {
  success: boolean;
  fileId?: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  message?: string;
};

export class AdvBoxDocumentsUploader {
  private uploadUrl: string;

  constructor(private config: AdvBoxDocumentConfig) {
    this.uploadUrl = config.uploadUrl || 'https://app.advbox.com.br/s3';
  }

  async uploadFile(file: Blob, fileName: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file, fileName);

    try {
      const response = await fetch(this.uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as Record<string, unknown>;

      const fileId = ((data.id || data.fileId || data.file_id) as string) || '';
      const uploadedAt = new Date().toISOString();

      return {
        success: true,
        fileId,
        fileName,
        size: file.size,
        uploadedAt,
        message: `Arquivo ${fileName} enviado com sucesso`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        fileName,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        message: `Erro ao enviar ${fileName}: ${message}`
      };
    }
  }

  async uploadMultipleFiles(files: Array<{ file: Blob; name: string }>): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    for (const { file, name } of files) {
      const result = await this.uploadFile(file, name);
      results.push(result);

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  async attachFileToLawsuit(lawsuitId: string, fileId: string, fileName: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`https://app.advbox.com.br/api/v1/lawsuits/${lawsuitId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_id: fileId,
          file_name: fileName
        })
      });

      if (!response.ok) {
        throw new Error(`Attach failed: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        message: `Arquivo ${fileName} anexado ao processo com sucesso`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        message: `Erro ao anexar ${fileName}: ${message}`
      };
    }
  }
}
