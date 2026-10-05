"""Cálculo de eficiência e ticket ajustado por etapa do processo."""

import re
from typing import Any


CNJ_PATTERN = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
PENDING_PROTOCOL_PATTERN = re.compile(r"\d{2}_\d{8}")


def filtrar_processos_por_etapa(processos: list[dict], etapa: str | None) -> list[dict]:
    if etapa is None:
        return processos
    return [
        processo
        for processo in processos
        if isinstance(processo, dict) and str(processo.get("type") or "").strip() == etapa
    ]



    def filtrar_processos_por_etapa(processos: list[dict], etapa: str | None) -> list[dict]:
        if etapa is None:
            return processos
        return [
            processo
            for processo in processos
            if isinstance(processo, dict) and str(processo.get("type") or "").strip() == etapa
        ]

def calcular_eficiencia_por_etapa(processos: list[dict]) -> dict[str, dict[str, Any]]:
    """
    Calcula a taxa de eficiência por etapa do processo.

    Taxa de Eficiência = Ganhos ÷ (Ganhos + Perdidos)

    O Advbox fornece a categoria usada pelo escritório no campo `type`.
    Retorna um dicionário por etapa com ganhos, perdidos e eficiência.
    """
    etapas = {}

    for p in processos:
        if not isinstance(p, dict):
            continue

        etapa = str(p.get("type", "")).strip()
        stage = str(p.get("stage", "")).upper()

        if not etapa:
            continue

        if etapa not in etapas:
            etapas[etapa] = {"ganhos": 0, "perdidos": 0}

        # Contar como ganho ou perdido
        if "PROCESSO GANHO" in stage:
            etapas[etapa]["ganhos"] += 1
        elif "PROCESSO PERDIDO" in stage:
            etapas[etapa]["perdidos"] += 1

    # Calcular eficiência
    resultado = {}
    for etapa, contagem in etapas.items():
        ganhos = contagem["ganhos"]
        perdidos = contagem["perdidos"]
        total = ganhos + perdidos

        eficiencia = ganhos / total if total > 0 else 0.0

        resultado[etapa] = {
            "ganhos": ganhos,
            "perdidos": perdidos,
            "total": total,
            "eficiencia": eficiencia
        }

    return resultado


def _valores_ticket_por_etapa(processos: list[dict]) -> dict[str, dict[str, float]]:
    etapas_dados = {}

    for p in processos:
        if not isinstance(p, dict):
            continue

        etapa = str(p.get("type", "")).strip()
        step = str(p.get("step", "")).upper()
        stage = str(p.get("stage", "")).upper()
        fees = p.get("fees_money", 0)
        process_number = p.get("process_number")

        if not etapa:
            continue

        # Filtrar: step=ARQUIVAMENTO + stage=GANHO/PERDIDO + fees>0
        if (
            "ARQUIVAMENTO" in step
            and ("PROCESSO GANHO" in stage or "PROCESSO PERDIDO" in stage)
            and fees and float(fees) > 0
            and process_number
        ):
            if etapa not in etapas_dados:
                etapas_dados[etapa] = {}

            # Guardar o maior valor por processo
            if process_number not in etapas_dados[etapa]:
                etapas_dados[etapa][process_number] = float(fees)
            else:
                etapas_dados[etapa][process_number] = max(
                    etapas_dados[etapa][process_number], float(fees)
                )

    return etapas_dados


def calcular_ticket_medio_por_etapa(processos: list[dict]) -> dict[str, float]:
    """Calcula ticket médio por etapa nos processos arquivados com resultado."""
    resultado = {}
    for etapa, processos_unicos in _valores_ticket_por_etapa(processos).items():
        if processos_unicos:
            valores = list(processos_unicos.values())
            ticket_medio = sum(valores) / len(valores)
            resultado[etapa] = round(ticket_medio, 2)
        else:
            resultado[etapa] = 0.0

    return resultado


def calcular_ticket_ajustado_geral(processos: list[dict]) -> float | None:
    """Calcula ticket médio de resultados arquivados multiplicado pela eficiência geral."""
    valores_por_etapa = _valores_ticket_por_etapa(processos)
    tickets = [
        valor
        for processos_unicos in valores_por_etapa.values()
        for valor in processos_unicos.values()
    ]
    if not tickets:
        return None

    resultados = calcular_eficiencia_por_etapa(processos)
    ganhos = sum(item["ganhos"] for item in resultados.values())
    perdidos = sum(item["perdidos"] for item in resultados.values())
    total_resultados = ganhos + perdidos
    eficiencia = ganhos / total_resultados if total_resultados else 0.0
    ticket_medio = sum(tickets) / len(tickets)
    return round(ticket_medio * eficiencia, 2)


def calcular_expectativa_receita(processos: list[dict]) -> dict[str, int | float | None]:
    """Soma o ticket médio histórico da categoria por processo CNJ não arquivado."""
    tickets_por_etapa = calcular_ticket_medio_por_etapa(processos)
    total = 0.0
    incluidos = 0
    sem_historico = 0
    processos_contados: set[str] = set()

    for processo in processos:
        if not isinstance(processo, dict):
            continue

        numero_processo = str(processo.get("process_number") or "").strip()
        if not CNJ_PATTERN.fullmatch(numero_processo) or numero_processo in processos_contados:
            continue

        stage = str(processo.get("stage") or "").upper()
        step = str(processo.get("step") or "").upper()
        if "ARQUIV" in stage or "ARQUIV" in step:
            continue
        processos_contados.add(numero_processo)

        etapa = str(processo.get("type") or "").strip()
        ticket_medio = tickets_por_etapa.get(etapa)
        if ticket_medio is None:
            sem_historico += 1
            continue

        total += ticket_medio
        incluidos += 1

    return {
        "valor": round(total, 2) if incluidos else None,
        "processos_incluidos": incluidos,
        "sem_historico": sem_historico,
    }


def calcular_prejuizo_potencial(processos: list[dict]) -> dict[str, int | float | None]:
    """Soma o ticket histórico por caso pré-processual com protocolo NN_NNNNNNNN."""
    tickets_por_etapa = calcular_ticket_medio_por_etapa(processos)
    casos_por_protocolo: dict[str, dict] = {}

    for processo in processos:
        if not isinstance(processo, dict) or str(processo.get("process_number") or "").strip():
            continue

        protocolo = str(processo.get("protocol_number") or "").strip()
        if not PENDING_PROTOCOL_PATTERN.fullmatch(protocolo):
            continue
        casos_por_protocolo.setdefault(protocolo, processo)

    total = 0.0
    incluidos = 0
    sem_historico = 0
    for processo in casos_por_protocolo.values():
        etapa = str(processo.get("type") or "").strip()
        ticket_medio = tickets_por_etapa.get(etapa)
        if ticket_medio is None:
            sem_historico += 1
            continue
        total += ticket_medio
        incluidos += 1

    return {
        "valor": round(total, 2) if incluidos else None,
        "casos_encontrados": len(casos_por_protocolo),
        "casos_incluidos": incluidos,
        "sem_historico": sem_historico,
    }


def calcular_ticket_ajustado_por_etapa(processos: list[dict]) -> dict[str, dict[str, Any]]:
    """
    Calcula ticket ajustado por etapa do processo.

    Ticket Ajustado = Ticket Médio × Taxa de Eficiência
    """
    ticket_medio = calcular_ticket_medio_por_etapa(processos)
    eficiencia = calcular_eficiencia_por_etapa(processos)

    resultado: dict[str, dict[str, Any]] = {}
    for etapa in eficiencia.keys():
        tm = ticket_medio.get(etapa)
        eff = eficiencia[etapa]["eficiencia"]

        ticket_ajustado = round(tm * eff, 2) if tm is not None else None

        resultado[etapa] = {
            "ticket_medio": tm,
            "eficiencia": eff,
            "ticket_ajustado": ticket_ajustado,
            "ganhos": eficiencia[etapa]["ganhos"],
            "perdidos": eficiencia[etapa]["perdidos"],
        }

    return resultado
