@echo off
chcp 65001 >nul
cd /d "C:\Financeiro I Calandrini I IA\PROJETOS I FINANCEIRO"
echo.
echo === Crossel I Financeiro - Git Push ===
echo.
echo [1/3] Verificando status...
git status
echo.
echo [2/3] Adicionando arquivos...
git add python-impl/
echo.
echo [3/3] Fazendo commit e push...
git commit -m "Adicionar implementação Python da automação de triagem

- Script Python: revisar_sem_oportunidade.py
- Workflow GitHub Actions: revisar_workflow.yml
- Documentação completa da implementação"
git push origin main
echo.
echo === Pronto! Repositório atualizado no GitHub ===
echo.
pause
