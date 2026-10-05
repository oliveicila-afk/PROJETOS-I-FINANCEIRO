"""Calculos do painel de ticket medio a partir dos registros do ADVBOX."""

import re

import pandas as pd


PROCESS_NUMBER_PATTERN = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")
STATUS_WON = "GANHO"
STATUS_LOST = "PERDIDO"
STATUS_IN_PROGRESS = "EM ANDAMENTO"


def _matches_pattern(values: pd.Series, pattern: re.Pattern[str]) -> pd.Series:
    return values.fillna("").astype(str).str.strip().str.fullmatch(pattern)


def _statuses(frame: pd.DataFrame) -> pd.Series:
    if "status_closure" not in frame.columns:
        return pd.Series("", index=frame.index, dtype="string")
    return frame["status_closure"].fillna("").astype(str).str.strip().str.upper()


def _valid_processes(frame: pd.DataFrame) -> pd.DataFrame:
    if "fees_money" not in frame.columns:
        return frame.iloc[0:0].copy()
    fees = pd.to_numeric(frame["fees_money"], errors="coerce").fillna(0)
    return frame.loc[fees > 0].copy()


def calcular_kpis(frame: pd.DataFrame) -> dict[str, float | int | None]:
    process_numbers = frame.get("process_number", pd.Series("", index=frame.index))
    active_mask = _matches_pattern(process_numbers, PROCESS_NUMBER_PATTERN)
    closure_dates = frame.get("status_closure", pd.Series("", index=frame.index))
    closure_dates = closure_dates.fillna("").astype(str).str.strip()
    pending_mask = active_mask & closure_dates.eq("")

    valid = _valid_processes(frame)
    fees = pd.to_numeric(valid.get("fees_money", pd.Series(dtype=float)), errors="coerce").dropna()
    contingency = pd.to_numeric(valid.get("contingency", pd.Series(dtype=float)), errors="coerce").dropna()
    ticket_medio = float(fees.mean()) if not fees.empty else 0.0
    ticket_base = float(contingency.mean()) if not contingency.empty else None

    expectativa = float(active_mask.sum() * ticket_medio)

    status = _statuses(frame)
    won_mask = status.eq(STATUS_WON)
    lost_mask = status.eq(STATUS_LOST)
    has_outcome_data = bool((won_mask | lost_mask).any())
    lost_fees = pd.to_numeric(frame.loc[lost_mask, "fees_money"], errors="coerce").fillna(0) if "fees_money" in frame.columns else pd.Series(dtype=float)
    concluded_count = int((won_mask | lost_mask).sum())
    efficiency = float(won_mask.sum() / concluded_count) if concluded_count else None

    return {
        "processos": int(active_mask.sum()),
        "pendentes": int(pending_mask.sum()),
        "ticket_medio": ticket_medio,
        "ticket_base": ticket_base,
        "expectativa": expectativa,
        "prejuizo": float(lost_fees.sum()) if has_outcome_data else None,
        "eficiencia": efficiency,
        "resultados_disponiveis": has_outcome_data,
    }



    def contar_processos_em_andamento(frame: pd.DataFrame) -> int:
        process_numbers = frame.get("process_number", pd.Series("", index=frame.index))
        valid_cnj = _matches_pattern(process_numbers, PROCESS_NUMBER_PATTERN)
        stages = frame.get("stage", pd.Series("", index=frame.index))
        archived = stages.fillna("").astype(str).str.contains("ARQUIV", case=False, regex=False)
        return int((valid_cnj & ~archived).sum())


    def contar_processos_pendentes(frame: pd.DataFrame) -> int:
        process_numbers = frame.get("process_number", pd.Series("", index=frame.index))
        empty_number = process_numbers.fillna("").astype(str).str.strip().str.lower().isin(["", "none"])
        return int(empty_number.sum())

def contar_processos_em_andamento(frame: pd.DataFrame) -> int:
    process_numbers = frame.get("process_number", pd.Series("", index=frame.index))
    valid_cnj = _matches_pattern(process_numbers, PROCESS_NUMBER_PATTERN)
    stages = frame.get("stage", pd.Series("", index=frame.index))
    archived = stages.fillna("").astype(str).str.contains("ARQUIV", case=False, regex=False)
    return int((valid_cnj & ~archived).sum())


def contar_processos_pendentes(frame: pd.DataFrame) -> int:
    process_numbers = frame.get("process_number", pd.Series("", index=frame.index))
    empty_number = process_numbers.fillna("").astype(str).str.strip().str.lower().isin(["", "none"])
    return int(empty_number.sum())


def tabela_por_tese(frame: pd.DataFrame) -> pd.DataFrame:
    if "type" not in frame.columns:
        return pd.DataFrame(columns=["Tese", "Ticket Médio", "Taxa de Êxito"])

    valid = _valid_processes(frame)
    if valid.empty:
        return pd.DataFrame(columns=["Tese", "Ticket Médio", "Taxa de Êxito"])

    valid["fees_money"] = pd.to_numeric(valid["fees_money"], errors="coerce")
    ticket = valid.groupby("type", dropna=False)["fees_money"].mean().rename("Ticket Médio")
    status = _statuses(frame)
    concluded = frame.loc[status.isin([STATUS_WON, STATUS_LOST])].copy()
    concluded["_won"] = _statuses(concluded).eq(STATUS_WON)
    rates = concluded.groupby("type", dropna=False)["_won"].mean().rename("Taxa de Êxito")
    result = pd.concat([ticket, rates], axis=1).reset_index().rename(columns={"type": "Tese"})
    result["Taxa de Êxito"] = result["Taxa de Êxito"].astype("object").where(result["Taxa de Êxito"].notna(), None)
    return result.sort_values("Ticket Médio", ascending=False).reset_index(drop=True)


def processos_por_fase(frame: pd.DataFrame) -> pd.DataFrame:
    process_numbers = frame.get("process_number", pd.Series("", index=frame.index))
    active = frame.loc[_matches_pattern(process_numbers, PROCESS_NUMBER_PATTERN)].copy()
    phase_column = "step" if "step" in active.columns else "stage"
    if phase_column not in active.columns or active.empty:
        return pd.DataFrame(columns=["Fase", "Quantidade"])
    active[phase_column] = active[phase_column].fillna("Sem fase").replace("", "Sem fase")
    return (
        active[phase_column]
        .value_counts()
        .rename_axis("Fase")
        .reset_index(name="Quantidade")
        .sort_values("Quantidade", ascending=False)
    )


def distribuicao_por_campo(frame: pd.DataFrame, campo: str, rotulo: str) -> pd.DataFrame:
    if campo not in frame.columns:
        return pd.DataFrame(columns=[rotulo, "Quantidade"])

    valores = frame[campo].fillna("").astype(str).str.strip().replace("", "Sem informação")
    return (
        valores.value_counts()
        .rename_axis(rotulo)
        .reset_index(name="Quantidade")
        .sort_values("Quantidade", ascending=False)
        .reset_index(drop=True)
    )


def valores_por_fase(frame: pd.DataFrame, ticket_medio: float) -> pd.DataFrame:
    result = processos_por_fase(frame)
    result["Expectativa (R$)"] = result["Quantidade"] * ticket_medio
    return result


def distribuicao_por_faixa(frame: pd.DataFrame) -> pd.DataFrame:
    valid = _valid_processes(frame)
    if valid.empty:
        return pd.DataFrame(columns=["Faixa", "Quantidade"])

    fees = pd.to_numeric(valid["fees_money"], errors="coerce").fillna(0)
    bins = [-1, 2000, 5000, 10000, float("inf")]
    labels = ["Até R$ 2 mil", "R$ 2–5 mil", "R$ 5–10 mil", "Acima de R$ 10 mil"]
    distribution = pd.cut(fees, bins=bins, labels=labels, right=False).value_counts(sort=False)
    return distribution.rename_axis("Faixa").reset_index(name="Quantidade")


def distribuicao_resultado(
    frame: pd.DataFrame,
    processos_em_andamento: int | None = None,
) -> pd.DataFrame:
    etapas = frame.get("stage", pd.Series("", index=frame.index))
    etapas = etapas.fillna("").astype(str).str.strip().str.upper()
    ganhos = int(etapas.str.contains("PROCESSO GANHO", regex=False).sum())
    perdidos = int(etapas.str.contains("PROCESSO PERDIDO", regex=False).sum())

    if processos_em_andamento is None:
        process_numbers = frame.get("process_number", pd.Series("", index=frame.index))
        steps = frame.get("step", pd.Series("", index=frame.index))
        valid_process = _matches_pattern(process_numbers, PROCESS_NUMBER_PATTERN)
        archived = (
            steps.fillna("").astype(str).str.contains("ARQUIVAMENTO", case=False, regex=False)
            | etapas.str.contains("ARQUIVAMENTO", regex=False)
        )
        em_andamento = int((valid_process & ~archived & ~etapas.str.contains("PROCESSO GANHO|PROCESSO PERDIDO", regex=True)).sum())
    else:
        em_andamento = max(0, int(processos_em_andamento))

    return pd.DataFrame(
        [
            {"Status": STATUS_WON, "Quantidade": ganhos},
            {"Status": STATUS_LOST, "Quantidade": perdidos},
            {"Status": STATUS_IN_PROGRESS, "Quantidade": em_andamento},
        ]
    )