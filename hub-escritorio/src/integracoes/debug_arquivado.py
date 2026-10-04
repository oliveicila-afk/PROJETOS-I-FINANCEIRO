"""Debug detalhado para entender o critério correto de arquivado."""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from .advbox_asaas import AdvboxClient

# Carregar .env
project_root = Path(__file__).resolve().parents[2]
load_dotenv(project_root / ".env")

api_key = os.getenv("ADVBOX_API_KEY") or os.getenv("ADVBOX_TOKEN")
base_url = os.getenv("ADVBOX_API_URL", "https://app.advbox.com.br/api/v1")

if not api_key:
    print("❌ ADVBOX_API_KEY não configurada")
    exit(1)

client = AdvboxClient(api_key=api_key, base_url=base_url)
processos = client.list_lawsuits()

print("=" * 100)
print("ANÁLISE DE PROCESSOS ARQUIVADOS")
print("=" * 100)

# Separar por critérios
com_arquiv_no_stage = []
com_status_closure = []
ambos = []
nenhum = []

for p in processos:
    stage = str(p.get("stage", "")).upper()
    status_closure = p.get("status_closure")
    process_number = p.get("process_number")

    tem_arquiv = "ARQUIV" in stage
    tem_closure = bool(status_closure)

    if tem_arquiv and tem_closure:
        ambos.append(p)
    elif tem_arquiv:
        com_arquiv_no_stage.append(p)
    elif tem_closure:
        com_status_closure.append(p)
    else:
        nenhum.append(p)

print(f"\n📊 CONTAGEM:")
print(f"  Com 'ARQUIV' no stage: {len(com_arquiv_no_stage)}")
print(f"  Com status_closure preenchido: {len(com_status_closure)}")
print(f"  Com AMBOS: {len(ambos)}")
print(f"  Com NENHUM: {len(nenhum)}")

print(f"\n📋 EXEMPLOS COM 'ARQUIV' NO STAGE:")
for i, p in enumerate(com_arquiv_no_stage[:3]):
    print(f"\n  Exemplo {i+1}:")
    print(f"    process_number: {p.get('process_number')}")
    print(f"    stage: {p.get('stage')}")
    print(f"    status_closure: {p.get('status_closure')}")
    print(f"    step: {p.get('step')}")

print(f"\n📋 EXEMPLOS COM status_closure PREENCHIDO:")
for i, p in enumerate(com_status_closure[:3]):
    print(f"\n  Exemplo {i+1}:")
    print(f"    process_number: {p.get('process_number')}")
    print(f"    stage: {p.get('stage')}")
    print(f"    status_closure: {p.get('status_closure')}")
    print(f"    step: {p.get('step')}")

print(f"\n📋 EXEMPLOS COM AMBOS:")
for i, p in enumerate(ambos[:3]):
    print(f"\n  Exemplo {i+1}:")
    print(f"    process_number: {p.get('process_number')}")
    print(f"    stage: {p.get('stage')}")
    print(f"    status_closure: {p.get('status_closure')}")
    print(f"    step: {p.get('step')}")

print("\n" + "=" * 100)
print("CONCLUSÃO: Qual critério usar para 'ARQUIVADO'?")
print("=" * 100)
