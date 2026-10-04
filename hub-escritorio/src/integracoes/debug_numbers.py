"""Debug script para ver exemplos reais de numbers do Advbox."""

import os
from pathlib import Path
from dotenv import load_dotenv
from advbox_asaas import AdvboxClient

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

print(f"Total de processos: {len(processos)}\n")
print("Primeiros 20 exemplos de process_number:\n")

for i, p in enumerate(processos[:20]):
    process_number = p.get("process_number", "N/A")
    print(f"{i+1}. '{process_number}' (tipo: {type(process_number).__name__})")

print("\n\nProcessos que NÃO têm número CNJ padrão (7 dígitos):\n")

import re
cnj_pattern = re.compile(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}")

invalid_count = 0
for p in processos:
    process_number = str(p.get("process_number", ""))
    if not cnj_pattern.search(process_number) and process_number.strip():
        invalid_count += 1
        if invalid_count <= 20:
            print(f"{invalid_count}. '{process_number}'")

print(f"\n... Total de números inválidos: {invalid_count}")
