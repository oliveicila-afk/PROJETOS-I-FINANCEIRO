#!/usr/bin/env python3
"""
Revisar casos 'sem oportunidade' no Advbox
Verifica contracheques no Google Drive e histórico no SellFlux
Automatiza as skills:
- revisar-sem-oportunidade-advbox
- verificar-cliente-sac-sellflux
"""

import os
import json
import re
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging

import requests
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import PyPDF2

# ============================================================================
# CONFIGURAÇÃO E LOGGING
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Tokens e configurações via variáveis de ambiente
ADVBOX_API_TOKEN = os.getenv('ADVBOX_API_TOKEN')
SELLFLUX_API_TOKEN = os.getenv('SELLFLUX_API_TOKEN_')
GOOGLE_DRIVE_CREDENTIALS = os.getenv('GOOGLE_DRIVE_CREDENTIALS')  # JSON em base64
ADVBOX_BASE_URL = "https://api.advbox.com"
SELLFLUX_BASE_URL = "https://api-lb-sac.sellflux.app"

# Padrões de busca para demandas bancárias
LOAN_PATTERNS = [
    r"empr[eé]stimo",
    r"consignado",
    r"consigna[çc][ãa]o",
    r"CDC",
    r"cr[eé]dito direto ao consumidor",
    r"parcela",
    r"margem",
    r"cart[ãa]o consignado",
    r"tarifa",
    r"d[eé]bito autom[ãa]tico",
    r"financeira",
    r"banco",
]

# ============================================================================
# CLASSE: ADVBOX
# ============================================================================

class AdvboxAPI:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = ADVBOX_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def get_posts_sem_oportunidade(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Busca posts classificados como 'sem oportunidade' no Advbox.
        Retorna lista de posts com cliente, processo, etc.
        """
        logger.info(f"Buscando posts 'sem oportunidade' (limite: {limit})...")

        try:
            # Ajuste endpoint conforme documentação da API do Advbox
            # Exemplo: /posts?classification=sem_oportunidade&limit=50
            url = f"{self.base_url}/posts"
            params = {
                "classification": "sem_oportunidade",
                "limit": limit,
                "sort": "-created_at"
            }

            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()

            posts = response.json().get('data', [])
            logger.info(f"Encontrados {len(posts)} posts sem oportunidade")
            return posts

        except requests.RequestException as e:
            logger.error(f"Erro ao buscar posts: {e}")
            return []

    def attach_document(self, post_id: str, file_path: str, filename: str) -> bool:
        """Anexa documento ao post no Advbox"""
        try:
            url = f"{self.base_url}/posts/{post_id}/attachments"

            with open(file_path, 'rb') as f:
                files = {'file': (filename, f)}
                response = requests.post(
                    url,
                    headers={"Authorization": f"Bearer {self.api_token}"},
                    files=files,
                    timeout=60
                )

            response.raise_for_status()
            logger.info(f"Documento {filename} anexado ao post {post_id}")
            return True

        except Exception as e:
            logger.error(f"Erro ao anexar documento: {e}")
            return False

    def add_comment(self, post_id: str, comment: str) -> bool:
        """Adiciona comentário ao post"""
        try:
            url = f"{self.base_url}/posts/{post_id}/comments"
            data = {"content": comment}

            response = requests.post(
                url,
                headers=self.headers,
                json=data,
                timeout=30
            )

            response.raise_for_status()
            logger.info(f"Comentário adicionado ao post {post_id}")
            return True

        except Exception as e:
            logger.error(f"Erro ao adicionar comentário: {e}")
            return False

    def assign_to_commercial(self, post_id: str, assignee_id: str) -> bool:
        """Atribui post ao setor comercial"""
        try:
            url = f"{self.base_url}/posts/{post_id}"
            data = {"assigned_to": assignee_id}

            response = requests.patch(
                url,
                headers=self.headers,
                json=data,
                timeout=30
            )

            response.raise_for_status()
            logger.info(f"Post {post_id} atribuído ao comercial")
            return True

        except Exception as e:
            logger.error(f"Erro ao atribuir post: {e}")
            return False

    def close_post(self, post_id: str, status: str = "closed") -> bool:
        """Marca post como concluído"""
        try:
            url = f"{self.base_url}/posts/{post_id}"
            data = {"status": status}

            response = requests.patch(
                url,
                headers=self.headers,
                json=data,
                timeout=30
            )

            response.raise_for_status()
            logger.info(f"Post {post_id} marcado como {status}")
            return True

        except Exception as e:
            logger.error(f"Erro ao fechar post: {e}")
            return False


# ============================================================================
# CLASSE: GOOGLE DRIVE
# ============================================================================

class GoogleDriveAPI:
    def __init__(self, credentials_json: str):
        """
        credentials_json: string JSON com credenciais da service account
        """
        self.creds = Credentials.from_service_account_info(
            json.loads(credentials_json),
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        self.service = build('drive', 'v3', credentials=self.creds)

    def search_folder(self, client_name: str) -> Optional[str]:
        """Busca pasta do cliente no Google Drive"""
        logger.info(f"Buscando pasta do cliente: {client_name}")

        try:
            query = f"name contains '{client_name}' and mimeType='application/vnd.google-apps.folder'"
            results = self.service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name, parents)',
                pageSize=5
            ).execute()

            files = results.get('files', [])

            if not files:
                logger.warning(f"Pasta não encontrada para: {client_name}")
                return None

            # Retorna primeiro resultado (pode haver múltiplos)
            folder_id = files[0]['id']
            logger.info(f"Pasta encontrada: {files[0]['name']} (ID: {folder_id})")
            return folder_id

        except Exception as e:
            logger.error(f"Erro ao buscar pasta: {e}")
            return None

    def find_payroll_documents(self, folder_id: str) -> List[Dict[str, str]]:
        """
        Encontra contracheques e extratos bancários na pasta
        Retorna lista com id, name e mimeType
        """
        logger.info(f"Procurando contracheques/extratos na pasta {folder_id}")

        payroll_keywords = [
            'contracheque', 'holerite', 'folha', 'remuneração',
            'extrato', 'banco', 'conta'
        ]

        documents = []

        try:
            # Busca recursivamente na pasta
            for keyword in payroll_keywords:
                query = f"'{folder_id}' in parents and name contains '{keyword}'"

                results = self.service.files().list(
                    q=query,
                    spaces='drive',
                    fields='files(id, name, mimeType, createdTime)',
                    pageSize=50,
                    orderBy='createdTime desc'
                ).execute()

                documents.extend(results.get('files', []))

            # Remove duplicatas
            unique_docs = {doc['id']: doc for doc in documents}.values()
            logger.info(f"Encontrados {len(unique_docs)} documentos")

            return list(unique_docs)

        except Exception as e:
            logger.error(f"Erro ao buscar documentos: {e}")
            return []

    def download_file(self, file_id: str, file_name: str) -> Optional[str]:
        """
        Baixa arquivo do Google Drive
        Retorna caminho do arquivo salvo
        """
        try:
            request = self.service.files().get_media(fileId=file_id)

            # Cria diretório temporário se não existir
            os.makedirs('/tmp/drive_downloads', exist_ok=True)
            file_path = f"/tmp/drive_downloads/{file_name}"

            with open(file_path, 'wb') as f:
                f.write(request.execute())

            logger.info(f"Arquivo baixado: {file_path}")
            return file_path

        except Exception as e:
            logger.error(f"Erro ao baixar arquivo: {e}")
            return None


# ============================================================================
# CLASSE: SELLFLUX SAC
# ============================================================================

class SellfluxAPI:
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = SELLFLUX_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def get_customer_messages(self, lead_id: str, limit: int = 50, page: int = 0) -> List[Dict[str, Any]]:
        """
        Busca histórico de mensagens do cliente no SAC
        Retorna lista de mensagens com data, conteúdo, autor, etc.
        """
        logger.info(f"Buscando mensagens do cliente {lead_id} no SellFlux")

        try:
            url = f"{self.base_url}/chat/message"
            params = {
                "lead_id": lead_id,
                "limit": limit,
                "page": page
            }

            response = requests.get(
                url,
                headers=self.headers,
                params=params,
                timeout=30
            )

            response.raise_for_status()

            messages = response.json().get('data', [])
            logger.info(f"Encontradas {len(messages)} mensagens")

            return messages

        except requests.RequestException as e:
            logger.error(f"Erro ao buscar mensagens SellFlux: {e}")
            return []


# ============================================================================
# ANÁLISE DE DOCUMENTOS
# ============================================================================

def extract_text_from_pdf(file_path: str) -> str:
    """Extrai texto de arquivo PDF"""
    try:
        text = ""
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"

        return text.lower()

    except Exception as e:
        logger.error(f"Erro ao extrair texto do PDF: {e}")
        return ""


def find_loan_indicators(text: str) -> List[Dict[str, str]]:
    """
    Procura sinais de empréstimo/consignado no texto
    Retorna lista com padrão encontrado e contexto
    """
    indicators = []

    for pattern in LOAN_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)

        for match in matches:
            # Extrai contexto (50 caracteres antes e depois)
            start = max(0, match.start() - 50)
            end = min(len(text), match.end() + 50)
            context = text[start:end].replace('\n', ' ').strip()

            indicators.append({
                "pattern": pattern,
                "found": match.group(),
                "context": context
            })

    return indicators


def analyze_payroll_documents(drive_api: GoogleDriveAPI, documents: List[Dict]) -> Dict[str, Any]:
    """
    Analisa contracheques/extratos para encontrar demandas bancárias
    Retorna dict com resultado e evidências
    """
    result = {
        "has_opportunity": False,
        "indicators": [],
        "analyzed_docs": [],
        "summary": ""
    }

    for doc in documents:
        logger.info(f"Analisando documento: {doc['name']}")

        # Baixa documento
        file_path = drive_api.download_file(doc['id'], doc['name'])
        if not file_path:
            continue

        # Extrai texto (PDFs, ODS, etc.)
        text = extract_text_from_pdf(file_path)
        if not text:
            continue

        # Procura indicadores
        indicators = find_loan_indicators(text)

        if indicators:
            result["has_opportunity"] = True
            result["indicators"].extend([
                {
                    "document": doc['name'],
                    "indicator": ind['found'],
                    "context": ind['context']
                }
                for ind in indicators
            ])

        result["analyzed_docs"].append({
            "name": doc['name'],
            "found_indicators": len(indicators)
        })

    if result["has_opportunity"]:
        result["summary"] = f"Encontrados sinais de demanda bancária em {len(set(i['document'] for i in result['indicators']))} documento(s)"
    else:
        result["summary"] = "Nenhum sinal de demanda bancária encontrado nos documentos analisados"

    return result


def analyze_sac_messages(sellflux_api: SellfluxAPI, lead_id: str) -> Dict[str, Any]:
    """
    Analisa histórico de mensagens no SAC
    Retorna dict com resultado e demandas encontradas
    """
    result = {
        "has_untreated_demand": False,
        "demands": [],
        "total_messages": 0,
        "summary": ""
    }

    # Busca todas as páginas de mensagens
    all_messages = []
    page = 0

    while True:
        messages = sellflux_api.get_customer_messages(lead_id, limit=50, page=page)
        if not messages:
            break

        all_messages.extend(messages)
        page += 1

    result["total_messages"] = len(all_messages)

    # Procura por demandas não tratadas
    # Procura por: pedidos de contato, dúvidas, promessas de retorno sem resposta
    demand_keywords = [
        r"retorno",
        r"callback",
        r"p(?:u|ú)blico",
        r"d(?:ú|u)vida",
        r"empr[eé]stimo",
        r"consignado",
        r"revis[ãa]o",
        r"documento",
        r"pendente",
        r"aberto",
        r"n[ãa]o respondido"
    ]

    for msg in all_messages:
        content = msg.get('message_content', '').lower()

        # Verifica se há demanda
        for keyword in demand_keywords:
            if re.search(keyword, content, re.IGNORECASE):
                # Verifica se foi respondido (simplificado)
                # Em produção, usar cor da nota ou status
                if "respondido" not in content and "resolvido" not in content:
                    result["has_untreated_demand"] = True
                    result["demands"].append({
                        "date": msg.get('message_date'),
                        "author": msg.get('sender'),
                        "content": content[:200]  # Primeiros 200 chars
                    })
                break

    if result["has_untreated_demand"]:
        result["summary"] = f"Encontradas {len(result['demands'])} demanda(s) não tratada(s)"
    else:
        result["summary"] = "Sem demandas não tratadas identificadas"

    return result


# ============================================================================
# FLUXO PRINCIPAL
# ============================================================================

def process_post(advbox: AdvboxAPI, drive: GoogleDriveAPI, sellflux: SellfluxAPI, post: Dict[str, Any]) -> bool:
    """
    Processa um post classificado como 'sem oportunidade'
    Retorna True se processado com sucesso
    """
    post_id = post.get('id')
    client_name = post.get('client', {}).get('name', 'Desconhecido')
    client_phone = post.get('client', {}).get('phone')

    logger.info(f"Processando post {post_id}: {client_name}")

    # ========== ETAPA 1: Verificar Google Drive ==========
    folder_id = drive.search_folder(client_name)

    drive_result = {
        "has_opportunity": False,
        "indicators": [],
        "summary": "Pasta não encontrada"
    }

    if folder_id:
        documents = drive.find_payroll_documents(folder_id)
        if documents:
            drive_result = analyze_payroll_documents(drive, documents)
        else:
            drive_result["summary"] = "Nenhum contracheque/extrato encontrado"

    # ========== ETAPA 2: Verificar SellFlux SAC ==========
    sac_result = {
        "has_untreated_demand": False,
        "demands": [],
        "summary": "Não foi possível verificar"
    }

    if client_phone:
        sac_result = analyze_sac_messages(sellflux, client_phone)

    # ========== ETAPA 3: Decidir próxima ação ==========
    has_opportunity = drive_result.get("has_opportunity") or sac_result.get("has_untreated_demand")

    # Prepara comentário resumido
    comment_lines = [
        f"Revisão automática - {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        "",
        "📄 Google Drive:",
        drive_result["summary"],
    ]

    if drive_result.get("indicators"):
        comment_lines.append("Evidências encontradas:")
        for ind in drive_result["indicators"][:3]:  # Limita a 3 para não ficar muito grande
            comment_lines.append(f"  - {ind['indicator']} em {ind['document']}")

    comment_lines.extend([
        "",
        "💬 SellFlux SAC:",
        sac_result["summary"]
    ])

    if sac_result.get("demands"):
        comment_lines.append("Demandas identificadas:")
        for demand in sac_result["demands"][:2]:
            comment_lines.append(f"  - {demand.get('date')}: {demand.get('content')}")

    comment = "\n".join(comment_lines)

    # Adiciona comentário ao post
    advbox.add_comment(post_id, comment)

    # ========== ETAPA 4: Atualizar Advbox ==========
    if has_opportunity:
        logger.info(f"Oportunidade identificada para {client_name}")

        # TODO: Obter ID do responsável comercial da configuração
        commercial_id = os.getenv('ADVBOX_COMMERCIAL_ID', 'default')

        advbox.assign_to_commercial(post_id, commercial_id)
        # Não fecha o post - deixa para o comercial decidir

    else:
        logger.info(f"Sem oportunidade confirmada para {client_name}")
        advbox.close_post(post_id, status="closed")

    return True


def main():
    """Função principal - executa o fluxo"""
    logger.info("Iniciando revisão de casos 'sem oportunidade'")

    try:
        # Valida credenciais
        if not all([ADVBOX_API_TOKEN, SELLFLUX_API_TOKEN, GOOGLE_DRIVE_CREDENTIALS]):
            logger.error("Credenciais não configuradas corretamente")
            return False

        # Inicializa APIs
        advbox = AdvboxAPI(ADVBOX_API_TOKEN)
        drive = GoogleDriveAPI(GOOGLE_DRIVE_CREDENTIALS)
        sellflux = SellfluxAPI(SELLFLUX_API_TOKEN)

        # Busca posts
        posts = advbox.get_posts_sem_oportunidade(limit=10)

        if not posts:
            logger.info("Nenhum post para processar")
            return True

        # Processa cada post
        processed = 0
        for post in posts:
            try:
                if process_post(advbox, drive, sellflux, post):
                    processed += 1
            except Exception as e:
                logger.error(f"Erro ao processar post: {e}", exc_info=True)

        logger.info(f"Processamento concluído: {processed}/{len(posts)} posts")
        return True

    except Exception as e:
        logger.error(f"Erro fatal: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
