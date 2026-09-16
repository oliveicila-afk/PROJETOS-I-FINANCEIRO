import type { AsaasClient, AsaasCustomer } from '../integrations/asaas.js';

export type ConversationMessage = {
  text?: string;
  imageUrl?: string;
};

export type ConversationSearch = {
  listMessages(channelPhone: string, recipientPhone: string): Promise<ConversationMessage[]>;
};

export type ImageTextReader = {
  read(imageUrl: string): Promise<string>;
};

export type IdentificationResult =
  | { status: 'identified'; customer: AsaasCustomer; searchedChannels: string[] }
  | { status: 'request_identifier'; message: string; searchedChannels: string[] }
  | { status: 'handoff'; message: string; searchedChannels: string[] };

const requestIdentifierMessage = 'Para localizar seu cadastro com segurança, informe seu nome completo ou CPF.';
const handoffMessage = 'Não consegui confirmar seu cadastro com segurança. Vou encaminhar seu atendimento para uma pessoa da equipe.';

function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

function extractCpfs(text: string): string[] {
  return [...text.matchAll(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g)]
    .map((match) => normalizeCpf(match[0]))
    .filter((cpf, index, values) => values.indexOf(cpf) === index);
}

function extractFullNames(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(/(?:meu nome [ée]|nome completo [ée])\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){1,5})/gi)) {
    names.push(match[1].trim());
  }
  return names;
}

export async function identifyCustomerFromConversations(
  asaas: Pick<AsaasClient, 'listCustomers'>,
  conversations: ConversationSearch,
  imageReader: ImageTextReader,
  channels: string[],
  recipientPhone: string
): Promise<IdentificationResult> {
  const messages = (await Promise.all(
    channels.map((channel) => conversations.listMessages(channel, recipientPhone))
  )).flat();
  const imageTexts = await Promise.all(
    messages.flatMap((message) => message.imageUrl ? [imageReader.read(message.imageUrl)] : [])
  );
  const text = [...messages.map((message) => message.text ?? ''), ...imageTexts].join('\n');

  const cpfs = extractCpfs(text);
  const names = extractFullNames(text);
  let foundIdentifier = cpfs.length > 0 || names.length > 0;

  for (const cpfCnpj of cpfs) {
    const customers = await asaas.listCustomers({ cpfCnpj, limit: 10 });
    if (customers.data.length === 1) {
      return { status: 'identified', customer: customers.data[0], searchedChannels: channels };
    }
    if (customers.data.length > 1) {
      foundIdentifier = true;
    }
  }

  for (const name of names) {
    const customers = await asaas.listCustomers({ name, limit: 10 });
    if (customers.data.length === 1) {
      return { status: 'identified', customer: customers.data[0], searchedChannels: channels };
    }
    if (customers.data.length > 1) {
      foundIdentifier = true;
    }
  }

  if (!foundIdentifier) {
    return { status: 'request_identifier', message: requestIdentifierMessage, searchedChannels: channels };
  }

  return { status: 'request_identifier', message: requestIdentifierMessage, searchedChannels: channels };
}