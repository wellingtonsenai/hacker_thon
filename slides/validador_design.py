"""
Validador de design do deck.yaml.

Confere, antes de gerar qualquer slide:
  1. Estrutura do deck (lista `slides`, tipos conhecidos).
  2. Campos de cada tipo: obrigatórios, limite de caracteres, quantidade de itens.
  3. Ícones existem na biblioteca Lucide local (com sugestões quando não existem).
  4. Imagens existem (slides de imagem/diagrama).
  5. Regras de composição do padrão LAB365 (capa primeiro, fechamento no fim,
     variedade de layouts, seções dividindo decks longos).
  6. Contraste WCAG dos pares de cor usados em texto (tokens.json).

Sem atalho: se houver ERRO, o gerador não gera. Corrija o YAML e rode de novo.

Uso:
    python -m slides.validador_design decks/<nome>.yaml
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

import yaml

from slides import base
from slides.esquema import Problema, Texto, validar_campos
from slides.tipos import REGISTRO, carregar_tipos

CAMPOS_DECK = {
    "titulo": Texto(max=80, obrigatorio=False, descricao="Nome do deck (metadado do arquivo)"),
    "eyebrow": Texto(max=60, obrigatorio=False, descricao="Linha magenta acima do título em todos os slides de conteúdo (ex.: 'WORKSHOP X · MANHÃ')"),
    "autor": Texto(max=80, obrigatorio=False, descricao="Autor(es) — metadado do arquivo"),
    "slides": None,  # validado à parte
}


# ── Contraste ─────────────────────────────────────────────────────────────────

def _lum(hex_cor: str) -> float:
    h = hex_cor.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4  # noqa: E731
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def razao_contraste(a: str, b: str) -> float:
    la, lb = _lum(a), _lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def validar_contraste(tokens: dict) -> list[Problema]:
    """Pares texto/fundo usados em texto corrido devem ter razão ≥ 4,5:1 (WCAG 1.4.3)."""
    c = tokens["cores"]
    pares = [
        ("texto", "branco"), ("texto_medio", "branco"), ("azul", "branco"), ("magenta", "branco"),
        ("texto_medio", "fundo_neutro"), ("branco", "azul"), ("branco", "roxo"), ("branco", "terminal"),
    ]
    for a in tokens["acentos"].values():  # texto corrido sobre os cards pastel
        pares.append(("texto_medio", a["suave"]))
    p: list[Problema] = []
    for t, f in pares:
        ct, cf = c.get(t, t), c.get(f, f)
        r = razao_contraste(ct, cf)
        if r < 4.5:
            p.append(Problema("erro", "tokens.json", f"contraste {r:.1f}:1 entre {t} ({ct}) e {f} ({cf}); mínimo 4,5:1"))
    return p


# ── Deck ──────────────────────────────────────────────────────────────────────

def _contexto(base_dir: Path) -> dict:
    def resolver_imagem(caminho: str) -> Optional[Path]:
        for raiz in (base_dir, base.RAIZ_PROJETO, Path.cwd()):
            q = (raiz / caminho).resolve()
            if q.is_file():
                return q
        return None
    return {
        "resolver_icone": base.resolver_icone,
        "sugerir_icones": base.sugerir_icones,
        "resolver_imagem": resolver_imagem,
    }


def validar_deck(deck: object, base_dir: Path = Path(".")) -> list[Problema]:
    """Valida o dicionário do deck. Lista vazia = pode gerar."""
    carregar_tipos()
    p: list[Problema] = []
    if not isinstance(deck, dict):
        return [Problema("erro", "deck", "o YAML deve ser um objeto com a chave 'slides'")]
    ctx = _contexto(base_dir)
    p += validar_campos({k: v for k, v in deck.items() if k != "slides"},
                        {k: v for k, v in CAMPOS_DECK.items() if v is not None}, "deck", ctx)
    slides = deck.get("slides")
    if not isinstance(slides, list) or not slides:
        return p + [Problema("erro", "deck.slides", "lista de slides vazia ou ausente")]

    tipos: list[str] = []
    for i, s in enumerate(slides):
        cam = f"slides[{i}]"
        if not isinstance(s, dict):
            p.append(Problema("erro", cam, "cada slide deve ser um objeto com 'tipo'"))
            tipos.append("")
            continue
        tipo = s.get("tipo", "")
        tipos.append(tipo)
        if tipo not in REGISTRO:
            p.append(Problema("erro", f"{cam}.tipo", f"tipo '{tipo}' desconhecido. Tipos: {', '.join(sorted(REGISTRO))}"))
            continue
        cam = f"slides[{i}] ({tipo})"
        p += validar_campos(s, REGISTRO[tipo].campos, cam, ctx, ignorar=("tipo", "eyebrow"))

    # Composição
    if tipos[0] != "capa":
        p.append(Problema("aviso", "slides[0]", "o deck deve começar com um slide 'capa'"))
    if len(tipos) > 2 and tipos[-1] not in ("fechamento", "encerramento"):
        p.append(Problema("aviso", f"slides[{len(tipos) - 1}]", "o deck deve terminar com 'fechamento' (e, se quiser, 'encerramento' com os logos)"))
    for i in range(2, len(tipos)):
        if tipos[i] and tipos[i] == tipos[i - 1] == tipos[i - 2] and tipos[i] != "secao":
            p.append(Problema("aviso", f"slides[{i}]", f"3 slides '{tipos[i]}' seguidos: varie o layout para o deck não ficar monótono"))
    conteudo = [t for t in tipos if t in REGISTRO and REGISTRO[t].categoria == "conteudo"]
    if len(conteudo) >= 6 and len(set(conteudo)) < 4:
        p.append(Problema("aviso", "deck", f"só {len(set(conteudo))} layouts de conteúdo diferentes em {len(conteudo)} slides; use pelo menos 4"))
    if len(tipos) >= 9 and "secao" not in tipos:
        p.append(Problema("aviso", "deck", "deck com 9+ slides sem 'secao': divida em partes"))
    return p


def carregar_deck(caminho: Path) -> tuple[Optional[dict], list[Problema]]:
    try:
        with open(caminho, encoding="utf-8") as f:
            return yaml.safe_load(f), []
    except FileNotFoundError:
        return None, [Problema("erro", str(caminho), "arquivo não encontrado")]
    except yaml.YAMLError as exc:
        return None, [Problema("erro", str(caminho), f"YAML inválido: {exc}")]


def validar_arquivo(caminho: Path, tokens: Optional[dict] = None) -> tuple[Optional[dict], list[Problema]]:
    deck, p = carregar_deck(caminho)
    if deck is None:
        return None, p
    p += validar_contraste(tokens or base.TOKENS)
    p += validar_deck(deck, caminho.parent)
    return deck, p


def main(argv: Optional[list[str]] = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        print("Uso: python -m slides.validador_design decks/<nome>.yaml")
        return 2
    _, problemas = validar_arquivo(Path(args[0]))
    for pr in problemas:
        print(pr)
    n_erros = sum(pr.nivel == "erro" for pr in problemas)
    n_avisos = len(problemas) - n_erros
    print(f"\n{'✔' if not n_erros else '✘'} {n_erros} erro(s), {n_avisos} aviso(s).")
    return 1 if n_erros else 0


if __name__ == "__main__":
    sys.exit(main())
