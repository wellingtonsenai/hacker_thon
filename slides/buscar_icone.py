"""
Busca ícones na biblioteca Lucide local (slides/icones/), por nome ou tag em inglês.

Uso:
    python -m slides.buscar_icone money          # → banknote, coins, wallet, ...
    python -m slides.buscar_icone "shield check"
    python -m slides.buscar_icone --existe rocket
"""

from __future__ import annotations

import sys

from slides.base import catalogo_icones, resolver_icone, sugerir_icones


def buscar(termo: str, n: int = 15) -> list[str]:
    termo = termo.strip().lower()
    cat = catalogo_icones()
    palavras = termo.replace("-", " ").split()
    exatos = [k for k in cat if k == termo.replace(" ", "-")]
    por_nome = [k for k in cat if all(p in k for p in palavras) and k not in exatos]
    por_tag = [k for k, tags in cat.items()
               if k not in exatos and k not in por_nome and all(any(p in t for t in tags) for p in palavras)]
    res = exatos + sorted(por_nome, key=len) + por_tag
    return (res or sugerir_icones(termo, n))[:n]


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    if args[0] == "--existe":
        ok = resolver_icone(args[1])
        print(ok or f"não existe; parecidos: {', '.join(sugerir_icones(args[1]))}")
        sys.exit(0 if ok else 1)
    print("\n".join(buscar(" ".join(args))))
