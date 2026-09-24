# Crossell Financeiro

Projeto dedicado exclusivamente a automacao de triagem financeira descrita no documento de requisitos do AdvBox.

O fluxo classifica os casos, encaminha oportunidades para Fabio ou Leticia, trata anexos de contracheque e extrato, sinaliza demandas com possivel pagamento inicial e prepara o relatorio diario `CROSSELL - AUTOMAÇÃO`.

## Integração com AdvBox

A partir da versão 0.2.0, o projeto integra-se nativamente com a API do AdvBox para:
- ✅ Buscar demandas por período de data
- ✅ Verificar agendas do Fábio e Leticia
- ✅ Atribuir demandas automaticamente
- ✅ Gerar relatórios de revisão

### Configuração

1. Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Preencha as variáveis de ambiente:
```bash
ADVBOX_API_URL=https://app.advbox.com.br/api/v1
ADVBOX_TOKEN=seu_token_aqui
```

### Uso da CLI

#### Revisar demandas entre datas
```bash
npm run cli -- review-period 2026-09-14 2026-09-17
```

#### Ver agenda do Fábio
```bash
npm run cli -- fabio-schedule
```

#### Ver agenda da Leticia
```bash
npm run cli -- leticia-schedule
```

#### Ver demandas ativas do Fábio
```bash
npm run cli -- fabio-demands
```

#### Ver demandas ativas da Leticia
```bash
npm run cli -- leticia-demands
```

#### Atribuir demanda para Fábio
```bash
npm run cli -- assign-to-fabio <lawsuit-id>
```

#### Atribuir demanda para Leticia
```bash
npm run cli -- assign-to-leticia <lawsuit-id>
```

## Fluxo do projeto

1. Receber os casos financeiros e os documentos disponiveis.
2. Classificar cada caso como oportunidade, acao bancaria, sem oportunidade ou ambiguo.
3. Considerar somente tarefas do time financeiro identificadas pelos usuarios Gabriele Nascimento, Kássia Lorena Goudinho Nunes ou Priscila de Oliveira dos Santos.
4. Encaminhar oportunidades e acoes bancarias para Fabio ou Leticia.
5. Marcar como urgente e importante os casos com indicio de pagamento inicial.
6. Ignorar notas que informam `Novas oportunidades: Nenhuma` ou que nao identificam nenhuma nova oportunidade.
7. Quando a nota negar uma demanda, revisar a pasta do cliente no Gmail/Drive e as notas do SAC antes de encerrar o caso.
8. Gerar o relatorio diario completo, com detalhes somente dos casos ambiguos.
9. Revisar, em cada disparo, o intervalo entre o ultimo disparo e o atual, inclusive quando atravessar a meia-noite.

Ao encaminhar uma tarefa, o sistema usa uma nota padrao e nao copia o texto da tarefa analisada. Para acao bancaria, a nota contem o marcador do contracheque; para oportunidade, informa `Identificada novas oportunidades para fechamento`.

Se a nota disser que nao existe demanda, mas a revisao de Gmail/Drive e SAC ainda nao tiver sido realizada, o caso permanece ambiguo para revisao e nao e descartado.

## Skills operacionais

Os procedimentos detalhados ficam em `.claude/skills/`:

- `revisar-sem-oportunidade-advbox`: revisa contracheques e extratos no Google Drive, registra evidencias, anexa documentos e encaminha quando houver sinal de demanda bancaria.
- `verificar-cliente-sac-sellflux`: revisa o historico do cliente no SAC do SellFlux antes de concluir um caso sem oportunidade.

## Executar

```powershell
npm.cmd install
npm.cmd run build
npm.cmd test
```

As integracoes reais com AdvBox e e-mail devem ser conectadas somente depois da confirmacao dos contratos externos.