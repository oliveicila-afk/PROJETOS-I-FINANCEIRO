import streamlit as st
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOGO_PATH = PROJECT_ROOT / "assets" / "logo-calandrini.png"
TEAM_IMAGE_PATH = PROJECT_ROOT / "assets" / "equipe-calandrini.jpg"

st.set_page_config(
    page_title="Hub Escritório Calandrini",
    page_icon="🎯",
    layout="wide",
)

# CSS customizado
st.markdown("""
<style>
    body {
        background-color: #f5f5f5;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    .header-section {
        background: linear-gradient(135deg, #2e3a62 0%, #202a4a 100%);
        padding: 40px 20px;
        border-radius: 10px;
        color: white;
        margin-bottom: 30px;
        display: flex;
        align-items: center;
        gap: 20px;
    }
    .logo {
        width: 80px;
        height: 80px;
    }
    .header-text h1 {
        margin: 0;
        font-size: 2.5em;
        color: white;
    }
    .header-text p {
        margin: 5px 0 0 0;
        font-size: 1.2em;
        color: #b39868;
    }
    .success-box {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 20px;
    }
    .link-box {
        background-color: #f8f9fa;
        border-left: 4px solid #b39868;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        font-family: 'Courier New', monospace;
        overflow-x: auto;
    }
    .team-image {
        width: 100%;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
</style>
""", unsafe_allow_html=True)

# Header com logo
col1, col2 = st.columns([0.15, 0.85])
with col1:
    try:
        st.image(str(LOGO_PATH), width=80)
    except:
        st.write("🎯")

with col2:
    st.markdown("""
    <div class="header-text">
        <h1>Hub Escritório Calandrini</h1>
        <p>Aplicação Financeira e Estratégica</p>
    </div>
    """, unsafe_allow_html=True)

# Status
st.markdown("""
<div class="success-box">
    ✅ <strong>App online no Streamlit Cloud!</strong>
</div>
""", unsafe_allow_html=True)

# Bem-vindo
st.markdown("## Bem-vindo!")
st.write("Esta é a versão de teste do Hub Escritório Calandrini.")

# Link para compartilhar
st.markdown("### Link para compartilhar:")
st.markdown("""
<div class="link-box">
https://projetos-i-financeiro-hdsnguqqc2z4lwmmvbalwc.streamlit.app
</div>
""", unsafe_allow_html=True)

# Próximas funcionalidades
st.markdown("### Próximas funcionalidades:")
col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    - 🔐 Login com Google OAuth
    - 💾 Banco de dados integrado
    """)

with col2:
    st.markdown("""
    - 📊 Dashboard financeiro
    - 🔗 Integrações com APIs
    """)

# Equipe
st.markdown("---")
st.markdown("## Nosso Time")
try:
    st.image(str(TEAM_IMAGE_PATH), caption="Equipe Calandrini - Advogados Associados")
except:
    st.info("Foto da equipe não disponível")

st.markdown("""
Somos um escritório especializado em soluções financeiras e estratégicas para empresas.

**Contato:** info@calandrini.com.br
""")
