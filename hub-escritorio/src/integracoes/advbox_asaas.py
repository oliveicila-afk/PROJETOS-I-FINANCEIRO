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
    """Reserva a fronteira ADVBOX ate a confirmacao do contrato da API."""

    def __init__(self, api_key: str | None = None, base_url: str | None = None) -> None:
        self.api_key = api_key or os.getenv("ADVBOX_API_KEY", "")
        self.base_url = (base_url or os.getenv("ADVBOX_API_URL", "")).rstrip("/")

    def create_financial_launch(self, payload: dict[str, Any]) -> None:
        if not self.api_key or not self.base_url:
            raise IntegrationError("ADVBOX_API_KEY e ADVBOX_API_URL devem ser configuradas.")
        raise IntegrationError("Endpoint ADVBOX ainda nao confirmado para esta integracao.")