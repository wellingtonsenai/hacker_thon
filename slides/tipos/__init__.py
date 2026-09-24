"""
Registro dos tipos de slide.

Cada módulo deste pacote registra um ou mais tipos com `@registrar(...)`.
Os módulos são descobertos automaticamente — para criar um tipo novo basta
adicionar um arquivo aqui.

Contrato de um tipo:
    @registrar("nome", descricao="quando usar", campos={...}, exemplo={...})
    def render(ctx: Contexto, dados: dict) -> None:
        slide = ctx.novo_slide("conteudo")      # escolhe o layout do template
        ...                                     # desenha com slides.base
"""

from __future__ import annotations

import importlib
import pkgutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

from slides import base
from slides.esquema import Texto

# Campos aceitos em qualquer slide (além dos declarados pelo tipo)
CAMPOS_COMUNS = {
    "notas": Texto(max=2000, obrigatorio=False, descricao="Roteiro de fala do apresentador (vai para as anotações do PowerPoint)"),
}


@dataclass
class TipoSlide:
    nome: str
    descricao: str
    campos: dict
    exemplo: dict
    render: Callable
    categoria: str = "conteudo"


REGISTRO: dict[str, TipoSlide] = {}


def registrar(nome: str, *, descricao: str, campos: dict, exemplo: dict, categoria: str = "conteudo"):
    """Decorador que registra um tipo de slide."""
    def deco(fn: Callable) -> Callable:
        REGISTRO[nome] = TipoSlide(nome, descricao, {**campos, **CAMPOS_COMUNS}, {"tipo": nome, **exemplo}, fn, categoria)
        return fn
    return deco


@dataclass
class Contexto:
    """O que um renderizador recebe além dos dados do slide."""
    deck: base.Deck
    meta: dict                      # campos do topo do deck.yaml (titulo, eyebrow, autor...)
    base_dir: Path                  # pasta do deck.yaml (para resolver imagens)
    indice: int = 0                 # posição do slide no deck (0-based)
    slide: Optional[object] = None  # último slide criado

    def novo_slide(self, layout: str = "conteudo"):
        self.slide = self.deck.novo_slide(layout)
        return self.slide

    def eyebrow(self, dados: dict) -> str:
        """Eyebrow do slide: o do próprio slide ou o padrão do deck."""
        return dados.get("eyebrow") or self.meta.get("eyebrow") or ""

    def resolver_imagem(self, caminho: str) -> Optional[Path]:
        for raiz in (self.base_dir, base.RAIZ_PROJETO, Path.cwd()):
            p = (raiz / caminho).resolve()
            if p.is_file():
                return p
        return None


def carregar_tipos() -> dict[str, TipoSlide]:
    """Importa todos os módulos do pacote (cada um registra seus tipos)."""
    pasta = Path(__file__).parent
    for m in pkgutil.iter_modules([str(pasta)]):
        if not m.name.startswith("_"):
            importlib.import_module(f"{__name__}.{m.name}")
    return REGISTRO
