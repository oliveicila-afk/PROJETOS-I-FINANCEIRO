"""Dados sinteticos para visualizar o painel sem credenciais do ADVBOX."""

import numpy as np
import pandas as pd


TESES = [
    "TARIFA BANCARIA",
    "SEGURO PRESTAMISTA",
    "DANOS MORAIS E MATERIAIS",
    "PM/AM - QUESTOES OBJETIVAS",
    "IRREGULARIDADE",
    "CONVOCACAO/NOMEACAO IRREGULARIDADES",
    "PM/AM - TAF",
    "PM/AM - INVESTIGACAO SOCIAL",
    "DATA BASE",
    "COBRANCA INDEVIDA",
    "DIRETIVOS VERTICAL - SEDUC",
    "PROMOCAO HORIZONTAL - SEDUC",
    "DANO A BAGAGEM",
    "PM/CE - ANULACAO DE QUESTAO OBJETIVA",
    "SINDICANCIA/INVESTIGACAO SOCIAL",
    "CBM/AM - TAF - FILMAGEM",
    "PM/AM - ETAPA MEDICA",
    "SUPERENDIVIDAMENTO",
    "NEGRO - COTA - ANULACAO",
    "DANOS MATERIAIS/MORAIS",
]

TICKET_POR_TESE = [1322, 2424, 1670, 4724, 5077, 9001, 2216, 3546, 2325, 1241,
                   4265, 3730, 944, 11627, 9208, 4704, 11112, 997, 2628, 548]
TAXA_EXITO = [0.83, 0.91, 0.89, 0.50, 0.33, 0.33, 0.30, 0.50, 1.00, 1.00,
              0.69, 0.40, 1.00, 0.20, 0.10, 1.00, 0.15, 0.20, 0.25, 0.10]
FASES = ["NEGOCIACAO", "JUDICIAL", "RECURSAL", "ARQUIVAMENTO", "RH/FINANCEIRO", "CONSULTORIA"]


def gerar_dados_amostra(n: int = 800) -> pd.DataFrame:
    random = np.random.default_rng(42)
    tese_indexes = random.choice(
        len(TESES),
        size=n,
        p=[0.12, 0.11, 0.10, 0.09, 0.07, 0.06, 0.06, 0.05, 0.05, 0.05,
           0.04, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.02, 0.01, 0.01],
    )
    teses = np.array(TESES)[tese_indexes]
    fees_money = np.array(
        [max(0, random.normal(TICKET_POR_TESE[index], TICKET_POR_TESE[index] * 0.3)) for index in tese_indexes]
    )
    fees_money[random.random(n) < 0.15] = 0

    statuses = []
    for index in tese_indexes:
        success_rate = TAXA_EXITO[index]
        draw = random.random()
        if draw < success_rate * 0.7:
            statuses.append("GANHO")
        elif draw < success_rate * 0.7 + (1 - success_rate) * 0.6:
            statuses.append("PERDIDO")
        else:
            statuses.append("EM ANDAMENTO")

    pending = random.random(n) < 0.15
    process_numbers = [
        None if is_pending else f"{random.integers(1_000_000, 9_999_999)}-{random.integers(10, 99)}.2026.8.04.0001"
        for is_pending in pending
    ]
    protocol_numbers = [
        f"X_{random.integers(10_000_000, 99_999_999)}" if is_pending else None
        for is_pending in pending
    ]
    phases = random.choice(FASES, size=n, p=[0.20, 0.35, 0.15, 0.20, 0.05, 0.05])
    contingency = np.maximum(0, random.normal(3750, 1200, n))

    dataframe = pd.DataFrame(
        {
            "id": range(1, n + 1),
            "process_number": process_numbers,
            "protocol_number": protocol_numbers,
            "fees_money": fees_money,
            "fees_expec": np.array(TICKET_POR_TESE)[tese_indexes],
            "contingency": contingency,
            "type": teses,
            "status_closure": statuses,
            "step": phases,
            "stage": random.choice(["ANALISE DO CASO", "PETICAO INICIAL", "AGUARDANDO SENTENCA", "EXECUCAO"], n),
        }
    )
    dataframe["Processo valido"] = dataframe["fees_money"] > 0
    return dataframe