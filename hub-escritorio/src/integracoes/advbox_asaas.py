"""Fronteira isolada para as APIs ADVBOX e Asaas."""

import os
from typing import Any

import requests


class IntegrationError(RuntimeError):
    """Erro seguro para exibir na interface sem vazar credenciais."""


class AsaasClient:
    def __init__(self, api_key: str | None = None, base_url: str | None = None) -> None:
        self.api_key = api_key or os.getenv("ASAAS_API_KEY", "")
        self.base_url = (base_url or os.getenv("ASAAS_API_URL", "https://api.asaas.com/v3")).rstrip("/")

    def list_payments(self, *, limit: int = 20, status: str | None = None) -> list[dict[str, Any]]:
        if not self.api_key:
            raise IntegrationError("ASAAS_API_KEY nao configurada.")

        parameters: dict[str, str | int] = {"limit": limit}
        if status:
            parameters["status"] = status

        try:
            response = requests.get(
                f"{self.base_url}/payments",
                headers={"access_token": self.api_key, "Accept": "application/json"},
                params=parameters,
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as error:
            raise IntegrationError("Nao foi possivel consultar pagamentos no Asaas.") from error

        payload = response.json()
        payments = payload.get("data", [])
        if not isinstance(payments, list):
            raise IntegrationError("Resposta invalida recebida do Asaas.")
        return payments


class AdvboxClient:
    """Cliente de leitura da API oficial do ADVBOX."""

    def __init__(self, api_key: str | None = None, base_url: str | None = None) -> None:
        self.api_key = api_key or os.getenv("ADVBOX_API_KEY", "") or os.getenv("ADVBOX_TOKEN", "")
        self.base_url = (
            base_url
            or os.getenv("ADVBOX_API_URL", "")
            or os.getenv("ADVBOX_BASE_URL", "https://app.advbox.com.br/api/v1")
        ).rstrip("/")

    def list_lawsuits(self, *, limit: int = 1000) -> list[dict[str, Any]]:
        if not self.api_key:
            raise IntegrationError("ADVBOX_API_KEY nao configurada.")

        processos: list[dict[str, Any]] = []
        offset = 0
        while True:
            try:
                response = requests.get(
                    f"{self.base_url}/lawsuits",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Accept": "application/json",
                        "User-Agent": "HubFinanceiro/1.0",
                    },
                    params={"limit": limit, "offset": offset},
                    timeout=30,
                )
                response.raise_for_status()
                payload = response.json()
            except requests.HTTPError as error:
                status = error.response.status_code if error.response is not None else None
                if status == 403:
                    raise IntegrationError(
                        "ADVBOX negou o acesso (HTTP 403). Confirme com o suporte se a integracao da conta esta habilitada para API."
                    ) from error
                if status == 401:
                    raise IntegrationError(
                        "ADVBOX recusou o token (HTTP 401). Verifique se ele esta ativo e autorizado."
                    ) from error
                status_text = str(status) if status is not None else "desconhecido"
                raise IntegrationError(f"ADVBOX respondeu com erro HTTP {status_text}.") from error
            except requests.RequestException as error:
                raise IntegrationError("Nao foi possivel consultar processos no ADVBOX.") from error
            except ValueError as error:
                raise IntegrationError("Resposta invalida recebida do ADVBOX.") from error

            registros = payload.get("data", []) if isinstance(payload, dict) else None
            if not isinstance(registros, list):
                raise IntegrationError("Resposta invalida recebida do ADVBOX.")
            if not registros:
                break

            processos.extend(registro for registro in registros if isinstance(registro, dict))
            offset += len(registros)
            total = payload.get("totalCount")
            if isinstance(total, int) and offset >= total:
                break
            if len(registros) < limit:
                break
        return processos

    def create_financial_launch(self, payload: dict[str, Any]) -> None:
        raise IntegrationError("Endpoint ADVBOX ainda nao confirmado para esta integracao.")