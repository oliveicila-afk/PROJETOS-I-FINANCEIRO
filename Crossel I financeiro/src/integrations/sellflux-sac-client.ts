export type SellFluxConfig = {
  apiUrl: string;
  apiToken: string;
};

export type SACHistory = {
  id: string;
  customer_phone: string;
  customer_name: string;
  message_date: string;
  message_content: string;
  sender: 'customer' | 'agent';
  agent_name?: string;
};

export type SACCustomerSummary = {
  phone: string;
  name: string;
  total_messages: number;
  last_message_date: string;
  last_message_content: string;
  agent_name?: string;
  customer_status: 'active' | 'inactive' | 'blocked';
};

export class SellFluxSACClient {
  private sacApiUrl: string;

  constructor(private config: SellFluxConfig) {
    this.sacApiUrl = this.config.apiUrl;
  }

  async getCustomerHistory(customerId: string, limit = 50, page = 0): Promise<SACHistory[]> {
    return this.get<SACHistory[]>(`/chat/message`, {
      limit,
      page,
      lead_id: customerId
    });
  }

  async getCustomerSummary(customerId: string): Promise<SACCustomerSummary> {
    const history = await this.getCustomerHistory(customerId, 100, 0);

    return {
      phone: '',
      name: '',
      total_messages: history.length,
      last_message_date: history.length > 0 ? history[0].message_date : new Date().toISOString(),
      last_message_content: history.length > 0 ? history[0].message_content : '',
      customer_status: 'active'
    };
  }

  async getLatestMessages(customerId: string, limit = 10): Promise<SACHistory[]> {
    const history = await this.getCustomerHistory(customerId, limit, 0);
    return history.slice(0, limit);
  }

  async searchByCustomerName(name: string): Promise<SACCustomerSummary[]> {
    throw new Error('Busca por nome não disponível via API. Use ID do lead.');
  }

  async searchByPhone(phone: string): Promise<SACCustomerSummary | null> {
    throw new Error('Busca por telefone não disponível via API. Use ID do lead.');
  }

  async getConversationWithAnalysis(customerPhone: string): Promise<{
    history: SACHistory[];
    summary: SACCustomerSummary;
    hasOpportunity: boolean;
    indicators: string[];
  }> {
    const [history, summary] = await Promise.all([
      this.getCustomerHistory(customerPhone, 100),
      this.getCustomerSummary(customerPhone)
    ]);

    const indicators = this.analyzeHistory(history);
    const hasOpportunity = indicators.length > 0;

    return {
      history,
      summary,
      hasOpportunity,
      indicators
    };
  }

  private analyzeHistory(history: SACHistory[]): string[] {
    const indicators: string[] = [];
    const content = history.map((h) => h.message_content.toLowerCase()).join(' ');

    const keywords = [
      { pattern: /ação bancária|acao bancaria|cheque especial|limite/, indicator: 'Possível ação bancária' },
      { pattern: /planejamento|investimento|poupança|seguro/, indicator: 'Interesse em produtos' },
      { pattern: /renegociação|refinanciamento|débito/, indicator: 'Potencial renegociação' },
      { pattern: /judicialização|ação judicial|processo/, indicator: 'Questão judicial pendente' },
      { pattern: /não tem interesse|sem interesse|não|nao quero/, indicator: 'Interesse negativo' }
    ];

    keywords.forEach((kw) => {
      if (kw.pattern.test(content)) {
        indicators.push(kw.indicator);
      }
    });

    return indicators;
  }

  private async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${this.sacApiUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'token-user': this.config.apiToken,
        'token-projeto': this.config.apiToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SellFlux SAC API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
