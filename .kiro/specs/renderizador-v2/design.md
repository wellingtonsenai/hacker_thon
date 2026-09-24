# Design — Renderizador v2

## Estrutura de módulos

```
renderizador/
├── render.mjs          CLI — parse de args, orquestra módulos, exporta PNG/SVG
├── schema.mjs          JSON Schema, normalização v1→v2, validação
├── layout.mjs          Posicionamento de nós (manual, automático, misto)
├── icones.mjs          Carregamento de SVG, viewBox, prefixação de ids, cor
├── arestas.mjs         Traçado de curvas/retas, badge, rótulo, colisão
├── grupos.mjs          Bboxes hierárquicos, padding, label
├── svg.mjs             Montagem do SVG final
└── schema.json         JSON Schema Draft-07 do formato v2
```

---

## Estrutura de dados interna

### `Aresta` (saída de `schema.mjs` após normalização)

```ts
interface Aresta {
  de:      string;          // id de serviço ou grupo (origem)
  para:    string;          // id de serviço ou grupo (destino)
  passo?:  number;
  rotulo?: string;
  descricao?: string;
  estilo:  'requisicao' | 'resposta' | 'assincrono';
  rota?:   'reta' | 'ortogonal' | 'curva';
}
```

### `No` (saída de `layout.mjs`)

```ts
interface No {
  id:     string;
  cx:     number;
  cy:     number;
  w:      number;   // NODE_W (pode variar no futuro)
  h:      number;   // NODE_H calculado pelo conteúdo
}
```

### `GrupoBbox` (saída de `grupos.mjs`)

```ts
interface GrupoBbox {
  id:    string;
  nome:  string;
  tipo:  string;
  x:     number;
  y:     number;
  w:     number;
  h:     number;
  nivel: number;   // 0 = raiz, 1 = filho, 2 = neto...
}
```

### `TraçadoAresta` (saída de `arestas.mjs`)

```ts
interface TraçadoAresta {
  d:         string;    // atributo SVG path "d"
  badgeX:    number;
  badgeY:    number;
  badgeTxt:  string;    // "1 · pergunta" ou só "pergunta"
  cor:        string;
  dasharray?: string;
}
```

---

## schema.mjs — Normalização v1 → v2

```
carregarDoc(yamlPath)
  ├── yaml.load()
  ├── detectarVersao(doc)  → 1 | 2
  ├── se v1: normalizarV1(doc)
  │     └── para cada svc.conexoes[]:
  │           aresta = { de: svc.id, para: conn.destino, passo, rotulo,
  │                      estilo: conn.estilo === 'tracejado' ? 'assincrono' : 'requisicao' }
  │           doc.fluxo.push(aresta)
  └── validar(doc)
        └── lança ValidacaoError com { arquivo, caminho, motivo }
```

---

## layout.mjs — Posicionamento

```
calcularLayout(servicos, grupos)
  ├── modo = detectarModo(servicos)
  │     ├── 'manual'     → todos têm col/row
  │     ├── 'automatico' → nenhum tem col/row
  │     └── 'misto'      → alguns têm — posicionar manuais, depois preencher gaps
  ├── posicionar(servicos, modo)
  │     └── retorna Map<id, {cx, cy, w, h}>
  └── serviçosFora = servicos.filter(s => nenhum grupo os contém)
        └── reservar coluna -1 à esquerda do aws-cloud
```

### Modo misto

- Nós com `col`/`row` são posicionados primeiro.
- Nós sem posição recebem a próxima célula livre na grade (varredura linha por linha).

---

## icones.mjs — Carregamento

```
carregarIcone(filename, idServico, iconsDir)
  ├── ler arquivo SVG
  ├── extrairViewBox(svg) → { w, h }
  ├── escala = ICON_SIZE / viewBox.w
  ├── prefixarIds(svg, idServico)
  │     ├── substituir id="X" → id="<idServico>-X"
  │     ├── substituir url(#X) → url(#<idServico>-X)
  │     └── substituir href="#X" → href="#<idServico>-X"
  ├── extrairCorFaixa(svg) → hex | null
  │     └── primeiro <rect> ou <path> com fill sólido no SVG do ícone
  └── retornar { inner, escala, corFaixa }
```

---

## arestas.mjs — Traçado

### Seleção do tipo de rota

```
selecionarRota(no1, no2, aresta)
  ├── se aresta.rota → usar explícito
  ├── se mesma row (|cy1 - cy2| < 10) → reta
  ├── se mesma col (|cx1 - cx2| < 10) → reta
  └── senão → curva (padrão)
```

### Curva quadrática Bézier

```
calcularCurva(p1, p2, offset)
  ├── vetor corda = p2 - p1
  ├── perpendicular unitária = rotar 90°
  ├── ponto de controle = midpoint + perpendicular * OFFSET_CURVA
  └── "M x1,y1 Q cx,cy x2,y2"
```

`OFFSET_CURVA = 30` (antes era fixo em `-18` no eixo Y — problema para setas horizontais).

### Ponto real em t=0.5 (Bézier quadrática)

```
B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
```

Badge e rótulo são posicionados em `B(0.5) + perpendicular * 14`.

### Arestas paralelas (mesmo par de nós)

```
detectarParalelas(arestas)
  → agrupar por {min(de,para), max(de,para)}
  → pares com count > 1 recebem offset lateral ±12px da perpendicular
```

---

## grupos.mjs — Hierarquia

```
calcularGrupos(grupos, nos, GRUPO_PAD=24, FILHO_MIN=16)
  ├── ordenar por profundidade (filhos primeiro)
  ├── para cada grupo (folha primeiro):
  │     bbox = bboxDosNos(grupo.servicos, nos)
  │     expandir por GRUPO_PAD
  │     se tem pai: garantir que está a ≥ FILHO_MIN da borda do pai
  └── retornar GrupoBbox[]
```

---

## svg.mjs — Montagem

### Ordem de renderização (z-order)

1. `<defs>` (marcadores, fontes, filtros)
2. Fundo geral
3. Cabeçalho
4. Grupos (nível raiz → nível folha, da borda mais externa para a mais interna)
5. Setas
6. Pílulas (badge + rótulo unificados)
7. Nós
8. Painel de passos
9. Rodapé

### Fonte embutida

- Usar subset da Inter Regular + Bold (apenas ASCII + caracteres PT-BR comuns).
- Embutir como base64 em `@font-face` no `<defs>`.
- Fallback: `Arial, sans-serif`.

### Painel de passos

```
renderPainelPassos(fluxo)
  ├── altura = PASSO_H * count(fluxo com descricao)
  ├── para cada passo com descricao:
  │     "N. descrição..." truncado em 80 chars
  └── legenda: ícone de linha + texto para cada estilo usado
```

---

## Constantes revisadas

| Constante | v1 | v2 | Motivo |
|---|---|---|---|
| `NODE_W` | 120 | 140 | Mais espaço para texto |
| `NODE_H` | 130 | dinâmico | Ajusta ao conteúdo |
| `ICON_SIZE` | 56 | 64 | Ícones maiores |
| `GAP_X` | 70 | 80 | Mais espaço para pílulas |
| `GAP_Y` | 80 | 90 | Mais espaço para pílulas |
| `OFFSET_CURVA` | — | 30 | Novo: deslocamento perpendicular |
| `BADGE_OFFSET` | — | 14 | Novo: afastamento da linha |

---

## Fluxo completo do CLI (`render.mjs`)

```
1. parseArgs()
2. doc = schema.carregarDoc(yamlPath)           ← valida + normaliza
3. nos = layout.calcularLayout(doc.servicos, doc.grupos)
4. icones = icones.carregarTodos(doc.servicos, iconsDir)
5. grupos = grupos.calcularGrupos(doc.grupos, nos)
6. arestas = arestas.calcularArestas(doc.fluxo, nos, grupos)
7. svgStr = svg.montar(doc, nos, icones, grupos, arestas)
8. fs.writeFileSync(svgPath, svgStr)
9. sharp(svgStr, {density:216}).png().toFile(pngPath)  ← se não --svg-only
10. console.log(`✔ SVG: ${svgPath}\n✔ PNG: ${pngPath}`)
```
