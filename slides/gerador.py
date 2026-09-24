"""
Gerador de slides PPTX no padrão LAB365 × SENAI.

A IA escreve o deck.yaml, o código desenha: lê o YAML, valida (contraste,
limites, ícones, composição) e, se não houver erro, monta o .pptx sobre o
template oficial (layouts, logos, fundos em gradiente e fonte Lexend).

Uso:
    python -m slides.gerador decks/<nome>.yaml                      # gera saida/<nome>.pptx
    python -m slides.gerador decks/<nome>.yaml --saida outro.pptx
    python -m slides.gerador decks/<nome>.yaml --preview            # + PNG de cada slide (requer LibreOffice)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Optional

from slides import base
from slides.esquema import Problema
from slides.tipos import REGISTRO, Contexto, carregar_tipos
from slides.validador_design import validar_arquivo


def gerar_deck(deck: dict, saida: Path, base_dir: Path = Path(".")) -> Path:
    """Renderiza um deck já validado e salva o PPTX."""
    carregar_tipos()
    d = base.Deck()
    meta = {k: v for k, v in deck.items() if k != "slides"}
    ctx = Contexto(deck=d, meta=meta, base_dir=base_dir)
    for i, dados in enumerate(deck["slides"]):
        ctx.indice = i
        REGISTRO[dados["tipo"]].render(ctx, dados)
        base.notas_apresentador(ctx.slide, dados.get("notas"))
    props = d.prs.core_properties
    props.title = str(meta.get("titulo") or deck["slides"][0].get("titulo", ""))
    props.author = str(meta.get("autor") or "")
    props.subject = "LAB365 × SENAI"
    d.salvar(saida)
    return saida


def gerar_arquivo(caminho: Path, saida: Optional[Path] = None) -> tuple[Optional[Path], list[Problema]]:
    """Valida e gera. Retorna (caminho do pptx ou None, problemas encontrados)."""
    deck, problemas = validar_arquivo(caminho)
    if deck is None or any(p.nivel == "erro" for p in problemas):
        return None, problemas
    saida = saida or base.RAIZ_PROJETO / "saida" / f"{caminho.stem}.pptx"
    return gerar_deck(deck, saida, caminho.parent), problemas


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Gera PPTX no padrão LAB365 a partir de um deck.yaml")
    ap.add_argument("deck", type=Path, help="decks/<nome>.yaml")
    ap.add_argument("--saida", type=Path, default=None, help="caminho do .pptx (padrão: saida/<nome>.pptx)")
    ap.add_argument("--preview", action="store_true", help="exporta PNG de cada slide + prancha (LibreOffice)")
    a = ap.parse_args(argv)

    pptx, problemas = gerar_arquivo(a.deck, a.saida)
    for p in problemas:
        print(p)
    erros = [p for p in problemas if p.nivel == "erro"]
    if erros:
        print(f"\n✘ {len(erros)} erro(s): nada foi gerado. Corrija o YAML e rode de novo.")
        return 1
    n = len(REGISTRO) and sum(1 for _ in base.Presentation(str(pptx)).slides)
    print(f"\n✔ {n} slides gerados: {pptx}")
    if a.preview:
        from slides.preview import gerar_preview
        prancha = gerar_preview(pptx)
        if prancha:
            print(f"✔ preview: {prancha}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
