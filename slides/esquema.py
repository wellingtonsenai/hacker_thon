"""
Mini-esquema declarativo dos campos de cada tipo de slide.

Cada tipo declara seus campos com estes descritores; o mesmo esquema serve
para validar o deck.yaml (mensagens claras em português, com caminho do campo)
e para gerar a documentação que o Kiro lê (references/tipos-de-slide.md).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional, Union


@dataclass
class Texto:
    """Texto curto. `max` = limite de caracteres para caber no layout sem encolher demais."""
    max: int
    obrigatorio: bool = True
    descricao: str = ""


@dataclass
class Icone:
    """Nome de ícone Lucide em kebab-case (ex.: rocket, shield-check). Ver `python -m slides.icones buscar`."""
    obrigatorio: bool = False
    descricao: str = ""


@dataclass
class Escolha:
    opcoes: list
    obrigatorio: bool = False
    descricao: str = ""


@dataclass
class Numero:
    minimo: Optional[float] = None
    maximo: Optional[float] = None
    obrigatorio: bool = False
    descricao: str = ""


@dataclass
class Imagem:
    """Caminho de imagem (PNG/JPG) relativo ao projeto ou ao deck.yaml."""
    obrigatorio: bool = True
    descricao: str = ""


@dataclass
class Objeto:
    campos: dict
    obrigatorio: bool = True
    descricao: str = ""


@dataclass
class Lista:
    item: Any
    min: int = 1
    max: int = 6
    obrigatorio: bool = True
    descricao: str = ""


@dataclass
class Nota:
    """Barra de destaque no rodapé: "Destaque: texto" ou {texto, destaque?, icone?, cor?}."""
    max: int = 120
    obrigatorio: bool = False
    descricao: str = "Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito)."


CORES_ACENTO = ["laranja", "magenta", "roxo", "azul"]
COR = Escolha(CORES_ACENTO, descricao="Força a cor do acento (senão segue a sequência laranja→magenta→roxo→azul)")

Descritor = Union[Texto, Icone, Escolha, Numero, Imagem, Objeto, Lista, Nota]


@dataclass
class Problema:
    nivel: str      # "erro" | "aviso"
    caminho: str    # ex.: slides[3].itens[1].titulo
    mensagem: str

    def __str__(self) -> str:
        return f"[{self.nivel.upper()}] {self.caminho}: {self.mensagem}"


def _vazio(v: Any) -> bool:
    return v is None or (isinstance(v, (str, list, dict)) and len(v) == 0)


def validar_valor(valor: Any, desc: Descritor, caminho: str, contexto: dict) -> list[Problema]:
    """Valida `valor` contra o descritor. `contexto` traz funções auxiliares (ícones, imagens)."""
    p: list[Problema] = []
    if _vazio(valor):
        if getattr(desc, "obrigatorio", False):
            p.append(Problema("erro", caminho, "campo obrigatório ausente"))
        return p

    if isinstance(desc, Texto):
        if not isinstance(valor, (str, int, float)):
            return [Problema("erro", caminho, f"esperava texto, veio {type(valor).__name__}")]
        s = str(valor)
        if len(s) > desc.max:
            p.append(Problema("erro", caminho,
                              f"{len(s)} caracteres (máx. {desc.max}); encurte: '{s[:50]}…'"))
    elif isinstance(desc, Nota):
        s = valor if isinstance(valor, str) else (valor.get("texto", "") if isinstance(valor, dict) else None)
        if s is None:
            return [Problema("erro", caminho, "nota deve ser texto ou {texto, destaque, icone, cor}")]
        total = len(s) + (len(valor.get("destaque", "")) if isinstance(valor, dict) else 0)
        if total > desc.max:
            p.append(Problema("erro", caminho, f"{total} caracteres (máx. {desc.max}); encurte"))
        if isinstance(valor, dict):
            if valor.get("icone"):
                p += validar_valor(valor["icone"], Icone(), f"{caminho}.icone", contexto)
            if valor.get("cor"):
                p += validar_valor(valor["cor"], COR, f"{caminho}.cor", contexto)
    elif isinstance(desc, Icone):
        resolver = contexto["resolver_icone"]
        if not resolver(str(valor)):
            sug = ", ".join(contexto["sugerir_icones"](str(valor))) or "rode: python -m slides.icones buscar <termo>"
            p.append(Problema("erro", caminho, f"ícone '{valor}' não existe. Sugestões: {sug}"))
    elif isinstance(desc, Escolha):
        if valor not in desc.opcoes:
            p.append(Problema("erro", caminho, f"'{valor}' inválido; use um de {desc.opcoes}"))
    elif isinstance(desc, Numero):
        try:
            n = float(str(valor).replace(",", ".").rstrip("%"))
        except ValueError:
            return [Problema("erro", caminho, f"esperava número, veio '{valor}'")]
        if desc.minimo is not None and n < desc.minimo or desc.maximo is not None and n > desc.maximo:
            p.append(Problema("erro", caminho, f"{n} fora do intervalo [{desc.minimo}, {desc.maximo}]"))
    elif isinstance(desc, Imagem):
        if not contexto["resolver_imagem"](str(valor)):
            p.append(Problema("erro", caminho, f"imagem '{valor}' não encontrada (caminho relativo ao projeto ou ao deck)"))
    elif isinstance(desc, Lista):
        if not isinstance(valor, list):
            return [Problema("erro", caminho, "esperava uma lista")]
        if len(valor) < desc.min:
            p.append(Problema("erro", caminho, f"{len(valor)} itens (mín. {desc.min})"))
        if len(valor) > desc.max:
            p.append(Problema("erro", caminho, f"{len(valor)} itens (máx. {desc.max}); divida em dois slides"))
        for i, it in enumerate(valor):
            p += validar_valor(it, desc.item, f"{caminho}[{i}]", contexto)
    elif isinstance(desc, Objeto):
        if not isinstance(valor, dict):
            return [Problema("erro", caminho, "esperava um objeto (chave: valor)")]
        p += validar_campos(valor, desc.campos, caminho, contexto)
    return p


def validar_campos(dados: dict, campos: dict, caminho: str, contexto: dict,
                   ignorar: tuple = ()) -> list[Problema]:
    p: list[Problema] = []
    for nome, desc in campos.items():
        p += validar_valor(dados.get(nome), desc, f"{caminho}.{nome}", contexto)
    desconhecidos = [k for k in dados if k not in campos and k not in ignorar]
    for k in desconhecidos:
        p.append(Problema("aviso", f"{caminho}.{k}", f"campo desconhecido (ignorado). Campos válidos: {sorted(campos)}"))
    return p


# ── Documentação gerada a partir do esquema ───────────────────────────────────

def _resumo(desc: Descritor) -> str:
    ob = "obrigatório" if getattr(desc, "obrigatorio", False) else "opcional"
    if isinstance(desc, Texto):
        base = f"texto ≤ {desc.max} caracteres, {ob}"
    elif isinstance(desc, Nota):
        base = f"nota de rodapé ≤ {desc.max} caracteres, {ob}"
    elif isinstance(desc, Icone):
        base = f"ícone Lucide, {ob}"
    elif isinstance(desc, Escolha):
        base = f"um de {desc.opcoes}, {ob}"
    elif isinstance(desc, Numero):
        faixa = f" [{desc.minimo}–{desc.maximo}]" if desc.minimo is not None or desc.maximo is not None else ""
        base = f"número{faixa}, {ob}"
    elif isinstance(desc, Imagem):
        base = f"caminho de imagem, {ob}"
    elif isinstance(desc, Lista):
        base = f"lista de {desc.min} a {desc.max} itens, {ob}"
    elif isinstance(desc, Objeto):
        base = f"objeto, {ob}"
    else:
        base = ob
    d = getattr(desc, "descricao", "")
    return f"{base}{' — ' + d if d else ''}"


def documentar(campos: dict, nivel: int = 0) -> list[str]:
    linhas: list[str] = []
    pad = "  " * nivel
    for nome, desc in campos.items():
        linhas.append(f"{pad}- `{nome}`: {_resumo(desc)}")
        if isinstance(desc, Lista) and isinstance(desc.item, Objeto):
            linhas.append(f"{pad}  - cada item:")
            linhas += documentar(desc.item.campos, nivel + 2)
        elif isinstance(desc, Lista) and not isinstance(desc.item, Objeto):
            linhas.append(f"{pad}  - cada item: {_resumo(desc.item)}")
        elif isinstance(desc, Objeto):
            linhas += documentar(desc.campos, nivel + 1)
    return linhas
