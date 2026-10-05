import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

import pandas as pd
import openpyxl
import requests

from src.integracoes.advbox_asaas import AdvboxClient, IntegrationError
from src.integracoes.excel_export import ExcelExporter
from src.integracoes.base_comercial import (
    calcular_expectativa_receita,
    calcular_prejuizo_potencial,
    calcular_ticket_ajustado_geral,
    calcular_ticket_ajustado_por_etapa,
    calcular_ticket_medio_por_etapa,
    filtrar_processos_por_etapa,
)
from src.ticket_medio import (
    calcular_kpis,
    contar_processos_em_andamento,
    contar_processos_pendentes,
    distribuicao_por_campo,
    distribuicao_resultado,
    processos_por_fase,
    tabela_por_tese,
    valores_por_fase,
)


class TicketMedioTests(unittest.TestCase):
    def setUp(self):
        self.processos = pd.DataFrame(
            [
                {
                    "process_number": "0001234-56.2026.8.26.0100",
                    "protocol_number": None,
                    "fees_money": 1000,
                    "contingency": 300,
                    "type": "TESE A",
                    "status_closure": "GANHO",
                    "step": "JUDICIAL",
                },
                {
                    "process_number": "0001235-56.2026.8.26.0100",
                    "protocol_number": None,
                    "fees_money": 3000,
                    "contingency": 500,
                    "type": "TESE A",
                    "status_closure": "PERDIDO",
                    "step": "JUDICIAL",
                },
                {
                    "process_number": "0001236-56.2026.8.26.0100",
                    "protocol_number": None,
                    "fees_money": 0,
                    "contingency": 0,
                    "type": "TESE B",
                    "status_closure": None,
                    "step": "RECURSAL",
                },
                {
                    "process_number": None,
                    "protocol_number": "X_12345678",
                    "fees_money": 400,
                    "contingency": 100,
                    "type": "TESE B",
                    "status_closure": None,
                    "step": "NEGOCIACAO",
                },
            ]
        )

    def test_kpis_filter_process_and_protocol_number_patterns(self):
        kpis = calcular_kpis(self.processos)
        self.assertEqual(kpis["processos"], 3)
        self.assertEqual(kpis["pendentes"], 1)
        self.assertAlmostEqual(kpis["ticket_medio"], 1466.6666667)
        self.assertEqual(kpis["ticket_base"], 300)
        self.assertEqual(kpis["expectativa"], 4400)
        self.assertEqual(kpis["prejuizo"], 3000)
        self.assertEqual(kpis["eficiencia"], 0.5)

    def test_missing_numeric_contingency_is_not_reported_as_zero(self):
        frame = self.processos.copy()
        frame["contingency"] = "informacao nao numerica"

        kpis = calcular_kpis(frame)

        self.assertIsNone(kpis["ticket_base"])
        self.assertEqual(kpis["pendentes"], 1)

    def test_adjusted_ticket_uses_efficiency_and_deduplicates_processes_by_stage(self):
        processos = [
            {"type": "AGRAVO INTERNO - 2 GRAU", "stage": "PROCESSO GANHO", "step": "ARQUIVAMENTO", "process_number": "p1", "fees_money": 1000},
            {"type": "AGRAVO INTERNO - 2 GRAU", "stage": "PROCESSO GANHO", "step": "ARQUIVAMENTO", "process_number": "p1", "fees_money": 1200},
            {"type": "AGRAVO INTERNO - 2 GRAU", "stage": "PROCESSO PERDIDO", "step": "ARQUIVAMENTO", "process_number": "p2", "fees_money": 600},
            {"type": "RECURSO ESPECIAL", "stage": "PROCESSO PERDIDO", "step": "ARQUIVAMENTO", "process_number": "p3", "fees_money": 0},
        ]

        resultado = calcular_ticket_ajustado_por_etapa(processos)

        self.assertEqual(resultado["AGRAVO INTERNO - 2 GRAU"]["ganhos"], 2)
        self.assertEqual(resultado["AGRAVO INTERNO - 2 GRAU"]["perdidos"], 1)
        self.assertAlmostEqual(resultado["AGRAVO INTERNO - 2 GRAU"]["eficiencia"], 2 / 3)
        self.assertEqual(resultado["AGRAVO INTERNO - 2 GRAU"]["ticket_medio"], 900)
        self.assertEqual(resultado["AGRAVO INTERNO - 2 GRAU"]["ticket_ajustado"], 600)
        self.assertEqual(calcular_ticket_medio_por_etapa(processos), {"AGRAVO INTERNO - 2 GRAU": 900})
        self.assertEqual(resultado["RECURSO ESPECIAL"]["eficiencia"], 0)
        self.assertIsNone(resultado["RECURSO ESPECIAL"]["ticket_ajustado"])

    def test_base_comercial_is_average_ticket_times_overall_efficiency(self):
        processos = [
            {"type": "AGRAVO", "stage": "PROCESSO GANHO", "step": "ARQUIVAMENTO", "process_number": "p1", "fees_money": 1000},
            {"type": "AGRAVO", "stage": "PROCESSO PERDIDO", "step": "ARQUIVAMENTO", "process_number": "p2", "fees_money": 600},
            {"type": "AGRAVO", "stage": "PROCESSO PERDIDO", "step": "ARQUIVAMENTO", "process_number": "p3", "fees_money": 0},
        ]

        self.assertEqual(calcular_ticket_ajustado_geral(processos), 266.67)
        self.assertIsNone(calcular_ticket_ajustado_geral([]))

    def test_expected_revenue_sums_adjusted_ticket_for_open_nonarchived_cases(self):
        processos = [
            {"type": "AGRAVO", "stage": "PROCESSO GANHO", "step": "ARQUIVAMENTO", "process_number": "0000001-01.2024.8.26.0001", "fees_money": 6000},
            {"type": "AGRAVO", "stage": "PROCESSO PERDIDO", "step": "ARQUIVAMENTO", "process_number": "0000002-01.2024.8.26.0001", "fees_money": 6000},
            *[
                {"type": "AGRAVO", "stage": "FASE INSTRUTORIA", "step": "JUDICIAL", "process_number": f"{index:07d}-01.2024.8.26.0001", "fees_money": 0}
                for index in range(3, 13)
            ],
            {"type": "SEM HISTORICO", "stage": "FASE INSTRUTORIA", "step": "JUDICIAL", "process_number": "0000013-01.2024.8.26.0001", "fees_money": 0},
            {"type": "AGRAVO", "stage": "FASE INSTRUTORIA", "step": "ARQUIVAMENTO", "process_number": "0000014-01.2024.8.26.0001", "fees_money": 0},
            {"type": "AGRAVO", "stage": "FASE INSTRUTORIA", "step": "JUDICIAL", "process_number": "0000015", "fees_money": 0},
        ]

        expectativa = calcular_expectativa_receita(processos)

        self.assertEqual(expectativa, {"valor": 60000, "processos_incluidos": 10, "sem_historico": 1})

    def test_prejuizo_potencial_sums_historical_ticket_for_unique_pending_protocols(self):
        processos = [
            {"type": "AGRAVO", "stage": "PROCESSO GANHO", "step": "ARQUIVAMENTO", "process_number": "0000001-01.2024.8.26.0001", "fees_money": 1000},
            {"type": "AGRAVO", "stage": "PROCESSO PERDIDO", "step": "ARQUIVAMENTO", "process_number": "0000002-01.2024.8.26.0001", "fees_money": 600},
            {"type": "AGRAVO", "protocol_number": "12_12345678", "process_number": None},
            {"type": "AGRAVO", "protocol_number": "12_12345678", "process_number": None},
            {"type": "AGRAVO", "protocol_number": "12_12345679", "process_number": None},
            {"type": "SEM HISTORICO", "protocol_number": "12_12345680", "process_number": None},
            {"type": "AGRAVO", "protocol_number": "PROTOCOLO-12345678", "process_number": None},
            {"type": "AGRAVO", "protocol_number": "12_12345681", "process_number": "0000003-01.2024.8.26.0001"},
        ]

        prejuizo = calcular_prejuizo_potencial(processos)

        self.assertEqual(prejuizo, {"valor": 1600, "casos_encontrados": 3, "casos_incluidos": 2, "sem_historico": 1})

    def test_charts_use_only_cnj_processes_and_group_by_phase(self):
        fases = processos_por_fase(self.processos).set_index("Fase")["Quantidade"]
        valores = valores_por_fase(self.processos, 1000).set_index("Fase")["Expectativa (R$)"]
        self.assertEqual(fases.to_dict(), {"JUDICIAL": 2, "RECURSAL": 1})
        self.assertEqual(valores.to_dict(), {"JUDICIAL": 2000, "RECURSAL": 1000})

    def test_distribuicao_por_campo_counts_each_phase_and_step(self):
        frame = pd.DataFrame(
            [
                {"stage": "FASE A", "step": "JUDICIAL"},
                {"stage": "FASE A", "step": "JUDICIAL"},
                {"stage": "FASE B", "step": "RECURSAL"},
                {"stage": None, "step": ""},
            ]
        )

        fases = distribuicao_por_campo(frame, "stage", "Fase").set_index("Fase")["Quantidade"]
        etapas = distribuicao_por_campo(frame, "step", "Etapa").set_index("Etapa")["Quantidade"]

        self.assertEqual(fases.to_dict(), {"FASE A": 2, "FASE B": 1, "Sem informação": 1})
        self.assertEqual(etapas.to_dict(), {"JUDICIAL": 2, "RECURSAL": 1, "Sem informação": 1})

    def test_stage_selection_filters_processes_and_recalculates_process_cards(self):
        processos = [
            {"type": "ETAPA A", "process_number": "0000001-01.2024.8.26.0001", "stage": "FASE ATIVA"},
            {"type": "ETAPA A", "process_number": None, "protocol_number": "12_12345678"},
            {"type": "ETAPA B", "process_number": "0000002-01.2024.8.26.0001", "stage": "FASE ATIVA"},
            {"type": "ETAPA A", "process_number": "0000003-01.2024.8.26.0001", "stage": "ARQUIVADO"},
        ]

        selecionados = filtrar_processos_por_etapa(processos, "ETAPA A")
        frame = pd.DataFrame(selecionados)

        self.assertEqual(len(selecionados), 3)
        self.assertEqual(contar_processos_em_andamento(frame), 1)
        self.assertEqual(contar_processos_pendentes(frame), 1)

    def test_stage_selection_filters_processes_and_recalculates_card_counts(self):
        processos = [
            {"type": "ETAPA A", "process_number": "0000001-01.2024.8.26.0001", "stage": "FASE ATIVA"},
            {"type": "ETAPA A", "process_number": None, "protocol_number": "12_12345678"},
            {"type": "ETAPA B", "process_number": "0000002-01.2024.8.26.0001", "stage": "FASE ATIVA"},
            {"type": "ETAPA A", "process_number": "0000003-01.2024.8.26.0001", "stage": "ARQUIVADO"},
        ]

        selecionados = filtrar_processos_por_etapa(processos, "ETAPA A")
        frame = pd.DataFrame(selecionados)

        self.assertEqual(len(selecionados), 3)
        self.assertEqual(contar_processos_em_andamento(frame), 1)
        self.assertEqual(contar_processos_pendentes(frame), 1)

    def test_result_distribution_uses_advbox_stage_and_sheet_in_progress_count(self):
        frame = pd.DataFrame(
            [
                {"stage": "PROCESSO GANHO"},
                {"stage": "PROCESSO PERDIDO"},
                {"stage": "FASE INSTRUTORIA"},
            ]
        )

        resultado = distribuicao_resultado(frame, processos_em_andamento=5533)

        self.assertEqual(
            resultado.set_index("Status")["Quantidade"].to_dict(),
            {"GANHO": 1, "PERDIDO": 1, "EM ANDAMENTO": 5533},
        )

    def test_thesis_success_rate_uses_won_over_concluded(self):
        table = tabela_por_tese(self.processos).set_index("Tese")
        self.assertEqual(table.loc["TESE A", "Taxa de Êxito"], 0.5)
        self.assertIsNone(table.loc["TESE B", "Taxa de Êxito"])

    @patch("src.integracoes.advbox_asaas.requests.get")
    def test_advbox_client_uses_bearer_auth_and_paginates(self, get):
        first = Mock()
        first.json.return_value = {"totalCount": 2, "data": [{"id": 1}]}
        second = Mock()
        second.json.return_value = {"totalCount": 2, "data": [{"id": 2}]}
        get.side_effect = [first, second]

        records = AdvboxClient(api_key="token", base_url="https://example.test/api/v1").list_lawsuits(limit=1)

        self.assertEqual(records, [{"id": 1}, {"id": 2}])
        self.assertEqual(get.call_args_list[0].kwargs["headers"]["Authorization"], "Bearer token")
        self.assertEqual(get.call_args_list[0].kwargs["headers"]["User-Agent"], "HubFinanceiro/1.0")
        self.assertEqual(get.call_args_list[1].kwargs["params"]["offset"], 1)

    @patch("src.integracoes.advbox_asaas.requests.get")
    def test_advbox_client_reports_forbidden_without_exposing_response_or_token(self, get):
        response = Mock()
        http_error = requests.HTTPError("sensitive response body")
        http_error.response = Mock(status_code=403)
        response.raise_for_status.side_effect = http_error
        get.return_value = response

        with self.assertRaisesRegex(IntegrationError, "HTTP 403") as raised:
            AdvboxClient(api_key="sensitive-token", base_url="https://example.test/api/v1").list_lawsuits()

        self.assertNotIn("sensitive-token", str(raised.exception))
        self.assertNotIn("sensitive response body", str(raised.exception))

    @patch("src.integracoes.excel_export.AdvboxClient.list_lawsuits")
    def test_excel_exporter_saves_the_fresh_snapshot_without_second_api_call(self, list_lawsuits):
        processos = [
            {
                "process_number": "0000001-01.2024.8.26.0001",
                "protocol_number": None,
                "stage": "FASE INSTRUTORIA",
                "fees_money": 0,
            },
            {
                "process_number": None,
                "protocol_number": "12_12345678",
                "stage": "PENDENTE",
                "fees_money": 0,
            },
        ]

        with TemporaryDirectory() as temporary_directory:
            path = Path(temporary_directory) / "TICKET.xlsx"
            result = ExcelExporter(str(path)).exportar_processos(
                "test-token",
                processos=processos,
            )

            workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
            try:
                self.assertEqual(result["total_api"], 2)
                self.assertEqual(workbook["Dados"]["B2"].value, 1)
                self.assertEqual(workbook["Dados"]["B3"].value, 1)
            finally:
                workbook.close()
            self.assertFalse(list_lawsuits.called)


if __name__ == "__main__":
    unittest.main()