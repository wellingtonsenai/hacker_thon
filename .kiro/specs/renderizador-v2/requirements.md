# Requirements — Renderizador de Diagramas AWS v2

## Contexto

O renderizador atual (`renderizador/render.mjs`) é um arquivo único que lê um YAML
proprietário (v1) e gera PNG com ícones oficiais AWS. O "Dev Validador" produz YAMLs
num formato diferente (sem `conexoes`, sem `tipo`, com `fluxo` narrativo) que o
renderizador ignora — resultado: diagramas sem setas e sem faixas coloridas.

Esta spec define o contrato único (schema v2), a refatoração em módulos e todas as
correções de renderização necessárias.

---

## REQ-01 — Schema v2 e contrato único

**Como** qualquer papel do grupo (Dev Validador, Dev Gerador),  
**quero** um JSON Schema versionado que descreva completamente o formato YAML,  
**para que** eu saiba exatamente o que gerar e o renderizador saiba validar.

### Critérios de aceite

- `renderizador/schema.json` existe e é JSON Schema Draft-07 válido.
- Declara `versao: 2` como campo obrigatório na v2 (v1 não tem o campo).
- Define `subtitulo` opcional; se só `padrao` existir, não exibir o slug.
- Define `fluxo[]` com campos: `passo?`, `de`, `para`, `rotulo?`, `descricao?`, `estilo?`.
- `estilo` aceita: `requisicao | resposta | assincrono`; `tracejado` é alias de `assincrono`.
- `para` pode ser id de serviço ou id de grupo.
- `grupos[]` com campos: `id`, `nome`, `tipo` (`aws-cloud | aws-region | generico`), `servicos[]`, `filhos[]`.
- `servicos[].sublabel` opcional.
- YAMLs v1 (com `conexoes`) continuam passando na validação com flag `--compat`.

---

## REQ-02 — Normalização v1 → v2

**Como** renderizador,  
**quero** normalizar internamente v1 e v2 para uma lista única de arestas,  
**para que** um único pipeline de renderização trate ambos os formatos.

### Critérios de aceite

- YAML v1 com `conexoes` → arestas com `de`, `para`, `passo`, `rotulo`, `estilo`.
- YAML v2 com `fluxo[]` com `de`/`para` → arestas equivalentes.
- `fluxo[]` com apenas `descricao` (sem `de`/`para`) → aviso no stderr, aresta ignorada, renderização não interrompida.
- Teste: `normalizar(yamlV1)` produz a mesma estrutura que `normalizar(yamlV2Equivalente)`.

---

## REQ-03 — Validação com erros claros

**Como** usuário que roda o renderizador,  
**quero** erros descritivos quando o YAML estiver inválido,  
**para que** eu saiba exatamente o que corrigir sem ler o código.

### Critérios de aceite

Cada erro deve indicar: arquivo, caminho do campo e motivo. Exemplos:

| Regra | Exemplo de mensagem |
|---|---|
| `de`/`para` inexistente | `fluxo[2].para: id "xyz" não existe em servicos nem grupos` |
| Ícone não encontrado | `servicos[1].icone: "foo.svg" não encontrado em icones/` |
| `passo` duplicado | `fluxo[3].passo: valor 2 já usado em fluxo[1]` |
| `tipo` desconhecido | `AVISO servicos[0].tipo: "aws-xyz" desconhecido — faixa usará cor padrão` |
| `servicos` vazio | `servicos: lista não pode estar vazia` |

- Erros interrompem a geração; avisos não.
- Conexões inválidas não são mais silenciosamente ignoradas.

---

## REQ-04 — Módulos separados

**Como** desenvolvedor,  
**quero** o renderizador dividido em módulos coesos,  
**para que** cada parte seja testável isoladamente.

### Critérios de aceite

| Módulo | Responsabilidade |
|---|---|
| `schema.mjs` | Carrega `schema.json`, normaliza v1→v2, valida |
| `layout.mjs` | Calcula posições `cx`/`cy` de nós; modo manual, automático e misto |
| `icones.mjs` | Carrega SVG, lê viewBox, prefixa ids internos, extrai cor dominante |
| `arestas.mjs` | Calcula traçado (reta, curva, ortogonal), badge, rótulo, colisão |
| `grupos.mjs` | Calcula bboxes de grupos de dentro para fora pela hierarquia |
| `svg.mjs` | Monta o SVG final a partir das estruturas dos módulos anteriores |
| `render.mjs` | CLI puro: parse de args, chama os módulos, exporta PNG/SVG |

---

## REQ-05 — Traçado de arestas correto

**Como** leitor do diagrama,  
**quero** que as setas sigam o fluxo lógico sem cruzamentos desnecessários,  
**para que** o diagrama seja legível.

### Critérios de aceite

- Origem e destino na mesma linha/coluna → linha reta.
- Caso contrário → curva ou ortogonal (padrão: curva).
- Campo `rota: reta | ortogonal | curva` força o tipo.
- O deslocamento do ponto de controle é calculado perpendicularmente à corda, não fixo em `my - 18`.
- Duas arestas entre o mesmo par de nós são deslocadas paralelamente.
- Aresta para grupo termina na borda do bounding box do grupo.

---

## REQ-06 — Badge e rótulo unificados e posicionados corretamente

**Como** leitor do diagrama,  
**quero** badge e rótulo num único elemento bem posicionado sobre a seta,  
**para que** não haja confusão entre número e texto.

### Critérios de aceite

- Badge e rótulo formam uma pílula única: `"1 · pergunta"`.
- Posição calculada no ponto real da curva em t=0.5 (via fórmula Bézier quadrática).
- Deslocamento perpendicular de 14px para não sobrepor a linha.
- Colisão entre pílulas detectada e resolvida (deslocamento ao longo da aresta ou perpendicular).

---

## REQ-07 — Medição de texto com fonte embutida

**Como** renderizador,  
**quero** medir o texto com uma fonte real embutida no SVG,  
**para que** caixas de rótulo e pílulas tenham tamanho correto.

### Critérios de aceite

- Fonte Inter ou Open Sans embutida via `@font-face` base64 no `<defs>` do SVG.
- Largura de texto calculada via `opentype.js` ou métricas aproximadas da fonte (não `length * 5.5`).
- "Amazon Ember" removida das declarações de fonte (não existe no ambiente sharp).

---

## REQ-08 — Hierarquia de grupos

**Como** leitor do diagrama,  
**quero** grupos aninhados renderizados corretamente (AWS Cloud > Region > Knowledge Base),  
**para que** a arquitetura de isolamento seja visível.

### Critérios de aceite

- Grupos calculados de dentro para fora: filho primeiro, pai depois.
- Padding interno de 24px entre nós e borda do grupo.
- Grupo filho nunca a menos de 16px da borda do pai.
- Label do grupo dentro da borda, canto superior esquerdo, com fundo igual ao fundo da área de conteúdo (não branco sobre cinza).
- Serviços fora de qualquer grupo ficam fisicamente fora da caixa `aws-cloud`.

---

## REQ-09 — Ícones: viewBox dinâmico, ids prefixados, cor extraída

**Como** renderizador,  
**quero** ícones carregados corretamente com escala baseada no viewBox real,  
**para que** não haja ícones mal proporcionados ou conflitos de id SVG.

### Critérios de aceite

- Scale calculado como `ICON_SIZE / viewBox.width` (lendo o viewBox do arquivo).
- Todos os `id` internos do SVG do ícone são prefixados com o id do serviço.
- Referências `url(#...)` e `href="#..."` também são atualizadas.
- `tipo: usuarios` usa o ícone `Arch_General-Users_64.svg` (ou fallback com ícone de grupo de pessoas) em vez de placeholder com letra.
- Cor da faixa extraída do SVG do ícone (atributo `fill` do fundo ou primeiro `<rect>`). `CATEGORIA_COR` é fallback.

---

## REQ-10 — Painel de passos e legenda

**Como** leitor do diagrama,  
**quero** um painel de passos no rodapé com as descrições do fluxo e a legenda dos estilos,  
**para que** eu entenda o fluxo sem decorar os números nas setas.

### Critérios de aceite

- Painel aparece entre a área de nós e o footer.
- Lista numerada usando `fluxo[].descricao` na ordem de `passo`.
- Legenda mostra apenas os estilos efetivamente usados no diagrama.

---

## REQ-11 — Saída dual e tratamento de erros de exportação

**Como** usuário,  
**quero** sempre ter o SVG salvo além do PNG,  
**para que** eu possa editar o diagrama manualmente se necessário.

### Critérios de aceite

- SVG sempre gravado (mesmo quando PNG é gerado).
- Flag `--svg-only` pula a etapa de PNG.
- "sharp não instalado" e "erro ao gerar PNG" são mensagens distintas.
- Caminho do SVG e do PNG impressos no stdout ao finalizar.

---

## REQ-12 — Cards com altura dinâmica e sublabel

**Como** leitor do diagrama,  
**quero** cards que se ajustem ao conteúdo,  
**para que** nomes longos não sejam cortados silenciosamente.

### Critérios de aceite

- Altura do card calculada: faixa (6px) + ícone (64px) + padding + linhas de texto.
- `wrap()` aceita até 3 linhas; se truncar, adiciona `…` na última linha e emite aviso.
- `sublabel` renderizado abaixo do nome em fonte menor e cor muted.

---

## REQ-13 — Testes automatizados

**Como** dev,  
**quero** testes com `node:test`,  
**para que** regressões sejam detectadas automaticamente.

### Critérios de aceite

Arquivo `tests/renderizador.test.mjs` cobre:

| Teste | O que verifica |
|---|---|
| `normalizar v1→v2` | Arestas geradas são equivalentes ao v2 direto |
| `validação — de/para inválido` | Lança erro com mensagem correta |
| `validação — passo duplicado` | Lança erro com mensagem correta |
| `validação — ícone ausente` | Lança erro com mensagem correta |
| `validação — servicos vazio` | Lança erro com mensagem correta |
| `validação — tipo desconhecido` | Emite aviso, não erro |
| `prefixação de ids de ícone` | Nenhum id duplicado no SVG final |
| `ausência de colisão de bbox` | Para `apostilas.yaml` e `exemplo.yaml` |
| `compatibilidade v1` | `apostilas.yaml` renderiza sem erro |
