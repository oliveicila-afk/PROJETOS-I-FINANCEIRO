import os
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import Boolean, Date, DateTime, Float, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class PrevisaoExito(Base):
    __tablename__ = "previsoes_exito"

    id: Mapped[int] = mapped_column(primary_key=True)
    processo: Mapped[str] = mapped_column(String(100), nullable=False)
    banco: Mapped[str] = mapped_column(String(100), nullable=False)
    tese: Mapped[str] = mapped_column(String(255), nullable=False)
    data_prevista: Mapped[date] = mapped_column(Date, nullable=False)
    promocao_vertical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    competencia: Mapped[str] = mapped_column(String(50), nullable=False)
    valor_bruto: Mapped[float] = mapped_column(Float, nullable=False)
    valor_liquido: Mapped[float] = mapped_column(Float, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


def _database_url() -> str:
    default_path = Path(__file__).resolve().parents[1] / "hub_escritorio.db"
    return os.getenv("DATABASE_URL", f"sqlite:///{default_path.as_posix()}")


engine = create_engine(_database_url())
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def initialize_database() -> None:
    Base.metadata.create_all(engine)


def salvar_previsao(
    *,
    processo: str,
    banco: str,
    tese: str,
    data_prevista: date,
    promocao_vertical: bool,
    competencia: str,
    valor_bruto: float,
    valor_liquido: float,
) -> PrevisaoExito:
    with SessionLocal() as session:
        previsao = PrevisaoExito(
            processo=processo.strip(),
            banco=banco,
            tese=tese.strip(),
            data_prevista=data_prevista,
            promocao_vertical=promocao_vertical,
            competencia=competencia.strip(),
            valor_bruto=valor_bruto,
            valor_liquido=valor_liquido,
        )
        session.add(previsao)
        session.commit()
        session.refresh(previsao)
        return previsao


def listar_previsoes() -> list[PrevisaoExito]:
    with SessionLocal() as session:
        statement = select(PrevisaoExito).order_by(PrevisaoExito.data_prevista.desc())
        return list(session.scalars(statement))