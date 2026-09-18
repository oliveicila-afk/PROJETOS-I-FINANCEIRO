import { AdvBoxClient } from './advbox-client.js';

export type AdvBoxPost = {
  id: string;
  lawsuit_id: string;
  responsible: string;
  title: string;
  content: string;
  status: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
};

export type PostFilter = {
  responsible?: string;
  lawsuit_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export class AdvBoxPostsService {
  constructor(private client: AdvBoxClient) {}

  async getPosts(filter: PostFilter): Promise<AdvBoxPost[]> {
    return this.client.get<AdvBoxPost[]>('/posts', {
      ...filter,
      limit: filter.limit || 100
    });
  }

  async getPostsByResponsible(responsible: string): Promise<AdvBoxPost[]> {
    return this.getPosts({
      responsible,
      limit: 100
    });
  }

  async getPostsByLawsuit(lawsuitId: string): Promise<AdvBoxPost[]> {
    return this.getPosts({
      lawsuit_id: lawsuitId,
      limit: 100
    });
  }

  async getScheduleForResponsible(responsible: string): Promise<AdvBoxPost[]> {
    return this.getPosts({
      responsible,
      status: 'pending',
      limit: 100
    });
  }

  async createPost(data: Record<string, unknown>): Promise<AdvBoxPost> {
    return this.client.post<AdvBoxPost>('/posts', data);
  }
}
