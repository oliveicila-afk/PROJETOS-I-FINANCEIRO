export type AdvBoxConfig = {
  apiUrl: string;
  apiToken: string;
};

export type AdvBoxResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  offset?: number;
  limit?: number;
  totalCount?: number;
  query?: Record<string, unknown>;
};

export class AdvBoxClient {
  private config: AdvBoxConfig;

  constructor(config: AdvBoxConfig) {
    this.config = config;
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    const url = new URL(`${this.config.apiUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`AdvBox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as AdvBoxResponse<T>;
    if (data.success === false) {
      throw new Error(`AdvBox API error: ${data.message || data.errors?.join(', ')}`);
    }

    return data.data !== undefined ? data.data : data as T;
  }

  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`AdvBox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as AdvBoxResponse<T>;
    if (data.success === false) {
      throw new Error(`AdvBox API error: ${data.message || data.errors?.join(', ')}`);
    }

    return data.data !== undefined ? data.data : data as T;
  }

  async put<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`AdvBox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as AdvBoxResponse<T>;
    if (data.success === false) {
      throw new Error(`AdvBox API error: ${data.message || data.errors?.join(', ')}`);
    }

    return data.data !== undefined ? data.data : data as T;
  }
}
