"""
Gera a referência dos tipos de slide a partir do código (esquema + exemplo de cada tipo).

A saída é o arquivo que a skill do Kiro lê antes de escrever um deck — assim
a documentação nunca fica desatualizada em relação ao gerador.

Uso:
    python -m slides.catalogo > .kiro/skills/gerador-slides/references/tipos-de-slide.md
"""

from __future__ import annotations

import yaml

from slides.esquema import documentar
from slides.tipos import carregar_tipos

ORDEM_CATEGORIAS = [("abertura", "Estrutura do deck"), ("conteudo", "Conteúdo")]


def gerar_markdown() -> str:
    reg = carregar_tipos()
    out = ["# Tipos de slide — referência gerada do código", "",
           "> Gerado por `python -m slides.catalogo`. Não edite à mão.", ""]
    out.append("| Tipo | Quando usar |")
    out.append("|---|---|")
    for cat, _ in ORDEM_CATEGORIAS:
        for t in sorted((t for t in reg.values() if t.categoria == cat), key=lambda t: t.nome):
            out.append(f"| `{t.nome}` | {t.descricao} |")
    out.append("")
    for cat, titulo in ORDEM_CATEGORIAS:
        out.append(f"## {titulo}")
        out.append("")
        for t in sorted((t for t in reg.values() if t.categoria == cat), key=lambda t: t.nome):
            out.append(f"### `{t.nome}`")
            out.append("")
            out.append(t.descricao)
            out.append("")
            out.append("Campos:")
            out += documentar({k: v for k, v in t.campos.items() if k != "notas"})
            out.append("")
            out.append("Exemplo:")
            out.append("```yaml")
            out.append(yaml.safe_dump([t.exemplo], allow_unicode=True, sort_keys=False, width=110).rstrip())
            out.append("```")
            out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    print(gerar_markdown())
