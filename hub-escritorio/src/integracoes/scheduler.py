"""Scheduler para sincronizar Advbox com Excel automaticamente."""

import os
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .excel_export import exportar_agora

logger = logging.getLogger(__name__)

# Armazenar a instância do scheduler
_scheduler = None


def iniciar_scheduler():
    """Inicia o scheduler de sincronização automática."""
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        logger.info("Scheduler ja esta rodando")
        return

    _scheduler = BackgroundScheduler()

    # Agendar tarefa para todo dia às 7h da manhã
    _scheduler.add_job(
        func=_sincronizar_advbox,
        trigger=CronTrigger(hour=7, minute=0),
        id='sync_advbox',
        name='Sincronizar Advbox com Excel (Diariamente às 7h)',
        replace_existing=True
    )

    _scheduler.start()
    logger.info("Scheduler iniciado - sincronizacao diaria as 7h da manha")


def parar_scheduler():
    """Para o scheduler."""
    global _scheduler

    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown()
        _scheduler = None
        logger.info("Scheduler parado")


def _sincronizar_advbox():
    """Executa a sincronizacao do Advbox para Excel."""
    try:
        api_key = os.getenv("ADVBOX_API_KEY") or os.getenv("ADVBOX_TOKEN")

        if not api_key:
            logger.warning("ADVBOX_API_KEY nao configurada - sincronizacao pulada")
            return

        resultado = exportar_agora(api_key)

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_msg = (
            f"[{timestamp}] SYNC OK | "
            f"Em Andamento: {resultado['processos_em_andamento']} | "
            f"Pendentes: {resultado['processos_pendentes']} | "
            f"Ticket Medio: R$ {resultado['ticket_medio']:,.2f}"
        )
        logger.info(log_msg)

    except Exception as e:
        logger.error(f"Erro ao sincronizar: {str(e)}", exc_info=True)


def obter_status_scheduler():
    """Retorna status do scheduler."""
    if _scheduler is None:
        return {"status": "nao iniciado"}

    if not _scheduler.running:
        return {"status": "parado"}

    jobs = _scheduler.get_jobs()
    return {
        "status": "rodando",
        "jobs": len(jobs),
        "proxima_execucao": str(jobs[0].next_run_time) if jobs else "nenhuma"
    }
