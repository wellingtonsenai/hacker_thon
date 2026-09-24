# Tasks — Renderizador v2

## Onda 1 — Schema e normalização (base para tudo)

- [ ] **T01** Criar `renderizador/schema.json` (JSON Schema Draft-07 v2)
  - Campos obrigatórios: `nome`, `servicos`
  - `versao`, `subtitulo`, `regiao`, `padrao`, `descricao`, `fluxo[]`, `grupos[]`
  - `fluxo[].de`, `fluxo[].para`, `fluxo[].passo?`, `fluxo[].rotulo?`, `fluxo[].descricao?`, `fluxo[].estilo?`, `fluxo[].rota?`
  - `servicos[].sublabel?`, `servicos[].col?`, `servicos[].row?`
  - `grupos[].id`, `grupos[].filhos[]`

- [ ] **T02** Criar `renderizador/schema.mjs`
  - `detectarVersao(doc)` → 1 | 2
  - `normalizarV1(doc)` → converte `conexoes` em `fluxo[]`
  - `normalizarFluxo(doc)` → filtra entradas sem `de`/`para`, emite aviso
  - `validar(doc, iconsDir)` → lança `ValidacaoError` para cada regra do REQ-03
  - `carregarDoc(yamlPath, iconsDir)` → composição pública

- [ ] **T03** Escrever testes T01–T02 em `tests/renderizador.test.mjs`
  - normalização v1→v2
  - cada caso de erro de validação
  - aviso para `tipo` desconhecido
  - aviso para `fluxo` sem `de`/`para`

## Onda 2 — Layout e ícones

- [ ] **T04** Criar `renderizador/layout.mjs`
  - `detectarModo(servicos)` → `'manual' | 'automatico' | 'misto'`
  - `calcularLayout(servicos, grupos)` → `Map<id, No>`
  - Modo misto: posicionar manuais, preencher gaps automáticos
  - Reservar coluna externa para serviços fora de qualquer grupo

- [ ] **T05** Criar `renderizador/icones.mjs`
  - `extrairViewBox(svgStr)` → `{w, h}`
  - `prefixarIds(svgStr, prefixo)` → svgStr com ids únicos
  - `extrairCorFaixa(svgStr)` → hex | null
  - `carregarIcone(filename, idServico, iconsDir)` → `{inner, escala, corFaixa}`
  - `carregarTodos(servicos, iconsDir)` → `Map<id, IconeCarregado>`

- [ ] **T06** Testes T04–T05
  - Modo misto: nós com e sem `col`/`row`
  - Prefixação: nenhum id duplicado no SVG com dois ícones
  - ViewBox dinâmico: ícone 64×64 escala para `ICON_SIZE` corretamente

## Onda 3 — Arestas e grupos

- [ ] **T07** Criar `renderizador/arestas.mjs`
  - `edgePt(no, alvo)` — ponto na borda do retângulo
  - `edgePtGrupo(grupoBbox, alvo)` — ponto na borda do grupo
  - `selecionarRota(no1, no2, aresta)` → tipo de rota
  - `calcularCurva(p1, p2)` → path SVG + pontoMeio
  - `calcularReta(p1, p2)` → path SVG + pontoMeio
  - `calcularOrtogonal(p1, p2)` → path SVG + pontoMeio
  - `detectarParalelas(arestas)` → offsets laterais
  - `calcularArestas(fluxo, nos, grupos)` → `TraçadoAresta[]`

- [ ] **T08** Criar `renderizador/grupos.mjs`
  - `construirHierarquia(grupos)` → árvore
  - `calcularBboxGrupo(grupo, nos, grupos, bboxsFilhos)` → `GrupoBbox`
  - `calcularGrupos(grupos, nos)` → `GrupoBbox[]` ordenados da borda externa para interna

- [ ] **T09** Testes T07–T08
  - Seta reta em nós da mesma linha
  - Seta curva com ponto médio real em t=0.5
  - Duas arestas paralelas têm paths distintos (sem sobreposição)
  - Grupo filho está totalmente dentro do pai
  - Aresta para grupo termina na borda do bbox do grupo

## Onda 4 — SVG e CLI

- [ ] **T10** Criar `renderizador/svg.mjs`
  - `renderCabecalho(doc, W)` → string SVG
  - `renderGrupo(grupoBbox, nivel)` → string SVG
  - `renderAresta(traçado)` → string SVG
  - `renderPilula(traçado)` → string SVG (badge + rótulo unificados)
  - `renderNo(svc, no, icone)` → string SVG (faixa, ícone, nome, sublabel)
  - `renderPainelPassos(fluxo, y, W)` → string SVG
  - `renderRodape(doc, W, H)` → string SVG
  - `montar(doc, nos, icones, grupos, arestas)` → string SVG completo

- [ ] **T11** Reescrever `renderizador/render.mjs` como CLI puro
  - Parse de args: `<yaml>`, `<saida>`, `--icons`, `--svg-only`
  - Chamar pipeline do design
  - Distinguir "sharp não instalado" de "erro no sharp"
  - Sempre gravar SVG

- [ ] **T12** Testes T10–T11
  - Ausência de colisão de bbox para `apostilas.yaml` e `exemplo.yaml`
  - `apostilas.yaml` renderiza sem erro (compatibilidade v1)
  - SVG sempre gravado

## Onda 5 — YAMLs e ícone de usuários

- [ ] **T13** Baixar ícone `Arch_General-Users_64.svg` para `icones/`

- [ ] **T14** Atualizar `arquiteturas/apostilas.yaml` para v2
  - `versao: 2`, `subtitulo: "Arquitetura RAG"`
  - `alunos` com `tipo: usuarios` fora do `aws-cloud`
  - Grupos aninhados: `aws-cloud > aws-region > generico (Knowledge Base)`
  - `fluxo[]` com todos os passos descritos no REQ da Parte 3
  - `sublabel` em `agentcore` e `bedrock`

- [ ] **T15** Atualizar `casos/exemplo.yaml` para v2
  - Adicionar `versao: 2`, `tipo` em cada serviço
  - Converter `fluxo[]` para ter `de`, `para`, `rotulo`
  - Adicionar `grupos[]`

- [ ] **T16** Instalar `opentype.js` e integrar em `icones.mjs` para medição de texto
  - Se não disponível, fallback para estimativa com tabela de larguras por caractere

## Onda 6 — Validação final e git

- [ ] **T17** Rodar todos os testes: `node --test tests/renderizador.test.mjs`

- [ ] **T18** Gerar antes/depois:
  - `saida/apostilas-antes.png` (com render.mjs atual, antes de sobrescrever)
  - `saida/apostilas-depois.png` (com v2)
  - `saida/exemplo-depois.png` (Dev Validador YAML com setas)

- [ ] **T19** Atualizar `README.md` com a nova estrutura de módulos e formato v2

- [ ] **T20** Commit e push

---

## Dependências entre tarefas

```
T01 → T02 → T03
T02 → T04 → T06
T02 → T05 → T06
T04, T05 → T07 → T09
T04, T05 → T08 → T09
T07, T08 → T10 → T12
T10 → T11 → T12
T12 → T13 → T14 → T17
T12 → T15 → T17
T16 → T17 → T18 → T19 → T20
```
