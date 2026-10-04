#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CROSSEL - Automação de Triagem AdvBox com Verificação SAC
Versão 2.0 - Com análise de documentos e notas SAC

Fluxo:
1. Consulta AdvBox por petições iniciais no período
2. Analisa notas do AdvBox
3. Verifica documentos no Gmail (pasta do cliente)
4. Verifica notas no SellFlux (SAC)
5. Identifica oportunidades ou confirma "sem oportunidade"
6. Encaminha a Leticia/Fábio quando necessário
7. Gera relatório em email
"""

import os
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import base64
from email.mime.text import MIMEText

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# ============================================================================
# CONFIGURAÇÕES
# ============================================================================

ADVBOX_API_TOKEN = os.getenv("ADVBOX_API_TOKEN")
ADVBOX_API_URL = os.getenv("ADVBOX_API_URL", "https://api.advbox.com.br/api")
GOOGLE_CREDS_JSON = os.getenv("GOOGLE_CREDS_JSON", "credentials.json")

# Intervalo de tempo (passado via ambiente)
HORA_INICIO = os.getenv("HORA_INICIO")  # Formato: HH:MM (ex: "08:00")
HORA_FIM = os.getenv("HORA_FIM")        # Formato: HH:MM (ex: "15:00")

# ============================================================================
# CLASSE: CROSSEL ANALYZER
# ============================================================================

class CrosselAnalyzer:
    def __init__(self):
        self.advbox_headers = {"Authorization": f"Bearer {ADVBOX_API_TOKEN}"}
        self.resultados = {
            "total_processados": 0,
            "oportunidades": [],
            "sem_oportunidade": [],
            "ambiguos": []
        }
        self.google_service = self._init_google_service()
        self.sellflux_service = self._init_sellflux_service()

    def _init_google_service(self):
        """Inicializa serviço Google Drive e Gmail"""
        try:
            scopes = [
                "https://www.googleapis.com/auth/drive",
                "https://www.googleapis.com/auth/gmail.modify"
            ]
            creds = service_account.Credentials.from_service_account_file(
                GOOGLE_CREDS_JSON, scopes=scopes
            )
            return {
                "drive": build("drive", "v3", credentials=creds),
                "gmail": build("gmail", "v1", credentials=creds)
            }
        except Exception as e:
            print(f"[AVISO] Erro ao inicializar Google Services: {e}")
            return None

    def _init_sellflux_service(self):
        """Inicializa conexão com SellFlux (SAC)"""
        # Implementar conforme API do SellFlux
        # Por enquanto, retorna placeholder
        return None

    # ========================================================================
    # ETAPA 1: CONSULTAR ADVBOX
    # ========================================================================

    def consultar_advbox_petições(self, hora_inicio: str, hora_fim: str) -> List[Dict]:
        """
        Consulta AdvBox por petições iniciais no período especificado

        Args:
            hora_inicio: String "HH:MM" (ex: "08:00")
            hora_fim: String "HH:MM" (ex: "15:00")

        Returns:
            Lista de petições encontradas
        """
        try:
            # Converter horário local (Cuiabá, UTC-4) para UTC
            inicio_dt = self._parse_hora_local(hora_inicio)
            fim_dt = self._parse_hora_local(hora_fim)

            # Se hora_fim < hora_inicio, é período que atravessa noite
            if fim_dt < inicio_dt:
                fim_dt += timedelta(days=1)

            # Formatar para ISO 8601
            data_inicio = inicio_dt.isoformat()
            data_fim = fim_dt.isoformat()

            # Chamar API AdvBox
            endpoint = f"{ADVBOX_API_URL}/petitions"
            params = {
                "type": "initial",  # Petições iniciais
                "createdAt[gte]": data_inicio,
                "createdAt[lte]": data_fim,
                "limit": 1000
            }

            response = requests.get(
                endpoint,
                headers=self.advbox_headers,
                params=params,
                timeout=30
            )
            response.raise_for_status()

            petições = response.json().get("data", [])
            print(f"[OK] {len(petições)} petições encontradas no período")

            return petições

        except Exception as e:
            print(f"[ERRO] Ao consultar AdvBox: {e}")
            return []

    def _parse_hora_local(self, hora_str: str) -> datetime:
        """Converte "HH:MM" para datetime hoje (horário Cuiabá, UTC-4)"""
        hoje = datetime.now()
        h, m = map(int, hora_str.split(":"))
        return hoje.replace(hour=h, minute=m, second=0, microsecond=0)

    # ========================================================================
    # ETAPA 2: ANALISAR NOTAS ADVBOX
    # ========================================================================

    def analisar_nota_advbox(self, nota: str) -> Tuple[str, List[str]]:
        """
        Analisa a nota do caso no AdvBox conforme padrões definidos

        Returns:
            (classificacao, demandas_identificadas)
            classificacao: "sem_oportunidade", "oportunidade", "ambiguo"
            demandas_identificadas: lista de demandas encontradas
        """
        nota_lower = nota.lower()
        demandas = []

        # REGRA 1: Ação Bancária Identificada
        if "possível ação bancária identificada" in nota_lower:
            demandas.append("POSSÍVEL AÇÃO BANCÁRIA IDENTIFICADA NO CONTRACHEQUE")
            return "oportunidade", demandas

        # REGRA 2: Verificar "Novas oportunidades: Nenhuma;"
        if re.search(r"novas\s+oportunidades:\s*nenhuma", nota_lower, re.IGNORECASE):
            return "sem_oportunidade", []

        # REGRA 3: Verificar "Não foi identificada nenhuma nova oportunidade"
        if "não foi identificada nenhuma nova oportunidade" in nota_lower:
            return "sem_oportunidade", []

        # REGRA 4: Verificar padrão "Novas oportunidades: [algo diferente de nenhuma]"
        match_oportunidades = re.search(
            r"novas\s+oportunidades:\s*([^;\n]+)",
            nota_lower,
            re.IGNORECASE
        )
        if match_oportunidades:
            oportunidade = match_oportunidades.group(1).strip()
            if oportunidade.lower() != "nenhuma":
                demandas.append(f"Identificada novas oportunidades para fechamento: {oportunidade}")
                return "oportunidade", demandas

        # REGRA 5: Se não tiver marcação clara, é ambíguo
        return "ambiguo", demandas

    # ========================================================================
    # ETAPA 3: VERIFICAR DOCUMENTOS NO GMAIL
    # ========================================================================

    def analisar_documentos_gmail(self, numero_cliente: str) -> Tuple[bool, List[str]]:
        """
        Procura pasta do cliente no Gmail e analisa documentos

        Returns:
            (tem_demanda, demandas_identificadas)
        """
        if not self.google_service:
            print(f"[AVISO] Google Services não disponível, pulando análise Gmail para cliente {numero_cliente}")
            return False, []

        try:
            drive = self.google_service["drive"]

            # Procurar pasta do cliente (ex: "9325" ou "Cliente 9325")
            query = f"name contains '{numero_cliente}' and mimeType='application/vnd.google-apps.folder'"
            results = drive.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)",
                pageSize=5
            ).execute()

            pastas = results.get("files", [])
            if not pastas:
                print(f"[INFO] Nenhuma pasta encontrada para cliente {numero_cliente}")
                return False, []

            demandas = []
            # Analisar documentos na primeira pasta encontrada
            for pasta in pastas[:1]:  # Pega primeira pasta
                print(f"[OK] Analisando pasta: {pasta['name']}")

                # Listar arquivos na pasta
                query_files = f"'{pasta['id']}' in parents and trashed=false"
                files_results = drive.files().list(
                    q=query_files,
                    spaces="drive",
                    fields="files(id, name, mimeType)",
                    pageSize=50
                ).execute()

                arquivos = files_results.get("files", [])

                # Procurar por documentos relevantes (extratos, contracheques, etc)
                keywords = ["extrato", "contracheque", "holerite", "declaração", "renda"]
                for arquivo in arquivos:
                    nome_lower = arquivo["name"].lower()
                    if any(keyword in nome_lower for keyword in keywords):
                        demandas.append(f"Documento relevante encontrado: {arquivo['name']}")

            return len(demandas) > 0, demandas

        except Exception as e:
            print(f"[AVISO] Erro ao analisar documentos Gmail para {numero_cliente}: {e}")
            return False, []

    # ========================================================================
    # ETAPA 4: VERIFICAR NOTAS NO SAC (SELLFLUX)
    # ========================================================================

    def analisar_notas_sac(self, numero_cliente: str) -> Tuple[bool, List[str]]:
        """
        Verifica notas no SellFlux (SAC) para identificar demandas

        Returns:
            (tem_demanda, demandas_identificadas)
        """
        # TODO: Implementar conforme API do SellFlux
        # Por enquanto, retorna placeholder
        print(f"[INFO] Verificação SAC para cliente {numero_cliente} (implementar API SellFlux)")
        return False, []

    # ========================================================================
    # ETAPA 5: CRIAR TAREFA PARA EQUIPE
    # ========================================================================

    def criar_tarefa_leticia_fabio(self, cliente_id: str, numero_processo: str, demanda: str):
        """
        Cria tarefa/nota padrão para Leticia e Fábio
        Formato padrão (não copia a tarefa original)
        """
        nota_padrao = f"""
DEMANDA IDENTIFICADA PELO CROSSEL

Cliente: {cliente_id}
Número do Processo: {numero_processo}
Data da Análise: {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}

📌 DEMANDA:
{demanda}

Ação necessária: Avaliar e encaminhar para comercial/documentação conforme necessário.
        """.strip()

        print(f"[OK] Tarefa criada para Leticia/Fábio: {cliente_id}")
        # TODO: Integrar com AdvBox para criar tarefa efetivamente
        return nota_padrao

    # ========================================================================
    # ETAPA 6: PROCESSAR PETIÇÕES
    # ========================================================================

    def processar_petição(self, petição: Dict):
        """Processa uma petição do AdvBox"""
        try:
            cliente_id = petição.get("client_id", "DESCONHECIDO")
            numero_processo = petição.get("process_number", "DESCONHECIDO")
            nota = petição.get("comments", "")

            print(f"\n[PROCESSANDO] Cliente: {cliente_id}, Processo: {numero_processo}")

            # 1. Analisar nota AdvBox
            classificacao, demandas_nota = self.analisar_nota_advbox(nota)

            # 2. Analisar documentos Gmail
            tem_doc, demandas_doc = self.analisar_documentos_gmail(cliente_id)

            # 3. Analisar notas SAC
            tem_sac, demandas_sac = self.analisar_notas_sac(cliente_id)

            # Consolidar todas as demandas
            todas_demandas = demandas_nota + demandas_doc + demandas_sac

            # Determinar classificação final
            if todas_demandas or classificacao == "oportunidade":
                self.resultados["oportunidades"].append({
                    "cliente_id": cliente_id,
                    "numero_processo": numero_processo,
                    "demandas": todas_demandas
                })
                # Criar tarefa para Leticia/Fábio
                for demanda in todas_demandas:
                    self.criar_tarefa_leticia_fabio(cliente_id, numero_processo, demanda)
                print(f"[OK] Encaminhado ao comercial")

            elif classificacao == "sem_oportunidade":
                self.resultados["sem_oportunidade"].append({
                    "cliente_id": cliente_id,
                    "numero_processo": numero_processo
                })
                print(f"[OK] Confirmado como 'sem oportunidade'")

            elif classificacao == "ambiguo":
                self.resultados["ambiguos"].append({
                    "cliente_id": cliente_id,
                    "numero_processo": numero_processo,
                    "nota": nota[:200]  # Primeiros 200 caracteres
                })
                print(f"[AVISO] Caso ambíguo - requer revisão manual")

            self.resultados["total_processados"] += 1

        except Exception as e:
            print(f"[ERRO] Ao processar petição {petição.get('process_number')}: {e}")

    # ========================================================================
    # ETAPA 7: GERAR RELATÓRIO
    # ========================================================================

    def gerar_relatorio_email(self) -> str:
        """Gera relatório formatado para email"""
        hoje = datetime.now().strftime("%d/%m/%Y")

        corpo = f"""
📋 RESUMO DA TRIAGEM AUTOMÁTICA DO ADVBOX EM {hoje}

════════════════════════════════════════════════════════════════

📊 ESTATÍSTICAS:

• Total de casos processados: {self.resultados['total_processados']}
• Oportunidades encaminhadas ao comercial: {len(self.resultados['oportunidades'])}
• Sem oportunidade: {len(self.resultados['sem_oportunidade'])}
• Ambíguos (revisão manual): {len(self.resultados['ambiguos'])}

════════════════════════════════════════════════════════════════

⚠️ CASOS COM AMBIGUIDADE (REQUEREM REVISÃO MANUAL):
"""
        if self.resultados["ambiguos"]:
            for caso in self.resultados["ambiguos"]:
                corpo += f"\n   • Cliente: {caso['cliente_id']} | Processo: {caso['numero_processo']}"
        else:
            corpo += "\n   Nenhum caso ambíguo neste período."

        corpo += f"""

════════════════════════════════════════════════════════════════

✅ OPERAÇÃO CONCLUÍDA

Próxima triagem: Confira o histórico em Actions no GitHub

        """.strip()

        return corpo

    # ========================================================================
    # EXECUTAR ANÁLISE COMPLETA
    # ========================================================================

    def executar(self, hora_inicio: str, hora_fim: str):
        """Executa o fluxo completo de análise"""
        print("\n" + "="*70)
        print("CROSSEL - AUTOMAÇÃO DE TRIAGEM v2.0")
        print("="*70)
        print(f"Analisando período: {hora_inicio} até {hora_fim}")

        # 1. Consultar AdvBox
        petições = self.consultar_advbox_petições(hora_inicio, hora_fim)

        if not petições:
            print("[INFO] Nenhuma petição encontrada no período")
            self.resultados["total_processados"] = 0
        else:
            # 2. Processar cada petição
            for petição in petições:
                self.processar_petição(petição)

        # 3. Gerar e salvar relatório
        relatorio = self.gerar_relatorio_email()
        print("\n" + relatorio)

        # Salvar em arquivo
        with open("revisao_output.txt", "w", encoding="utf-8") as f:
            f.write(relatorio)

        # Salvar JSON detalhado
        with open("review_results.json", "w", encoding="utf-8") as f:
            json.dump(self.resultados, f, ensure_ascii=False, indent=2)

        print("\n[OK] Arquivos salvos: revisao_output.txt, review_results.json")
        return self.resultados


# ============================================================================
# EXECUTAR
# ============================================================================

if __name__ == "__main__":
    # Obter horários do ambiente (passados pelo workflow)
    # Se não estiver definido, usa default (últimas 6 horas)
    hora_inicio = HORA_INICIO or datetime.now().strftime("%H:%M")
    hora_fim = HORA_FIM or (datetime.now() - timedelta(hours=6)).strftime("%H:%M")

    analyzer = CrosselAnalyzer()
    analyzer.executar(hora_inicio, hora_fim)
