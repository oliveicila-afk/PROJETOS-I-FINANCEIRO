import { AdvBoxClient } from './advbox-client.js';

export type AdvBoxPost = {
  id: string;
  date?: string;
  date_deadline?: string | null;
  task?: string;
  notes?: string;
  lawsuit_id: string;
  responsible?: string;
  title?: string;
  content?: string;
  status?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  users?: Array<{ user_id: number; name: string; completed?: boolean | null; important?: number; urgent?: number }>;
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

  async isAssignedToFinancialTeam(lawsuitId: string): Promise<boolean> {
    const posts = await this.getPostsByLawsuit(lawsuitId);
    return posts.some((post) => (post.users ?? []).some((user) => isFinancialTeamMember(user.name)));
  }
}

const financialTeamMembers = [
  'gabriele nascimento',
  'kassia lorena goudinho nunes',
  'priscila de oliveira dos santos'
];

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function isFinancialTeamMember(name: string): boolean {
  const normalized = normalizeName(name);
  return financialTeamMembers.some((member) => normalized === member || normalized.includes(member));
}
