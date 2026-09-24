---
inclusion: always
---

# Stack Técnica

## Linguagem
- **Python 3.11+** para toda a lógica de backend (geração, validação, renderização)
- Tipagem estática obrigatória com `typing` e `dataclasses`
- Docstrings em português

## Principais bibliotecas
| Finalidade | Biblioteca |
|---|---|
| Parsing de YAML | `PyYAML` |
| Renderização de diagramas | `diagrams` (mingrammer) ou `Pillow` |
| Validação de esquema | `pydantic` |
| Geração de slides | `python-pptx` |
| Testes | `pytest` |

## Padrões de código
- Arquivos de entrada/saída sempre em UTF-8
- Sem dependências de serviços externos em runtime (tudo local)
- Funções puras sempre que possível — efeitos colaterais isolados em módulos de I/O
- Erros de validação retornam lista de mensagens, nunca `raise` silencioso

## Comandos principais
```bash
# Validar uma arquitetura
python arquitetura/validador.py arquiteturas/<caso>.yaml

# Renderizar diagrama
python renderizador/main.py arquiteturas/<caso>.yaml --saida saida/

# Gerar slides
python slides/gerador.py saida/<caso>.png --saida slides/
```

## Testes
- Todos os testes ficam em `/tests/`
- Nomenclatura: `test_<módulo>.py`
- Rodar: `pytest tests/ -v`

## Versão de ícones AWS
- Ícones oficiais AWS Architecture Icons
- Armazenados localmente em `/icones/`
- Não buscar ícones em runtime
