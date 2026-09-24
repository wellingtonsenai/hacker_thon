/**
 * layout.mjs — Cálculo de posições dos nós no diagrama.
 *
 * Modos:
 *   'manual'     → todos os serviços têm col/row
 *   'automatico' → nenhum tem col/row
 *   'misto'      → alguns têm — posicionar manuais primeiro, preencher gaps
 *
 * Serviços fora de qualquer grupo ficam numa coluna externa à esquerda do
 * bounding box dos grupos (sem invadir a caixa aws-cloud).
 *
 * Exporta:
 *   detectarModo(servicos)         → 'manual' | 'automatico' | 'misto'
 *   calcularLayout(servicos, grupos, opts) → Map<id, No>
 */

// ─── Constantes de layout ─────────────────────────────────────────────────────

export const LAYOUT = {
  NODE_W:    140,   // largura de cada nó
  NODE_H:    150,   // altura base de cada nó (ajustada pelo conteúdo em svg.mjs)
  GAP_X:     80,    // espaço horizontal entre nós
  GAP_Y:     90,    // espaço vertical entre nós
  HEADER_H:  72,    // cabeçalho
  FOOTER_H:  28,    // rodapé
  PADDING:   56,    // margem ao redor da área de nós
  MAX_COLS:  4,     // máximo de colunas na grade automática
  EXTERNO_GAP: 40,  // distância horizontal entre nós externos e o grupo principal
};

// ─── Detecção de modo ─────────────────────────────────────────────────────────

/**
 * @param {Array} servicos
 * @returns {'manual'|'automatico'|'misto'}
 */
export function detectarModo(servicos) {
  const comPos = servicos.filter(s => s.col !== undefined && s.row !== undefined).length;
  if (comPos === servicos.length) return 'manual';
  if (comPos === 0)               return 'automatico';
  return 'misto';
}

// ─── Identificar serviços externos (fora de qualquer grupo) ──────────────────

/**
 * Retorna o Set de ids de serviços que pertencem a pelo menos um grupo.
 * @param {Array} grupos
 * @returns {Set<string>}
 */
function idsNosGrupos(grupos) {
  const ids = new Set();
  for (const g of (grupos ?? [])) {
    for (const sid of (g.servicos ?? [])) ids.add(sid);
  }
  return ids;
}

// ─── Cálculo principal ────────────────────────────────────────────────────────

/**
 * Calcula as posições centrais (cx, cy) de cada nó.
 *
 * @param {Array}  servicos   lista de serviços do documento normalizado
 * @param {Array}  grupos     lista de grupos (para identificar serviços externos)
 * @param {object} opts       opções: { nodeW, nodeH, gapX, gapY, headerH, padding }
 * @returns {Map<string, No>} mapa id → { id, cx, cy, w, h }
 */
export function calcularLayout(servicos, grupos = [], opts = {}) {
  const {
    nodeW    = LAYOUT.NODE_W,
    nodeH    = LAYOUT.NODE_H,
    gapX     = LAYOUT.GAP_X,
    gapY     = LAYOUT.GAP_Y,
    headerH  = LAYOUT.HEADER_H,
    padding  = LAYOUT.PADDING,
    maxCols  = LAYOUT.MAX_COLS,
    externoGap = LAYOUT.EXTERNO_GAP,
  } = opts;

  const modo         = detectarModo(servicos);
  const dentroDosGrupos = idsNosGrupos(grupos);

  // Separar serviços externos (fora de qualquer grupo) dos internos.
  // Se não há grupos definidos, todos os serviços são tratados como internos.
  const temGrupos = grupos.length > 0;
  const externos  = temGrupos ? servicos.filter(s => !dentroDosGrupos.has(s.id)) : [];
  const internos  = temGrupos ? servicos.filter(s =>  dentroDosGrupos.has(s.id)) : servicos;

  // --- posicionar internos ---
  const posInternos = posicionarServicos(internos, modo, {
    nodeW, nodeH, gapX, gapY, maxCols,
    // offset inicial: os externos ficam à esquerda, então internos começam mais à direita
    offsetX: externos.length > 0 ? nodeW + externoGap + padding : padding,
    offsetY: headerH + padding,
  });

  // --- posicionar externos ---
  // Calcular bbox dos internos para alinhar verticalmente
  let minCyInternos = headerH + padding + nodeH / 2;
  if (posInternos.size > 0) {
    minCyInternos = Math.min(...[...posInternos.values()].map(n => n.cy));
  }

  const posExternos = posicionarExternos(externos, minCyInternos, {
    nodeW, nodeH, gapY,
    offsetX: padding,
    headerH,
  });

  // --- mesclar ---
  const resultado = new Map([...posInternos, ...posExternos]);
  return resultado;
}

// ─── Posicionamento de serviços internos ──────────────────────────────────────

function posicionarServicos(servicos, modo, { nodeW, nodeH, gapX, gapY, maxCols, offsetX, offsetY }) {
  const pos = new Map();
  if (servicos.length === 0) return pos;

  if (modo === 'manual') {
    for (const s of servicos) {
      pos.set(s.id, {
        id: s.id,
        cx: offsetX + s.col * (nodeW + gapX) + nodeW / 2,
        cy: offsetY + s.row * (nodeH + gapY) + nodeH / 2,
        w: nodeW, h: nodeH,
      });
    }
    return pos;
  }

  if (modo === 'automatico') {
    const cols = Math.min(maxCols, servicos.length);
    servicos.forEach((s, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      pos.set(s.id, {
        id: s.id,
        cx: offsetX + col * (nodeW + gapX) + nodeW / 2,
        cy: offsetY + row * (nodeH + gapY) + nodeH / 2,
        w: nodeW, h: nodeH,
      });
    });
    return pos;
  }

  // modo 'misto' — posicionar manuais, depois preencher gaps
  const celulasOcupadas = new Set();

  // Primeiro: posicionar os que têm col/row
  for (const s of servicos) {
    if (s.col !== undefined && s.row !== undefined) {
      const chave = `${s.col},${s.row}`;
      celulasOcupadas.add(chave);
      pos.set(s.id, {
        id: s.id,
        cx: offsetX + s.col * (nodeW + gapX) + nodeW / 2,
        cy: offsetY + s.row * (nodeH + gapY) + nodeH / 2,
        w: nodeW, h: nodeH,
      });
    }
  }

  // Depois: posicionar os sem col/row na próxima célula livre
  const cols = Math.min(maxCols, servicos.length);
  let col = 0, row = 0;

  function proximaCelulaLivre() {
    while (celulasOcupadas.has(`${col},${row}`)) {
      col++;
      if (col >= cols) { col = 0; row++; }
    }
    const c = col, r = row;
    celulasOcupadas.add(`${c},${r}`);
    col++;
    if (col >= cols) { col = 0; row++; }
    return { col: c, row: r };
  }

  for (const s of servicos) {
    if (s.col === undefined || s.row === undefined) {
      const { col: c, row: r } = proximaCelulaLivre();
      pos.set(s.id, {
        id: s.id,
        cx: offsetX + c * (nodeW + gapX) + nodeW / 2,
        cy: offsetY + r * (nodeH + gapY) + nodeH / 2,
        w: nodeW, h: nodeH,
      });
    }
  }

  return pos;
}

// ─── Posicionamento de serviços externos ──────────────────────────────────────

function posicionarExternos(externos, minCyInternos, { nodeW, nodeH, gapY, offsetX, headerH }) {
  const pos = new Map();
  externos.forEach((s, i) => {
    pos.set(s.id, {
      id: s.id,
      cx: offsetX + nodeW / 2,
      cy: minCyInternos + i * (nodeH + gapY),
      w: nodeW, h: nodeH,
    });
  });
  return pos;
}

// ─── Dimensões totais do canvas ───────────────────────────────────────────────

/**
 * Calcula largura e altura totais do SVG a partir das posições calculadas.
 * @param {Map} nos
 * @param {object} opts
 * @returns {{ W: number, H: number }}
 */
export function calcularDimensoes(nos, opts = {}) {
  const {
    nodeW   = LAYOUT.NODE_W,
    nodeH   = LAYOUT.NODE_H,
    padding = LAYOUT.PADDING,
    headerH = LAYOUT.HEADER_H,
    footerH = LAYOUT.FOOTER_H,
    painelPassosH = 0,
  } = opts;

  if (nos.size === 0) return { W: 400, H: 300 };

  const xs = [...nos.values()].map(n => n.cx);
  const ys = [...nos.values()].map(n => n.cy);

  const W = Math.max(...xs) + nodeW / 2 + padding;
  const H = Math.max(...ys) + nodeH / 2 + padding + footerH + painelPassosH;

  return { W, H };
}
