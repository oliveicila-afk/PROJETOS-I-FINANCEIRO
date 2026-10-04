import unittest
from unittest.mock import Mock, patch

import pandas as pd
import requests

from src.integracoes.advbox_asaas import AdvboxClient, IntegrationError
from src.ticket_medio import (
    calcular_kpis,
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

    def test_charts_use_only_cnj_processes_and_group_by_phase(self):
        fases = processos_por_fase(self.processos).set_index("Fase")["Quantidade"]
        valores = valores_por_fase(self.processos, 1000).set_index("Fase")["Expectativa (R$)"]
        self.assertEqual(fases.to_dict(), {"JUDICIAL": 2, "RECURSAL": 1})
        self.assertEqual(valores.to_dict(), {"JUDICIAL": 2000, "RECURSAL": 1000})

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


if __name__ == "__main__":
    unittest.main()