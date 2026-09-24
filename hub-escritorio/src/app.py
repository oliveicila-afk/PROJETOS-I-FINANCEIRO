import base64
import hmac
import os
import secrets
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import requests
import streamlit as st
# from google_auth_oauthlib.flow import Flow
# from oauthlib.oauth2.rfc6749.errors import OAuth2Error
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from database import initialize_database, listar_previsoes, salvar_previsao
from integracoes.advbox_asaas import AsaasClient, IntegrationError

st.set_page_config(
    page_title="Hub Financeiro e Estrategico",
    page_icon="C",
    layout="wide",
)

initialize_database()

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
AUTHORIZED_EMAILS = {
    email.strip().lower()
    for email in os.getenv("AUTHORIZED_EMAILS", "").replace(";", ",").split(",")
    if email.strip()
}
if ADMIN_EMAIL:
    AUTHORIZED_EMAILS.add(ADMIN_EMAIL.strip().lower())
APP_ACCESS_PASSWORD = os.getenv("APP_ACCESS_PASSWORD", "")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
GOOGLE_CREDENTIALS_PATH = PROJECT_ROOT / os.getenv("GOOGLE_OAUTH_CREDENTIALS_PATH", "google_credentials.json")
GOOGLE_COOKIE_KEY = os.getenv("GOOGLE_OAUTH_COOKIE_KEY", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8501")
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

        .stApp { background-color: #101e34; background-position: right center; background-repeat: no-repeat; background-size: 50% 100%; color: #f8f7f3; font-family: 'DM Sans', sans-serif; }
        #MainMenu, footer, header { visibility: hidden; }
        .block-container { max-width: 1360px; padding: 2.4rem 3.2rem 3.5rem; position: relative; z-index: 1; }
        h1, h2, h3 { font-family: 'Cormorant Garamond', serif !important; color: #ffffff !important; }
        h1 { font-size: 2.65rem !important; font-weight: 600 !important; letter-spacing: 0 !important; }
        h2 { font-size: 2rem !important; font-weight: 600 !important; }
        h3 { font-size: 1.5rem !important; }
        p, label, [data-testid="stMarkdownContainer"] { letter-spacing: 0 !important; }

        [data-testid="stSidebar"] { background: #171f38; border-right: 1px solid rgba(179,152,104,.55); }
        [data-testid="stSidebar"] * { color: #f8f7f3 !important; }
        [data-testid="stSidebar"] [data-baseweb="select"] > div { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); }
        [data-testid="stSidebar"] .stAlert { background: rgba(179,152,104,.16); border: 1px solid rgba(179,152,104,.45); }
        [data-testid="stSidebar"] [data-testid="stButton"] > button { width: 100%; justify-content: flex-start; background: transparent; border: 1px solid transparent; border-radius: 3px; color: #f8f7f3; box-shadow: none; padding: .55rem .7rem; }
        [data-testid="stSidebar"] [data-testid="stButton"] > button:hover { background: rgba(179,152,104,.16); border-color: rgba(179,152,104,.5); color: #ffffff; }

        [data-testid="stMetric"] { background: #fdfdfb; border: 1px solid rgba(179,152,104,.7); border-top: 4px solid var(--gold); border-radius: 3px; padding: 1.15rem 1.25rem; min-height: 122px; box-shadow: 0 10px 22px rgba(7,12,29,.14); }
        [data-testid="stMetricLabel"] { color: #5f6574; font-size: .82rem; font-weight: 700; text-transform: uppercase; }
        [data-testid="stMetricValue"] { color: var(--navy); font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; }
        [data-testid="stMetricDelta"] svg { fill: #2e7d5b; }

        .stButton > button, [data-testid="stFormSubmitButton"] > button { background: var(--gold); border: 1px solid var(--gold); border-radius: 3px; color: var(--navy-deep); font-family: 'DM Sans', sans-serif; font-weight: 700; min-height: 2.65rem; }
        .stButton > button:hover, [data-testid="stFormSubmitButton"] > button:hover { background: #d1b887; border-color: #d1b887; color: var(--navy-deep); }
        [data-testid="stTextInput"] input, [data-baseweb="select"] > div, [data-testid="stDateInput"] input, [data-testid="stNumberInput"] input { background: #fff; border-color: #c7c1b5; border-radius: 4px; }
        [data-testid="stDataFrame"] { border: 1px solid rgba(179,152,104,.75); border-radius: 3px; overflow: hidden; background: white; }
        details { background: #fff; border: 1px solid rgba(179,152,104,.75); border-radius: 3px; color: var(--ink); max-width: 390px; }
        [data-testid="stAlert"] { border-radius: 3px; }

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
    scopes = ["openid", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"]

    def __init__(self, credentials_path: Path, redirect_uri: str, state_secret: str) -> None:
        self.credentials_path = credentials_path
        self.redirect_uri = redirect_uri
        self.state_serializer = URLSafeTimedSerializer(state_secret, salt="hub-escritorio-oauth")

    def _flow(self, *, state: str | None = None) -> Flow:
        return Flow.from_client_secrets_file(
            str(self.credentials_path),
            scopes=self.scopes,
            redirect_uri=self.redirect_uri,
            state=state,
            autogenerate_code_verifier=False,
        )

    def check_authentification(self) -> None:
        if st.session_state.get("connected", False):
            return

        authorization_code = st.query_params.get("code")
        if not authorization_code:
            return

        received_state = st.query_params.get("state")
        try:
            self.state_serializer.loads(str(received_state), max_age=600)
        except (BadSignature, SignatureExpired):
            st.query_params.clear()
            st.error("A tentativa de login expirou ou nao pode ser validada. Inicie novamente.")
            return

        try:
            flow = self._flow(state=str(received_state))
            flow.fetch_token(code=authorization_code)
            response = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {flow.credentials.token}"},
                timeout=15,
            )
            response.raise_for_status()
            user_info = response.json()
        except (OAuth2Error, requests.RequestException):
            st.query_params.clear()
            st.error("Nao foi possivel concluir o login Google. Tente novamente.")
            return

        st.session_state["connected"] = True
        st.session_state["user_info"] = user_info
        st.query_params.clear()
        st.rerun()

    def login(self, *, justify_content: str = "flex-start") -> None:
        if st.session_state.get("connected", False):
            return

        state = self.state_serializer.dumps({"nonce": secrets.token_urlsafe(24)})
        flow = self._flow(state=state)
        authorization_url, _ = flow.authorization_url(include_granted_scopes="true")
        st.markdown(
            f"<div style='display:flex;justify-content:{justify_content};'>"
            f"<a href='{authorization_url}' target='_self' style='background:#fff;color:#1f2945;border:1px solid #b39868;"
            "border-radius:3px;padding:10px 16px;font-weight:700;text-decoration:none;box-shadow:0 8px 18px rgba(7,12,29,.2);'>"
            "Continuar com Google</a></div>",
            unsafe_allow_html=True,
        )

    def logout(self) -> None:
        st.session_state.pop("connected", None)
        st.session_state.pop("user_info", None)


def criar_autenticador_google() -> GoogleAuthenticator | None:
    if (
        not GOOGLE_CREDENTIALS_PATH.is_file()
        or not GOOGLE_COOKIE_KEY
        or GOOGLE_COOKIE_KEY == "defina_uma_chave_aleatoria_longa"
    ):
        return None
    return GoogleAuthenticator(GOOGLE_CREDENTIALS_PATH, GOOGLE_REDIRECT_URI, GOOGLE_COOKIE_KEY)


AUTHENTICATOR = criar_autenticador_google()


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
        if AUTHENTICATOR:
            st.markdown("<div class='login-actions'>", unsafe_allow_html=True)
            AUTHENTICATOR.login(justify_content="flex-start")
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            st.info("Configure as credenciais OAuth do Google para habilitar o login com Google.")

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


def previsoes_dataframe() -> pd.DataFrame:
    previsoes = listar_previsoes()
    return pd.DataFrame(
        [
            {
                "Processo": previsao.processo,
                "Banco": previsao.banco,
                "Tese": previsao.tese,
                "Data prevista": previsao.data_prevista,
                "Competencia": previsao.competencia,
                "Bruto (R$)": previsao.valor_bruto,
                "Liquido (R$)": previsao.valor_liquido,
            }
            for previsao in previsoes
        ]
    )


def formatar_moeda(valor: float) -> str:
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def email_autorizado(email: str) -> bool:
    email_normalizado = email.strip().lower()
    return any(hmac.compare_digest(email_normalizado, autorizado) for autorizado in AUTHORIZED_EMAILS)


def exibir_dashboard() -> None:
    st.title("Dashboard")
    st.caption("Visao executiva do escritorio | dados demonstrativos")
    previsoes = listar_previsoes()
    total_previsto = sum(previsao.valor_liquido for previsao in previsoes) or 186_450.00
    total_bruto = sum(previsao.valor_bruto for previsao in previsoes) or 248_900.00
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
    dataframe = previsoes_dataframe()
    if dataframe.empty:
        dataframe = pd.DataFrame(
            [
                {"Processo": "0001452-31.2026", "Banco": "Banco do Brasil", "Tese": "Progressao funcional", "Data prevista": "30/09/2026", "Competencia": "Setembro/2026", "Bruto (R$)": 42_000.00, "Liquido (R$)": 12_600.00},
                {"Processo": "0000984-72.2026", "Banco": "Caixa Economica", "Tese": "Diferencas salariais", "Data prevista": "08/10/2026", "Competencia": "Outubro/2026", "Bruto (R$)": 35_800.00, "Liquido (R$)": 10_740.00},
            ]
        )
    st.dataframe(dataframe, use_container_width=True, hide_index=True)


def exibir_tickets() -> None:
    st.title("Tickets")
    st.caption("Solicitacoes e acompanhamentos internos | dados demonstrativos")
    tickets = pd.DataFrame(
        [
            {"Ticket": "#1048", "Assunto": "Conferencia de calculo", "Responsavel": "Contadoria", "Prioridade": "Alta", "Status": "Em analise", "Atualizado": "Hoje, 10:30"},
            {"Ticket": "#1042", "Assunto": "Documentacao pendente", "Responsavel": "Juridico", "Prioridade": "Media", "Status": "Aguardando cliente", "Atualizado": "Ontem, 16:20"},
            {"Ticket": "#1039", "Assunto": "Validacao de repasse", "Responsavel": "Financeiro", "Prioridade": "Alta", "Status": "Em andamento", "Atualizado": "Ontem, 11:15"},
            {"Ticket": "#1031", "Assunto": "Atualizacao cadastral", "Responsavel": "Administrativo", "Prioridade": "Baixa", "Status": "Concluido", "Atualizado": "18 Set"},
        ]
    )
    aberto, andamento, concluido = st.columns(3)
    aberto.metric("Abertos", "12", "+3 hoje")
    andamento.metric("Em andamento", "8", "2 prioritarios")
    concluido.metric("Concluidos", "24", "+6 na semana")
    st.dataframe(tickets, use_container_width=True, hide_index=True)


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
    opcoes_menu = ["Dashboard", "Tickets", "Contadoria", "Configuracoes"]
    if "menu_atual" not in st.session_state:
        st.session_state["menu_atual"] = "Dashboard"

    for opcao in opcoes_menu:
        icone = {"Dashboard": "▦", "Tickets": "◫", "Contadoria": "▤", "Configuracoes": "⚙"}[opcao]
        rotulo = f"{icone}  {opcao}"
        if st.sidebar.button(rotulo, key=f"menu_{opcao}", type="primary" if st.session_state["menu_atual"] == opcao else "secondary"):
            st.session_state["menu_atual"] = opcao
            st.rerun()

    menu = st.session_state["menu_atual"]
    cabecalho_painel()

    if menu == "Dashboard":
        exibir_dashboard()
    elif menu == "Tickets":
        exibir_tickets()
    elif menu == "Contadoria":
        exibir_contadoria()
    else:
        exibir_configuracoes()