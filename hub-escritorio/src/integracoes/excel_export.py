"""Exporta dados do Advbox para Excel como intermediária para o web app."""

import os
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from .advbox_asaas import AdvboxClient, IntegrationError

# Carregar .env do projeto
_project_root = Path(__file__).resolve().parents[2]
load_dotenv(_project_root / ".env")


class ExcelExporter:
    """Exporta dados do Advbox para planilha Excel."""

    def __init__(self, spreadsheet_path: str | None = None) -> None:
        if spreadsheet_path is None:
            project_root = Path(__file__).resolve().parents[2]
            spreadsheet_path = str(project_root / "data" / "TICKET.xlsx")

        self.spreadsheet_path = Path(spreadsheet_path)
        self.spreadsheet_path.parent.mkdir(parents=True, exist_ok=True)

    def _criar_planilha_vazia(self) -> openpyxl.Workbook:
        """Cria uma nova planilha com estrutura inicial."""
        wb = openpyxl.Workbook()
        wb.remove(wb.active)

        # Aba de dados
        ws_dados = wb.create_sheet("Dados")
        ws_dados["A1"] = "Métrica"
        ws_dados["B1"] = "Valor"
        ws_dados["A1"].font = Font(bold=True, color="FFFFFF")
        ws_dados["B1"].font = Font(bold=True, color="FFFFFF")
        ws_dados["A1"].fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        ws_dados["B1"].fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")

        # Aba de controle
        ws_controle = wb.create_sheet("Controle")
        ws_controle["A1"] = "Campo"
        ws_controle["B1"] = "Valor"
        ws_controle["A1"].font = Font(bold=True, color="FFFFFF")
        ws_controle["B1"].font = Font(bold=True, color="FFFFFF")
        ws_controle["A1"].fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        ws_controle["B1"].fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")

        return wb

    def exportar_processos(self, api_key: str, base_url: str = "https://app.advbox.com.br/api/v1") -> dict[str, Any]:
        """Busca processos do Advbox e exporta para Excel."""
        import re

        try:
            client = AdvboxClient(api_key=api_key, base_url=base_url)
            processos = client.list_lawsuits()
        except IntegrationError as e:
            raise IntegrationError(f"Erro ao buscar processos: {e}") from e

        if not processos:
            raise IntegrationError("Nenhum processo foi retornado pelo Advbox.")

        # Padrão CNJ válido: 0000000-00.0000.0.00.0000
        cnj_pattern = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")

        # Separar processos por tipo
        processos_em_andamento = []
        processos_pendentes = []
        processos_arquivados = []

        for p in processos:
            if not isinstance(p, dict):
                continue

            process_number = str(p.get("process_number", "")).strip()
            stage = str(p.get("stage", "")).upper()

            # Se process_number é 'None' ou vazio = pendente (ação não ingressada)
            if process_number in ("None", "", "none"):
                processos_pendentes.append(p)
            # Se tem número CNJ válido
            elif cnj_pattern.search(process_number):
                # Verificar se está em fase de arquivamento
                if "ARQUIV" in stage:
                    processos_arquivados.append(p)
                else:
                    processos_em_andamento.append(p)

        em_andamento = len(processos_em_andamento)
        pendentes = len(processos_pendentes)
        arquivados = len(processos_arquivados)
        processos_validos = processos_em_andamento + processos_arquivados + processos_pendentes

        # Carregar ou criar planilha
        if self.spreadsheet_path.exists():
            wb = openpyxl.load_workbook(self.spreadsheet_path)
        else:
            wb = self._criar_planilha_vazia()

        ws_dados = wb["Dados"]
        ws_controle = wb["Controle"]

        # Limpar dados anteriores
        for row in ws_dados.iter_rows(min_row=2):
            for cell in row:
                cell.value = None

        # Escrever novos dados em ordem de prioridade
        ws_dados["A2"] = "Processos em Andamento"
        ws_dados["B2"] = em_andamento
        ws_dados["A2"].alignment = Alignment(horizontal="left")
        ws_dados["B2"].alignment = Alignment(horizontal="center")

        ws_dados["A3"] = "Processos Pendentes"
        ws_dados["B3"] = pendentes
        ws_dados["A3"].alignment = Alignment(horizontal="left")
        ws_dados["B3"].alignment = Alignment(horizontal="center")

        ws_dados["A4"] = "Processos Arquivados"
        ws_dados["B4"] = arquivados
        ws_dados["A4"].alignment = Alignment(horizontal="left")
        ws_dados["B4"].alignment = Alignment(horizontal="center")

        ws_dados["A5"] = "Total de Processos"
        ws_dados["B5"] = len(processos)
        ws_dados["A5"].alignment = Alignment(horizontal="left")
        ws_dados["B5"].alignment = Alignment(horizontal="center")

        # Registrar última atualização
        for row in ws_controle.iter_rows(min_row=2):
            for cell in row:
                cell.value = None

        ws_controle["A2"] = "Última Atualização"
        ws_controle["B2"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ws_controle["A2"].alignment = Alignment(horizontal="left")
        ws_controle["B2"].alignment = Alignment(horizontal="left")

        ws_controle["A3"] = "Total de Processos (com CNJ válido)"
        ws_controle["B3"] = len(processos_validos)

        ws_controle["A4"] = "Total de Processos (API)"
        ws_controle["B4"] = len(processos)

        # Salvar
        wb.save(self.spreadsheet_path)

        return {
            "sucesso": True,
            "arquivo": str(self.spreadsheet_path),
            "processos_em_andamento": em_andamento,
            "processos_arquivados": arquivados,
            "processos_pendentes": pendentes,
            "total_com_cnj_valido": len(processos_validos),
            "total_api": len(processos),
            "atualizado_em": ws_controle["B2"].value,
        }


def exportar_agora(api_key: str | None = None, base_url: str | None = None) -> dict[str, Any]:
    """Função auxiliar para exportar dados do Advbox para Excel."""
    api_key = api_key or os.getenv("ADVBOX_API_KEY") or os.getenv("ADVBOX_TOKEN")
    base_url = base_url or os.getenv("ADVBOX_API_URL", "https://app.advbox.com.br/api/v1")

    if not api_key:
        raise IntegrationError("ADVBOX_API_KEY não configurada.")

    exporter = ExcelExporter()
    return exporter.exportar_processos(api_key, base_url)


if __name__ == "__main__":
    try:
        resultado = exportar_agora()
        print(f"✅ Exportação bem-sucedida!")
        print(f"   Arquivo: {resultado['arquivo']}")
        print(f"   Processos em Andamento: {resultado['processos_em_andamento']}")
        print(f"   Processos Arquivados: {resultado['processos_arquivados']}")
        print(f"   Processos Pendentes: {resultado['processos_pendentes']}")
        print(f"   Total com CNJ válido: {resultado['total_com_cnj_valido']}")
        print(f"   Total da API: {resultado['total_api']}")
        print(f"   Atualizado em: {resultado['atualizado_em']}")
    except IntegrationError as e:
        print(f"❌ Erro: {e}")
