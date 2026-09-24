"""
Validador de arquiteturas AWS.

Uso:
    python arquitetura/validador.py arquiteturas/<caso>.yaml
    python arquitetura/validador.py arquiteturas/<caso>.yaml --json
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


# ── Tipos ────────────────────────────────────────────────────────────────────

@dataclass
class Problema:
    nivel: str        # "erro" | "aviso"
    mensagem: str
    servico_id: str = ""


@dataclass
class ResultadoValidacao:
    valido: bool
    erros: list[Problema] = field(default_factory=list)
    avisos: list[Problema] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "valido": self.valido,
            "erros": [{"nivel": p.nivel, "mensagem": p.mensagem, "servico": p.servico_id} for p in self.erros],
            "avisos": [{"nivel": p.nivel, "mensagem": p.mensagem, "servico": p.servico_id} for p in self.avisos],
        }


# ── Ícones disponíveis ───────────────────────────────────────────────────────

def _icones_disponiveis(pasta_icones: Path) -> set[str]:
    """Retorna o conjunto de tipos AWS disponíveis baseado nos arquivos em /icones/."""
    if pasta_icones.exists():
        return {p.stem for p in pasta_icones.glob("*.png")}
    # Fallback com lista mínima para desenvolvimento
    return {
        "aws-lambda", "aws-s3", "aws-ec2", "aws-rds", "aws-dynamodb",
        "aws-sqs", "aws-sns", "aws-cloudfront", "aws-api-gateway",
        "aws-cognito", "aws-iam", "aws-vpc", "aws-alb", "aws-ecs",
        "aws-fargate", "aws-eventbridge", "aws-step-functions", "aws-bedrock",
    }


# ── Validações ───────────────────────────────────────────────────────────────

def validar(caminho_yaml: Path, pasta_icones: Path | None = None) -> ResultadoValidacao:
    """Valida um arquivo de arquitetura YAML e retorna o resultado."""
    if pasta_icones is None:
        pasta_icones = Path(__file__).parent.parent / "icones"

    icones = _icones_disponiveis(pasta_icones)
    problemas: list[Problema] = []

    # Leitura do arquivo
    try:
        dados = yaml.safe_load(caminho_yaml.read_text(encoding="utf-8"))
    except Exception as exc:
        return ResultadoValidacao(
            valido=False,
            erros=[Problema("erro", f"Falha ao ler YAML: {exc}")],
        )

    servicos: list[dict] = dados.get("servicos", [])
    ids_existentes = {s.get("id") for s in servicos if s.get("id")}

    for idx, servico in enumerate(servicos):
        sid = servico.get("id", f"índice-{idx}")

        # REQ-05: campos obrigatórios
        for campo in ("id", "tipo", "nome", "conexoes"):
            if campo not in servico:
                problemas.append(Problema("erro", f"Campo obrigatório ausente: '{campo}'", sid))

        # REQ-04: IDs duplicados
        outros_ids = [s.get("id") for s in servicos if s is not servico]
        if sid in outros_ids:
            problemas.append(Problema("erro", f"ID duplicado: '{sid}'", sid))

        # REQ-01: tipo de serviço válido
        tipo = servico.get("tipo", "")
        if tipo and tipo not in icones:
            problemas.append(Problema("erro", f"Tipo desconhecido: '{tipo}'", sid))

        # REQ-02: referências de conexão válidas
        conexoes: list[dict] = servico.get("conexoes") or []
        for conn in conexoes:
            destino = conn.get("destino", "")
            if destino and destino not in ids_existentes:
                problemas.append(Problema("erro", f"Destino inválido: '{destino}' referenciado por '{sid}'", sid))

    # REQ-03: serviços isolados
    ids_com_entrada = {
        conn.get("destino")
        for s in servicos
        for conn in (s.get("conexoes") or [])
        if conn.get("destino")
    }
    for servico in servicos:
        sid = servico.get("id", "")
        tem_saida = bool(servico.get("conexoes"))
        tem_entrada = sid in ids_com_entrada
        if not tem_saida and not tem_entrada:
            problemas.append(Problema("aviso", f"Serviço isolado: '{sid}' ({servico.get('nome', '')}) não possui conexões", sid))

    erros = [p for p in problemas if p.nivel == "erro"]
    avisos = [p for p in problemas if p.nivel == "aviso"]

    return ResultadoValidacao(valido=len(erros) == 0, erros=erros, avisos=avisos)


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Valida arquivos de arquitetura AWS em YAML")
    parser.add_argument("arquivo", type=Path, help="Caminho para o arquivo .yaml")
    parser.add_argument("--json", action="store_true", help="Saída em formato JSON")
    args = parser.parse_args()

    resultado = validar(args.arquivo)

    if args.json:
        print(json.dumps(resultado.to_dict(), ensure_ascii=False, indent=2))
    else:
        status = "✅ Válido" if resultado.valido else "❌ Inválido"
        print(f"\n{status} — {args.arquivo}\n")
        for p in resultado.erros:
            print(f"  ERRO  [{p.servico_id}] {p.mensagem}")
        for p in resultado.avisos:
            print(f"  AVISO [{p.servico_id}] {p.mensagem}")
        if not resultado.erros and not resultado.avisos:
            print("  Nenhum problema encontrado.")
        print()

    sys.exit(0 if resultado.valido else 1)


if __name__ == "__main__":
    main()
