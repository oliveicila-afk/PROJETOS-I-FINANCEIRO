import os
import streamlit as st
from pathlib import Path
from datetime import timedelta

import base64
import hmac
import secrets
from datetime import date, datetime
import pandas as pd
import requests
import altair as alt
from dotenv import load_dotenv
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from integracoes.advbox_asaas import AdvboxClient, IntegrationError
from ticket_medio import (
    distribuicao_por_faixa,
    distribuicao_resultado,
    calcular_kpis,
    processos_por_fase,
    tabela_por_tese,
    valores_por_fase,
)
from sample_data import gerar_dados_amostra
from integracoes.excel_export import exportar_agora

# Dependências desabilitadas - não funcionam no Streamlit Cloud
# from google_auth_oauthlib.flow import Flow
# from oauthlib.oauth2.rfc6749.errors import OAuth2Error
# from database import initialize_database, listar_previsoes, salvar_previsao
# from integracoes.advbox_asaas import AsaasClient

st.set_page_config(
    page_title="Hub Financeiro e Estrategico",
    page_icon="C",
    layout="wide",
)

# initialize_database()

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

def _get_env_or_secret(key: str, default: str = "") -> str:
    val = os.getenv(key, "")
    if val:
        return val
    try:
        return str(st.secrets.get(key, default))
    except:
        return default

ADMIN_EMAIL = _get_env_or_secret("ADMIN_EMAIL", "")
AUTHORIZED_EMAILS = {
    email.strip().lower()
    for email in _get_env_or_secret("AUTHORIZED_EMAILS", "").replace(";", ",").split(",")
    if email.strip()
}
if ADMIN_EMAIL:
    AUTHORIZED_EMAILS.add(ADMIN_EMAIL.strip().lower())
APP_ACCESS_PASSWORD = _get_env_or_secret("APP_ACCESS_PASSWORD", "")
GOOGLE_CREDENTIALS_PATH = PROJECT_ROOT / os.getenv("GOOGLE_OAUTH_CREDENTIALS_PATH", "google_credentials.json")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8501")

def get_google_cookie_key() -> str:
    key = os.getenv("GOOGLE_OAUTH_COOKIE_KEY", "")
    if key:
        return key
    try:
        return str(st.secrets.get("GOOGLE_OAUTH_COOKIE_KEY", ""))
    except Exception:
        return ""


GOOGLE_COOKIE_KEY = get_google_cookie_key()
LOGO_PATH = PROJECT_ROOT / "assets" / "logo-calandrini.png"
TEAM_IMAGE_PATH = PROJECT_ROOT / "assets" / "equipe-calandrini.jpg"
SESSION_IDLE_TIMEOUT = timedelta(hours=6)


def aplicar_estilo() -> None:
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        :root {
            --navy: #2e3a62;
            --navy-deep: #202a4a;
            --gold: #b39868;
            --ink: #1f2945;
            --mist: #f6f7f4;
            --line: #ded7c9;
        }

        .stApp { background: linear-gradient(180deg, #071a2d 0%, #0b1d32 100%); background-position: right center; background-repeat: no-repeat; background-size: 50% 100%; color: #edf4ff; font-family: 'DM Sans', sans-serif; }
        #MainMenu, footer, header { visibility: hidden; }
        .block-container { max-width: 1280px; padding: 2rem 2.5rem 3rem; position: relative; z-index: 1; }
        h1, h2, h3 { font-family: 'DM Sans', sans-serif !important; color: #edf4ff !important; }
        h1 { font-size: 2.15rem !important; font-weight: 800 !important; letter-spacing: 0 !important; }
        h2 { font-size: 1.7rem !important; font-weight: 700 !important; }
        h3 { font-size: 1.3rem !important; }
        p, label, [data-testid="stMarkdownContainer"] { letter-spacing: 0 !important; }

        [data-testid="stSidebar"] { background: #0c1d34; border-right: 1px solid rgba(124, 170, 216, 0.35); }
        [data-testid="stSidebar"] * { color: #edf4ff !important; }
        [data-testid="stSidebar"] [data-baseweb="select"] > div { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.15); }
        [data-testid="stSidebar"] .stAlert { background: rgba(179,152,104,.12); border: 1px solid rgba(179,152,104,.35); }
        [data-testid="stSidebar"] [data-testid="stButton"] > button { width: 100%; justify-content: flex-start; background: transparent; border: 1px solid transparent; border-radius: 8px; color: #edf4ff; box-shadow: none; padding: .75rem .8rem; font-weight: 600; }
        [data-testid="stSidebar"] [data-testid="stButton"] > button:hover { background: rgba(122, 169, 219, 0.08); border-color: rgba(122, 169, 219, 0.25); color: #ffffff; }

        [data-testid="stMetric"] { background: rgba(14, 31, 50, 0.9); border: 1px solid rgba(124, 170, 216, 0.22); border-radius: 12px; padding: 1.1rem 1.2rem; min-height: 118px; box-shadow: 0 10px 24px rgba(1, 4, 8, 0.2); }
        [data-testid="stMetricLabel"] { color: rgba(237,244,255,0.72); font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08rem; }
        [data-testid="stMetricValue"] { color: #edf4ff; font-size: 2rem; font-weight: 800; }
        [data-testid="stMetricDelta"] svg { fill: #5ad39d; }

        .stButton > button, [data-testid="stFormSubmitButton"] > button { background: #8dd9c5; border: 1px solid #8dd9c5; border-radius: 8px; color: #062235; font-family: 'DM Sans', sans-serif; font-weight: 700; min-height: 2.65rem; }
        .stButton > button:hover, [data-testid="stFormSubmitButton"] > button:hover { background: #9fe9d6; border-color: #9fe9d6; color: #062235; }
        [data-testid="stTextInput"] input, [data-baseweb="select"] > div, [data-testid="stDateInput"] input, [data-testid="stNumberInput"] input { background: rgba(255,255,255,.04); border-color: rgba(124, 170, 216, 0.28); color: #edf4ff; border-radius: 8px; }
        [data-testid="stDataFrame"] { border: 1px solid rgba(124, 170, 216, 0.25); border-radius: 12px; overflow: hidden; background: rgba(12, 29, 52, 0.9); }
        details { background: rgba(12,29,52,0.9); border: 1px solid rgba(124, 170, 216, 0.25); border-radius: 8px; color: #edf4ff; max-width: 390px; }
        [data-testid="stAlert"] { border-radius: 8px; }

        .ticket-toolbar { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin: 1.2rem 0 .8rem; }
        .ticket-section-label { color: #edf4ff; font-size: 1.2rem; font-weight: 800; letter-spacing: .08rem; text-transform: uppercase; }
        .ticket-count { color: rgba(237,244,255,0.68); font-size: .74rem; font-weight: 700; letter-spacing: .06rem; text-transform: uppercase; }
        .ticket-list { display: grid; gap: 1rem; }
        .ticket-card { background: linear-gradient(180deg, rgba(11, 28, 46, 0.98), rgba(12, 30, 48, 0.98)); border: 1px solid rgba(120, 177, 220, 0.36); border-radius: 14px; box-shadow: 0 8px 20px rgba(1, 4, 8, 0.18); padding: 1.1rem 1.2rem 1rem; }
        .ticket-card:hover { border-color: rgba(141,217,197,0.45); box-shadow: 0 12px 26px rgba(1, 4, 8, 0.25); }
        .ticket-card-head, .ticket-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .ticket-card-head { margin-bottom: .6rem; }
        .ticket-card-footer { margin-top: 0.9rem; }
        .ticket-id { color: #8dd9c5; font-size: 1rem; font-weight: 800; letter-spacing: .06rem; }
        .ticket-updated { color: rgba(237,244,255,0.72); font-size: .8rem; white-space: nowrap; }
        .ticket-subject { color: #edf4ff; font-size: 2.1rem; font-weight: 800; line-height: 1.15; margin: 0 0 .9rem; }
        .ticket-value-box { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem .9rem; background: rgba(32, 58, 80, 0.6); border: 1px solid rgba(122, 165, 204, 0.34); border-radius: 12px; }
        .ticket-label { color: rgba(237,244,255,0.7); font-size: .7rem; font-weight: 800; letter-spacing: .12rem; text-transform: uppercase; }
        .ticket-value { color: #edf4ff; font-size: 2.05rem; font-weight: 800; line-height: 1.1; }
        .ticket-meta { color: rgba(237,244,255,0.8); font-size: 1.04rem; font-weight: 600; }
        .ticket-badge { border-radius: 8px; display: inline-block; font-size: .72rem; font-weight: 800; letter-spacing: .05rem; padding: .35rem .7rem; text-transform: none; }
        .ticket-priority-high { background: rgba(255, 104, 94, 0.16); color: #ff9186; }
        .ticket-priority-medium { background: rgba(255, 191, 74, 0.15); color: #f0c05d; }
        .ticket-priority-low { background: rgba(93, 211, 157, 0.14); color: #7ce1b0; }
        .ticket-status { background: rgba(124, 170, 216, 0.12); color: #cfe6ff; }
        .ticket-status-done { background: rgba(93, 211, 157, 0.12); color: #8fe9bc; }
        .ticket-status-highlight { background: rgba(113, 206, 170, 0.15); color: #94efca; }
        .ticket-summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: .75rem; margin: 1rem 0 1.25rem; }
        .ticket-summary-card { background: linear-gradient(180deg, rgba(13,31,52,0.95), rgba(9,24,42,1)); border: 1px solid rgba(124, 170, 216, 0.18); border-radius: 12px; box-shadow: 0 12px 26px rgba(1, 4, 8, 0.18); padding: .9rem 1rem; }
        .ticket-summary-card .eyebrow { color: rgba(237,244,255,0.7); font-size: .68rem; font-weight: 700; letter-spacing: .12rem; text-transform: uppercase; }
        .ticket-summary-value { color: #edf4ff; font-size: 2rem; font-weight: 800; line-height: 1.1; margin-top: .35rem; }
        .ticket-mini-box { background: rgba(124, 170, 216, 0.05); border: 1px solid rgba(124, 170, 216, 0.2); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: .7rem; margin-top: .25rem; padding: .75rem .8rem; }
        .ticket-mini-label { color: rgba(237,244,255,0.72); font-size: .7rem; font-weight: 700; letter-spacing: .08rem; text-transform: uppercase; }
        .ticket-mini-value { color: #edf4ff; font-size: 1.08rem; font-weight: 800; }
        .stApp h1, .stApp h2, .stApp h3 { color: #edf4ff !important; }

        @media (max-width: 700px) {
            .ticket-card-bottom { align-items: flex-start; flex-direction: column; gap: .45rem; }
            .ticket-toolbar { align-items: flex-start; flex-direction: column; gap: .25rem; }
        }

        .brand-lockup { display: flex; align-items: center; gap: 12px; margin: 0 0 2rem; }
        .brand-monogram { width: 52px; height: 52px; border: 2px solid var(--gold); border-radius: 50%; display: grid; place-items: center; color: #fff; font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 600; line-height: 1; box-shadow: inset 0 0 0 4px #171f38, inset 0 0 0 6px rgba(255,255,255,.9); }
        .brand-name { color: white; font-family: 'Cormorant Garamond', serif; font-size: 1.65rem; line-height: .88; letter-spacing: .04rem; }
        .brand-subtitle { color: var(--gold); font-size: .59rem; font-weight: 700; letter-spacing: .16rem; margin-top: 6px; }
        .login-shell { border-top: 4px solid var(--gold); border-bottom: 1px solid rgba(179,152,104,.6); padding: 2.2rem 0 2rem; margin-top: 6vh; margin-bottom: 1.4rem; color: white; }
        .login-shell h2 { color: #ffffff !important; }
        .login-logo { display: block; width: min(220px, 55vw); max-height: 178px; object-fit: contain; margin: 0 0 1.35rem; }
        .login-fallback { width: 64px; height: 64px; margin: 0 0 1.15rem; border: 2px solid var(--gold); border-radius: 50%; box-shadow: inset 0 0 0 5px #101e34, inset 0 0 0 7px rgba(255,255,255,.92); display: grid; place-items: center; color: white; font-family: 'Cormorant Garamond', serif; font-size: 2.6rem; }
        .login-description { max-width: 390px; margin: .8rem 0 0; color: #d4d8e3; font-size: .95rem; line-height: 1.55; text-align: left; }
        .login-actions { padding-bottom: 1rem; max-width: 390px; }
        .login-actions a { box-shadow: 0 10px 24px rgba(7,12,29,.3); }
        .eyebrow { color: var(--gold); font-size: .72rem; font-weight: 700; letter-spacing: .14rem; text-transform: uppercase; }
        .page-kicker { color: var(--gold); font-size: .74rem; font-weight: 700; letter-spacing: .14rem; text-transform: uppercase; margin-bottom: .25rem; }
        .page-rule { height: 1px; background: var(--gold); margin: .9rem 0 2rem; opacity: .72; }
        .app-shell { min-height: 100vh; }
        .app-shell .stApp { background: var(--mist); }

        @media (max-width: 700px) {
            .stApp { background-image: none; }
            .block-container { padding: 1.5rem 1rem 2.5rem; }
            .login-shell { padding: 2rem 1.35rem; }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
    if TEAM_IMAGE_PATH.is_file():
        image_base64 = base64.b64encode(TEAM_IMAGE_PATH.read_bytes()).decode("ascii")
        st.markdown(
            f"""<style>
            .stApp {{ background-image: url('data:image/jpeg;base64,{image_base64}'); background-size: cover; background-position: center; }}
            .stApp:has(.app-shell) {{ background-image: none; background-color: var(--mist); color: var(--ink); }}
            .stApp:has(.app-shell) h1, .stApp:has(.app-shell) h2, .stApp:has(.app-shell) h3 {{ color: var(--navy) !important; }}
            .login-shell {{ border-top: 0; margin-top: 31vh; padding-top: 0; }}
            </style>""",
            unsafe_allow_html=True,
        )


aplicar_estilo()


def marca_lateral() -> None:
    st.sidebar.markdown(
        """
        <div class="brand-lockup">
            <div class="brand-monogram">C</div>
            <div><div class="brand-name">Calandrini</div><div class="brand-subtitle">Advogados Associados</div></div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def cabecalho_painel() -> None:
    st.markdown(
        "<div class='page-kicker'>Calandrini Advogados Associados</div>"
        "<div class='page-rule'></div>",
        unsafe_allow_html=True,
    )


def marca_login() -> str:
    if TEAM_IMAGE_PATH.is_file():
        return ""
    if LOGO_PATH.is_file():
        logo_base64 = base64.b64encode(LOGO_PATH.read_bytes()).decode("ascii")
        return f"<img class='login-logo' src='data:image/png;base64,{logo_base64}' alt='Calandrini Advogados Associados'>"
    return "<div class='login-fallback'>C</div>"


class GoogleAuthenticator:
    def __init__(self, *args, **kwargs):
        pass

    def check_authentification(self):
        pass

    def login(self, **kwargs):
        st.markdown(
            "<div style='display:flex;'>"
            "<div style='background:#fff;color:#1f2945;border:1px solid #b39868;border-radius:3px;padding:10px 16px;font-weight:700;cursor:not-allowed;opacity:0.6;'>"
            "Continuar com Google<br><small style=\"font-size:0.8em;opacity:0.7;\">Em desenvolvimento</small>"
            "</div></div>",
            unsafe_allow_html=True,
        )

    def logout(self):
        pass


def get_authenticator() -> GoogleAuthenticator:
    return GoogleAuthenticator()


AUTHENTICATOR = get_authenticator()


def verificar_seguranca() -> bool:
    if "autenticado" not in st.session_state:
        st.session_state["autenticado"] = False

    ultimo_acesso = st.session_state.get("ultimo_acesso")
    if st.session_state["autenticado"] and ultimo_acesso:
        if datetime.utcnow() - ultimo_acesso > SESSION_IDLE_TIMEOUT:
            if AUTHENTICATOR:
                AUTHENTICATOR.logout()
            st.session_state.clear()
            st.session_state["autenticado"] = False
            st.session_state["sessao_expirada"] = True

    if AUTHENTICATOR:
        AUTHENTICATOR.check_authentification()
        if st.session_state.get("connected", False):
            user_info = st.session_state.get("user_info", {})
            user_email = str(user_info.get("email", "")).strip().lower()
            if email_autorizado(user_email):
                st.session_state["autenticado"] = True
                st.session_state["usuario"] = user_email
                st.session_state["ultimo_acesso"] = datetime.utcnow()
                return True

            st.error("Este e-mail nao tem permissao para acessar o painel.")
            if st.button("Sair da conta Google"):
                AUTHENTICATOR.logout()
                st.session_state.clear()
                st.rerun()
            return False

    if st.session_state["autenticado"]:
        st.session_state["ultimo_acesso"] = datetime.utcnow()
        return True

    login_column, _, _ = st.columns([5, 3, 4])
    with login_column:
        if st.session_state.pop("sessao_expirada", False):
            st.warning("Sua sessao expirou por inatividade. Faca login novamente.")
        if not TEAM_IMAGE_PATH.is_file():
            st.markdown(
                f"<div class='login-shell'>{marca_login()}"
                "<div class='eyebrow'>Calandrini Advogados Associados</div>"
                "<h2>Acesso ao Hub</h2>"
                "<p class='login-description'>Painel financeiro e estrategico com acesso restrito a contas autorizadas.</p></div>",
                unsafe_allow_html=True,
            )
        else:
            st.container(height=390, border=False)
        st.markdown("<div class='login-actions'>", unsafe_allow_html=True)
        if AUTHENTICATOR:
            AUTHENTICATOR.login(justify_content="flex-start")
        else:
            st.info("Configure google_credentials.json e GOOGLE_OAUTH_COOKIE_KEY para habilitar o login Google.")
        st.markdown("</div>", unsafe_allow_html=True)

        with st.expander("Acesso por senha local"):
            with st.form("form_login"):
                email_input = st.text_input("E-mail autorizado")
                senha_input = st.text_input("Palavra-passe de acesso", type="password")
                entrar = st.form_submit_button("Entrar com senha")

            if entrar:
                credenciais_configuradas = bool(
                    AUTHORIZED_EMAILS
                    and ADMIN_EMAIL != "seu_email@gmail.com"
                    and APP_ACCESS_PASSWORD
                    and APP_ACCESS_PASSWORD != "defina_uma_senha_forte"
                )
                acesso_valido = (
                    credenciais_configuradas
                    and email_autorizado(email_input)
                    and hmac.compare_digest(senha_input, APP_ACCESS_PASSWORD)
                )
                if acesso_valido:
                    st.session_state["autenticado"] = True
                    st.session_state["usuario"] = email_input.strip()
                    st.session_state["ultimo_acesso"] = datetime.utcnow()
                    st.rerun()
                st.error("Acesso negado ou configuracao incompleta.")
    return False


# def previsoes_dataframe() -> pd.DataFrame:
#     previsoes = listar_previsoes()
#     return pd.DataFrame(
#         [
#             {
#                 "Processo": previsao.processo,
#                 "Banco": previsao.banco,
#                 "Tese": previsao.tese,
#                 "Data prevista": previsao.data_prevista,
#                 "Competencia": previsao.competencia,
#                 "Bruto (R$)": previsao.valor_bruto,
#                 "Liquido (R$)": previsao.valor_liquido,
#             }
#             for previsao in previsoes
#         ]
#     )


def formatar_moeda(valor: float) -> str:
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def email_autorizado(email: str) -> bool:
    email_normalizado = email.strip().lower()
    return any(hmac.compare_digest(email_normalizado, autorizado) for autorizado in AUTHORIZED_EMAILS)


def exibir_dashboard() -> None:
    st.title("Dashboard")
    st.caption("Visao executiva do escritorio | dados demonstrativos")
    # previsoes = listar_previsoes()
    total_previsto = 186_450.00
    total_bruto = 248_900.00
    recebidos = 92_780.00
    pendencias = 7

    coluna_1, coluna_2, coluna_3, coluna_4 = st.columns(4)
    coluna_1.metric("Previsao liquida", formatar_moeda(total_previsto), "+8,4%")
    coluna_2.metric("Recebido no mes", formatar_moeda(recebidos), "+12,1%")
    coluna_3.metric("Previsao bruta", formatar_moeda(total_bruto), "+4,2%")
    coluna_4.metric("Pendencias", str(pendencias), "-2 nesta semana")

    meses = ["Mai", "Jun", "Jul", "Ago", "Set", "Out"]
    evolucao = pd.DataFrame(
        {"Previsto": [64_000, 71_500, 83_200, 79_800, 92_400, 101_300], "Recebido": [58_400, 66_200, 75_900, 73_100, 89_300, 92_780]},
        index=meses,
    )
    grafico, resumo = st.columns([2, 1])
    with grafico:
        st.subheader("Fluxo financeiro")
        st.bar_chart(evolucao, color=["#b39868", "#6f83b4"], height=275)
    with resumo:
        st.subheader("Proximos marcos")
        st.dataframe(
            pd.DataFrame(
                [
                    {"Data": "28 Set", "Evento": "Repasse previsto", "Valor": "R$ 18.400"},
                    {"Data": "03 Out", "Evento": "Revisao de calculo", "Valor": "R$ 24.900"},
                    {"Data": "08 Out", "Evento": "Alvara judicial", "Valor": "R$ 31.600"},
                ]
            ),
            use_container_width=True,
            hide_index=True,
            height=275,
        )

    st.subheader("Previsoes recentes")
    dataframe = pd.DataFrame(
        [
            {"Processo": "0001452-31.2026", "Banco": "Banco do Brasil", "Tese": "Progressao funcional", "Data prevista": "30/09/2026", "Competencia": "Setembro/2026", "Bruto (R$)": 42_000.00, "Liquido (R$)": 12_600.00},
            {"Processo": "0000984-72.2026", "Banco": "Caixa Economica", "Tese": "Diferencas salariais", "Data prevista": "08/10/2026", "Competencia": "Outubro/2026", "Bruto (R$)": 35_800.00, "Liquido (R$)": 10_740.00},
        ]
    )
    st.dataframe(dataframe, use_container_width=True, hide_index=True)


def exibir_tickets() -> None:
    st.title("Tickets")
    st.caption("Analise de honorarios por tese juridica — Processos Arquivados · Advbox CRM")

    api_key = _get_env_or_secret("ADVBOX_API_KEY") or _get_env_or_secret("ADVBOX_TOKEN")
    base_url = _get_env_or_secret("ADVBOX_API_URL", "https://app.advbox.com.br/api/v1")

    if st.button("Atualizar dados do Advbox", key="atualizar_tickets"):
        carregar_processos_advbox.clear()

    if not api_key:
        st.info("ℹ️ AMOSTRA: Estes dados são sintéticos. Configure ADVBOX_API_KEY para consultar o Advbox.")
        processos = gerar_dados_amostra()
    else:
        try:
            with st.spinner("Consultando processos do Advbox..."):
                processos = carregar_processos_advbox(api_key, base_url)
        except IntegrationError as error:
            st.error(str(error))
            return

    dataframe = pd.DataFrame(processos)
    if dataframe.empty:
        st.warning("A API do Advbox nao retornou processos.")
        return

    kpis = calcular_kpis(dataframe)

    st.markdown("<div style='margin: 1.5rem 0;'></div>", unsafe_allow_html=True)

    kpis_data = [
        ("Processos", f"{kpis['processos']:,}".replace(",", "."), "Com número CNJ"),
        ("Pendentes", f"{kpis['pendentes']:,}".replace(",", "."), "Sem data de encerramento"),
        ("Ticket Médio", _formatar_reais(kpis["ticket_medio"]), "Média dos honorários"),
        ("Base Comercial", _formatar_reais(kpis["ticket_base"]), "Valor da causa indisponível na API"),
        ("Expectativa", _formatar_reais(kpis["expectativa"]), "Honorários em aberto"),
        ("Prejuízo Pot.", _formatar_reais(kpis["prejuizo"]), "Honorários perdidos"),
    ]

    for row in range(2):
        kpi_cols = st.columns(3)
        for col in range(3):
            idx = row * 3 + col
            if idx < len(kpis_data):
                label, value, sublabel = kpis_data[idx]
                with kpi_cols[col]:
                    st.markdown(
                        f"""
                        <div style='background: rgba(14, 31, 50, 0.9); border: 1px solid rgba(124, 170, 216, 0.22);
                        border-radius: 12px; padding: 1.1rem 1.2rem;'>
                            <div style='color: rgba(237,244,255,0.7); font-size: 0.7rem; font-weight: 700;
                            letter-spacing: 0.12rem; text-transform: uppercase; margin-bottom: 0.5rem;'>
                                {label}
                            </div>
                            <div style='color: #edf4ff; font-size: 1.3rem; font-weight: 800; line-height: 1.1;
                            margin-bottom: 0.25rem;'>
                                {value}
                            </div>
                            <div style='color: rgba(237,244,255,0.6); font-size: 0.7rem;'>
                                {sublabel}
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )


@st.cache_data(ttl=3600, show_spinner=False)
def carregar_processos_advbox(api_key: str, base_url: str) -> list[dict]:
    return AdvboxClient(api_key=api_key, base_url=base_url).list_lawsuits()


def _formatar_reais(valor: float | int | None) -> str:
    if valor is None or pd.isna(valor):
        return "Indisponivel"
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def ler_dados_excel() -> dict:
    """Lê dados do arquivo TICKET.xlsx."""
    import openpyxl
    caminho_arquivo = PROJECT_ROOT / "data" / "TICKET.xlsx"

    if not caminho_arquivo.exists():
        return {"processos_em_andamento": 0, "total_processos": 0, "atualizado_em": "Não atualizado"}

    try:
        wb = openpyxl.load_workbook(caminho_arquivo)
        ws_dados = wb["Dados"]
        ws_controle = wb["Controle"]

        return {
            "processos_em_andamento": ws_dados["B2"].value or 0,
            "total_processos": ws_controle["B3"].value or 0,
            "atualizado_em": ws_controle["B2"].value or "Não atualizado"
        }
    except Exception:
        return {"processos_em_andamento": 0, "total_processos": 0, "atualizado_em": "Erro ao ler"}


def exibir_ticket_medio() -> None:
    st.title("Ticket Medio")

    header_col1, header_col2, header_col3 = st.columns([3, 2, 1])
    with header_col1:
        st.caption("Analise de honorarios por tese juridica — Processos Arquivados · Advbox CRM")
    with header_col3:
        if st.button("Atualizar dados do Advbox", key="atualizar_ticket_medio"):
            carregar_processos_advbox.clear()

    api_key = _get_env_or_secret("ADVBOX_API_KEY") or _get_env_or_secret("ADVBOX_TOKEN")
    base_url = _get_env_or_secret("ADVBOX_API_URL", "https://app.advbox.com.br/api/v1")

    if not api_key:
        st.info("ℹ️ AMOSTRA: Estes dados são sintéticos. Configure ADVBOX_API_KEY para consultar o Advbox.")
        processos = gerar_dados_amostra()
    else:
        try:
            with st.spinner("Consultando processos do Advbox..."):
                processos = carregar_processos_advbox(api_key, base_url)
        except IntegrationError as error:
            st.error(str(error))
            return

    dataframe = pd.DataFrame(processos)
    if dataframe.empty:
        st.warning("A API do Advbox nao retornou processos.")
        return

    kpis = calcular_kpis(dataframe)

    col_eficiencia, col_spacer = st.columns([1, 4])
    with col_eficiencia:
        if kpis["eficiencia"] is not None:
            eficiencia_pct = f"{kpis['eficiencia']:.0%}"
            st.markdown(
                f"""
                <div style='text-align: center; padding: 1.5rem 1rem;'>
                    <div style='background: #2ecb72; border-radius: 50%; width: 120px; height: 120px;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto;'>
                        <div style='font-size: 2.5rem; font-weight: 800; color: white;'>{eficiencia_pct}</div>
                    </div>
                    <div style='margin-top: 0.8rem; font-size: 0.7rem; font-weight: 700;
                    letter-spacing: 0.12rem; text-transform: uppercase; color: rgba(237,244,255,0.72);'>
                        Eficiencia
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown("<div style='margin: 1.5rem 0;'></div>", unsafe_allow_html=True)

    kpis_data = [
        ("Processos", f"{kpis['processos']:,}".replace(",", "."), "Total arquivados"),
        ("Pendentes", f"{kpis['pendentes']:,}".replace(",", "."), "Em andamento"),
        ("Ticket Médio", _formatar_reais(kpis["ticket_medio"]), "Média dos honorários"),
        ("Base Comercial", _formatar_reais(kpis["ticket_base"]), "Média valor da causa"),
        ("Expectativa", _formatar_reais(kpis["expectativa"]), "Honorários em aberto"),
        ("Prejuízo Pot.", _formatar_reais(kpis["prejuizo"]), "Honorários perdidos"),
    ]

    for row in range(2):
        kpi_cols = st.columns(3)
        for col in range(3):
            idx = row * 3 + col
            if idx < len(kpis_data):
                label, value, sublabel = kpis_data[idx]
                with kpi_cols[col]:
                    st.markdown(
                        f"""
                        <div style='background: rgba(14, 31, 50, 0.9); border: 1px solid rgba(124, 170, 216, 0.22);
                        border-radius: 12px; padding: 1.1rem 1.2rem;'>
                            <div style='color: rgba(237,244,255,0.7); font-size: 0.7rem; font-weight: 700;
                            letter-spacing: 0.12rem; text-transform: uppercase; margin-bottom: 0.5rem;'>
                                {label}
                            </div>
                            <div style='color: #edf4ff; font-size: 1.3rem; font-weight: 800; line-height: 1.1;
                            margin-bottom: 0.25rem;'>
                                {value}
                            </div>
                            <div style='color: rgba(237,244,255,0.6); font-size: 0.7rem;'>
                                {sublabel}
                            </div>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

    st.markdown("<div style='margin: 2rem 0; border-top: 1px solid rgba(124, 170, 216, 0.22);'></div>", unsafe_allow_html=True)

    tese_coluna, resultado_coluna = st.columns([3, 2])

    with tese_coluna:
        st.markdown("<div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;'>"
                   "<span style='font-size: 1.2rem;'>📋</span>"
                   "<span style='font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08rem; "
                   "text-transform: uppercase; color: rgba(237,244,255,0.7);'>Ticket por tese juridica</span>"
                   "</div>", unsafe_allow_html=True)
        tabela = tabela_por_tese(dataframe)
        if not tabela.empty:
            tabela_display = tabela.copy()
            tabela_display.index = range(10, 10 + len(tabela_display))
            tabela_display["Ticket Médio"] = tabela_display["Ticket Médio"].map(_formatar_reais)
            tabela_display["Taxa de Êxito"] = tabela_display["Taxa de Êxito"].map(
                lambda valor: f"{valor:.0%}" if isinstance(valor, (float, int)) else "—"
            )
            st.dataframe(
                tabela_display,
                use_container_width=True,
                hide_index=False,
                column_config={
                    "Tese": st.column_config.TextColumn(width="medium"),
                    "Ticket Médio": st.column_config.TextColumn(width="small"),
                    "Taxa de Êxito": st.column_config.TextColumn(width="small"),
                }
            )
        else:
            st.info("A resposta da API nao contem dados de tese e honorarios para montar a tabela.")

    with resultado_coluna:
        st.markdown("<div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;'>"
                   "<span style='font-size: 1.2rem;'>🎯</span>"
                   "<span style='font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08rem; "
                   "text-transform: uppercase; color: rgba(237,244,255,0.7);'>Resultado dos processos</span>"
                   "</div>", unsafe_allow_html=True)
        resultados = distribuicao_resultado(dataframe)
        if not resultados.empty:
            cores = alt.Scale(
                domain=["GANHO", "PERDIDO", "EM ANDAMENTO"],
                range=["#2ecb72", "#e94f3d", "#3598db"],
            )
            grafico_resultado = (
                alt.Chart(resultados)
                .mark_arc(innerRadius=72)
                .encode(
                    theta=alt.Theta("Quantidade:Q"),
                    color=alt.Color("Status:N", scale=cores, legend=alt.Legend(title=None, orient="bottom")),
                    tooltip=["Status:N", "Quantidade:Q"],
                )
                .properties(height=300)
            )
            st.altair_chart(grafico_resultado, use_container_width=True)
        else:
            st.info("A API nao fornece status de resultado para este grafico.")

    st.markdown("<div style='margin: 2rem 0; border-top: 1px solid rgba(124, 170, 216, 0.22);'></div>", unsafe_allow_html=True)

    faixas = distribuicao_por_faixa(dataframe)
    if not faixas.empty:
        st.markdown("<div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;'>"
                   "<span style='font-size: 1.2rem;'>💼</span>"
                   "<span style='font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08rem; "
                   "text-transform: uppercase; color: rgba(237,244,255,0.7);'>Distribuicao por faixa de ticket</span>"
                   "</div>", unsafe_allow_html=True)
        grafico_faixa = (
            alt.Chart(faixas)
            .mark_bar(color="#3598db")
            .encode(
                x=alt.X("Faixa:N", axis=alt.Axis(labelFontSize=10)),
                y=alt.Y("Quantidade:Q", axis=alt.Axis(labelFontSize=10)),
                tooltip=["Faixa:N", "Quantidade:Q"],
            )
            .properties(height=250)
        )
        st.altair_chart(grafico_faixa, use_container_width=True)

    st.markdown("<div style='margin: 1.5rem 0;'></div>", unsafe_allow_html=True)

    valor_fase_coluna, quantidade_fase_coluna = st.columns(2)

    with valor_fase_coluna:
        st.markdown("<div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;'>"
                   "<span style='font-size: 1.2rem;'>💰</span>"
                   "<span style='font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08rem; "
                   "text-transform: uppercase; color: rgba(237,244,255,0.7);'>Expectativa por fase</span>"
                   "</div>", unsafe_allow_html=True)
        valores_fase = valores_por_fase(dataframe, kpis["ticket_medio"])
        if not valores_fase.empty:
            valores_fase_display = valores_fase.set_index("Fase")
            grafico_valor = (
                alt.Chart(valores_fase.reset_index())
                .mark_bar(color="#2ecb72")
                .encode(
                    y=alt.Y("Fase:N", sort="-x", axis=alt.Axis(labelFontSize=11)),
                    x=alt.X("Expectativa (R$):Q", axis=alt.Axis(labelFontSize=10)),
                    tooltip=["Fase:N", alt.Tooltip("Expectativa (R$):Q", format="R$ ,.0f")],
                )
                .properties(height=250)
            )
            st.altair_chart(grafico_valor, use_container_width=True)
        else:
            st.info("Dados insuficientes para exibir expectativa por fase.")

    with quantidade_fase_coluna:
        st.markdown("<div style='display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;'>"
                   "<span style='font-size: 1.2rem;'>📊</span>"
                   "<span style='font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08rem; "
                   "text-transform: uppercase; color: rgba(237,244,255,0.7);'>Processos por fase</span>"
                   "</div>", unsafe_allow_html=True)
        fases = processos_por_fase(dataframe)
        if not fases.empty:
            grafico_fase = (
                alt.Chart(fases)
                .mark_bar(color="#00bde8")
                .encode(
                    y=alt.Y("Fase:N", sort="-x", axis=alt.Axis(labelFontSize=11)),
                    x=alt.X("Quantidade:Q", axis=alt.Axis(labelFontSize=10)),
                    tooltip=["Fase:N", "Quantidade:Q"],
                )
                .properties(height=250)
            )
            st.altair_chart(grafico_fase, use_container_width=True)
        else:
            st.info("Nenhum processo com numero CNJ valido foi encontrado.")


def exibir_contadoria() -> None:
    st.title("Contadoria")
    st.caption("Acompanhamento de calculos, recebimentos e conciliacoes | dados demonstrativos")
    calculos, conciliacoes, divergencias = st.columns(3)
    calculos.metric("Calculos em revisao", "16", "+4 nesta semana")
    conciliacoes.metric("Conciliacoes pendentes", "5", "-1 hoje")
    divergencias.metric("Divergencias identificadas", "2", "Requer atencao")

    st.subheader("Agenda da contadoria")
    agenda = pd.DataFrame(
        [
            {"Prazo": (date.today() + timedelta(days=1)).strftime("%d/%m/%Y"), "Processo": "0001452-31.2026", "Etapa": "Conferencia final", "Responsavel": "Equipe de calculos"},
            {"Prazo": (date.today() + timedelta(days=3)).strftime("%d/%m/%Y"), "Processo": "0000984-72.2026", "Etapa": "Atualizacao de indices", "Responsavel": "Contadoria"},
            {"Prazo": (date.today() + timedelta(days=5)).strftime("%d/%m/%Y"), "Processo": "0002109-54.2026", "Etapa": "Emissao de relatorio", "Responsavel": "Financeiro"},
        ]
    )
    st.dataframe(agenda, use_container_width=True, hide_index=True)

    if st.button("Consultar pagamentos recentes do Asaas"):
        try:
            pagamentos = AsaasClient().list_payments()
        except IntegrationError:
            st.info("A integracao Asaas ainda nao esta configurada. Exibindo dados demonstrativos.")
            pagamentos = [
                {"id": "pay_demo_001", "value": 18400.00, "status": "RECEIVED", "dueDate": "2026-09-28", "paymentDate": "2026-09-27"},
                {"id": "pay_demo_002", "value": 24900.00, "status": "PENDING", "dueDate": "2026-10-03", "paymentDate": None},
            ]
        dataframe = pd.DataFrame(pagamentos)
        colunas = [coluna for coluna in ["id", "value", "status", "dueDate", "paymentDate"] if coluna in dataframe.columns]
        st.dataframe(dataframe[colunas], use_container_width=True, hide_index=True)


def exibir_processos() -> None:
    """MVP: Exibe número de processos em andamento lido da planilha."""
    st.title("Processos em Andamento")
    st.caption("Dados sincronizados do Advbox via planilha — Teste de Integração")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("🔄 Atualizar dados do Advbox", key="atualizar_excel"):
            api_key = _get_env_or_secret("ADVBOX_API_KEY") or _get_env_or_secret("ADVBOX_TOKEN")
            if not api_key:
                st.error("ADVBOX_API_KEY não configurada nos secrets/env")
            else:
                try:
                    with st.spinner("Exportando dados do Advbox para planilha..."):
                        resultado = exportar_agora(api_key)
                    st.success(f"✅ Atualizado com sucesso!")
                    st.json(resultado)
                except Exception as e:
                    st.error(f"❌ Erro: {str(e)}")

    with col2:
        st.write("")

    st.markdown("<div style='margin: 2rem 0; border-top: 1px solid rgba(124, 170, 216, 0.22);'></div>", unsafe_allow_html=True)

    dados = ler_dados_excel()

    col_m, col_t, col_a = st.columns(3)
    with col_m:
        st.metric("Processos em Andamento", dados["processos_em_andamento"], "Lido da planilha")
    with col_t:
        st.metric("Total de Processos", dados["total_processos"], "Histórico")
    with col_a:
        st.metric("Última Atualização", dados["atualizado_em"], "Status")

    st.markdown("<div style='margin: 1.5rem 0;'></div>", unsafe_allow_html=True)

    st.info("ℹ️ Este é o teste MVP (Mínimo Viável) da integração:\n\n"
            "1. Clique em 'Atualizar dados do Advbox'\n"
            "2. Os dados serão salvos em `hub-escritorio/data/TICKET.xlsx`\n"
            "3. Os valores acima são lidos dessa planilha\n\n"
            "Se isso funcionar, escalamos para mais dados e fórmulas!")


def exibir_configuracoes() -> None:
    st.title("Configuracoes")
    st.subheader("Conta")
    user_info = st.session_state.get("user_info", {})
    usuario = st.session_state.get("usuario", "")
    perfil, dados = st.columns([1, 5])
    with perfil:
        foto = user_info.get("picture")
        if foto:
            st.image(foto, width=76)
        else:
            st.markdown("<div class='brand-monogram'>C</div>", unsafe_allow_html=True)
    with dados:
        st.write(f"**{user_info.get('name', 'Administrador')}**")
        st.caption(usuario)
        st.caption("Conta autenticada via Google")

    st.divider()
    st.subheader("Seguranca")
    st.caption("A senha e os dados de perfil sao gerenciados pela conta Google conectada.")
    st.link_button("Gerenciar conta Google", "https://myaccount.google.com/security", use_container_width=False)
    st.divider()
    if st.button("Sair do aplicativo", type="primary"):
        if AUTHENTICATOR and st.session_state.get("connected", False):
            AUTHENTICATOR.logout()
        st.session_state.clear()
        st.rerun()


if verificar_seguranca():
    st.markdown(
        """<style>
        .stApp { background-image: none !important; background-color: #f6f7f4 !important; color: #1f2945 !important; }
        .stApp h1, .stApp h2, .stApp h3 { color: #2e3a62 !important; }
        </style>""",
        unsafe_allow_html=True,
    )
    marca_lateral()
    st.sidebar.caption("GOVERNANCA DO ESCRITORIO")
    st.sidebar.success(f"Conectado como:\n**{st.session_state['usuario']}**")
    st.sidebar.caption("NAVEGACAO PRINCIPAL")
    opcoes_menu = ["Dashboard", "Tickets", "Ticket Médio", "Contadoria", "Configuracoes"]
    if st.session_state.get("menu_atual") not in opcoes_menu:
        st.session_state["menu_atual"] = "Tickets"

    for opcao in opcoes_menu:
        icone = {"Dashboard": "▦", "Tickets": "◫", "Ticket Médio": "◊", "Contadoria": "▤", "Configuracoes": "⚙"}[opcao]
        rotulo = f"{icone}  {opcao}"
        if st.sidebar.button(rotulo, key=f"menu_{opcao}", type="primary" if st.session_state["menu_atual"] == opcao else "secondary"):
            st.session_state["menu_atual"] = opcao
            st.rerun()

    menu = st.session_state["menu_atual"]
    cabecalho_painel()

    if menu == "Processos":
        exibir_processos()
    elif menu == "Dashboard":
        exibir_dashboard()
    elif menu == "Tickets":
        exibir_tickets()
    elif menu == "Ticket Médio":
        exibir_ticket_medio()
    elif menu == "Contadoria":
        exibir_contadoria()
    else:
        exibir_configuracoes()