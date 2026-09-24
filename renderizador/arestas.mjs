/**
 * arestas.mjs — Cálculo de traçado de setas para o diagrama.
 *
 * Funcionalidades:
 *   - Ponto de saída/chegada na borda do retângulo do nó ou bbox do grupo
 *   - Seleção automática de rota: reta (mesma linha/col), curva (padrão)
 *   - Ponto real na curva em t=0.5 via fórmula Bézier quadrática
 *   - Deslocamento perpendicular do badge para não sobrepor a linha
 *   - Arestas paralelas (mesmo par de nós) deslocadas lateralmente
 *
 * Exporta:
 *   edgePtNo(no, alvo)         → {x, y}
 *   edgePtGrupo(bbox, alvo)    → {x, y}
 *   bezierPonto(p0,p1,p2, t)   → {x, y}
 *   calcularArestas(fluxo, nos, gruposBbox) → TraçadoAresta[]
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

export const ARESTAS = {
  OFFSET_CURVA:  35,   // deslocamento perpendicular do ponto de controle
  BADGE_OFFSET:  16,   // afastamento perpendicular do badge/rótulo da linha
  PARALELA_DIST: 14,   // deslocamento lateral para arestas paralelas
};

// Cores por estilo de aresta
const COR_ARESTA = {
  requisicao: '#545B64',
  resposta:   '#0073BB',
  assincrono: '#EB5F07',
};
const DASH_ARESTA = {
  requisicao: null,
  resposta:   '6 3',
  assincrono: '8 5',
};

// ─── Ponto na borda do retângulo ──────────────────────────────────────────────

/**
 * Retorna o ponto na borda do nó (retângulo) mais próximo de (alvoX, alvoY).
 * @param {{ cx, cy, w, h }} no
 * @param {{ x, y }} alvo
 * @returns {{ x, y }}
 */
export function edgePtNo(no, alvo) {
  const { cx, cy, w, h } = no;
  const hw = w / 2, hh = h / 2;
  const dx = alvo.x - cx, dy = alvo.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy - hh }; // fallback: topo
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const sc = Math.min(sx, sy);
  return { x: cx + dx * sc, y: cy + dy * sc };
}

/**
 * Retorna o ponto na borda do bbox de um grupo.
 * @param {{ x, y, w, h }} bbox
 * @param {{ x, y }} alvo
 * @returns {{ x, y }}
 */
export function edgePtGrupo(bbox, alvo) {
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  return edgePtNo({ cx, cy, w: bbox.w, h: bbox.h }, alvo);
}

// ─── Bézier quadrática ────────────────────────────────────────────────────────

/**
 * Ponto na curva Bézier quadrática em t ∈ [0,1].
 * B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
 */
export function bezierPonto(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * Vetor tangente à curva Bézier quadrática em t.
 * B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
 */
function bezierTangente(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

/** Vetor perpendicular normalizado à tangente */
function perpendicularNorm(tangente) {
  const mag = Math.sqrt(tangente.x ** 2 + tangente.y ** 2);
  if (mag < 0.001) return { x: 0, y: -1 };
  return { x: -tangente.y / mag, y: tangente.x / mag };
}

// ─── Seleção de rota ──────────────────────────────────────────────────────────

const LIMIAR_ALINHAMENTO = 12; // pixels — margem para considerar "mesma linha/col"

function selecionarRota(no1, no2, aresta) {
  if (aresta.rota) return aresta.rota;
  const dx = Math.abs(no1.cx - no2.cx);
  const dy = Math.abs(no1.cy - no2.cy);
  if (dy < LIMIAR_ALINHAMENTO) return 'reta';   // mesma linha horizontal
  if (dx < LIMIAR_ALINHAMENTO) return 'reta';   // mesma coluna vertical
  return 'curva';
}

// ─── Cálculo de path e ponto médio ────────────────────────────────────────────

/**
 * Calcula path SVG e ponto médio para uma aresta reta.
 */
function tracarReta(p1, p2) {
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  return { d: `M${p1.x},${p1.y} L${p2.x},${p2.y}`, mid };
}

/**
 * Calcula path SVG Bézier quadrática e ponto médio real em t=0.5.
 * O ponto de controle é deslocado perpendicularmente à corda.
 */
function tracarCurva(p1, p2, offsetCurva = ARESTAS.OFFSET_CURVA, offsetLateral = 0) {
  // Vetor corda e perpendicular
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const mag = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = -dy / mag, perpY = dx / mag;

  // Ponto de controle = ponto médio + deslocamento perpendicular
  const ctrl = {
    x: (p1.x + p2.x) / 2 + perpX * offsetCurva + perpX * offsetLateral,
    y: (p1.y + p2.y) / 2 + perpY * offsetCurva + perpY * offsetLateral,
  };

  const mid = bezierPonto(p1, ctrl, p2, 0.5);

  return {
    d: `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${ctrl.x.toFixed(1)},${ctrl.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`,
    mid,
    ctrl,
    p1, p2,
  };
}

// ─── Detecção de arestas paralelas ────────────────────────────────────────────

/**
 * Retorna um mapa de chave de par → array de índices das arestas.
 * Chave: "idMenor|idMaior" para detectar pares bidirecionais.
 */
function detectarParalelas(fluxo) {
  const grupos = new Map();
  for (let i = 0; i < fluxo.length; i++) {
    const { de, para } = fluxo[i];
    if (!de || !para) continue;
    const chave = [de, para].sort().join('|');
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(i);
  }
  // Retorna apenas os grupos com mais de uma aresta
  const paralelas = new Map();
  for (const [chave, indices] of grupos) {
    if (indices.length > 1) paralelas.set(chave, indices);
  }
  return paralelas;
}

// ─── Obter ponto de origem/destino (nó ou grupo) ─────────────────────────────

function pontoBorda(id, alvoPt, nos, gruposBbox) {
  const no = nos.get(id);
  if (no) return edgePtNo(no, alvoPt);
  const bbox = gruposBbox.find(g => g.id === id);
  if (bbox) return edgePtGrupo(bbox, alvoPt);
  return null;
}

function centroAlvo(id, nos, gruposBbox) {
  const no = nos.get(id);
  if (no) return { x: no.cx, y: no.cy };
  const bbox = gruposBbox.find(g => g.id === id);
  if (bbox) return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
  return null;
}

// ─── calcularArestas ──────────────────────────────────────────────────────────

/**
 * @typedef {object} TraçadoAresta
 * @property {string}  d           path SVG
 * @property {number}  badgeX      posição X do badge/rótulo
 * @property {number}  badgeY      posição Y do badge/rótulo
 * @property {string}  badgeTxt    texto do badge ("1 · rótulo" ou só rótulo)
 * @property {string}  cor         cor da linha
 * @property {string|null} dasharray  stroke-dasharray ou null
 * @property {string}  estilo      estilo original
 * @property {object}  aresta      referência à aresta original do fluxo
 */

/**
 * Calcula o traçado de todas as arestas do fluxo.
 *
 * @param {Array}      fluxo        doc.fluxo normalizado
 * @param {Map}        nos          mapa id → No (de layout.mjs)
 * @param {Array}      gruposBbox   array de GrupoBbox (de grupos.mjs)
 * @returns {TraçadoAresta[]}
 */
export function calcularArestas(fluxo, nos, gruposBbox = []) {
  const paralelas  = detectarParalelas(fluxo);
  const resultado  = [];

  for (let i = 0; i < fluxo.length; i++) {
    const aresta = fluxo[i];
    if (!aresta.de || !aresta.para) continue;

    const ctroOrigem  = centroAlvo(aresta.de,   nos, gruposBbox);
    const ctroDestino = centroAlvo(aresta.para,  nos, gruposBbox);
    if (!ctroOrigem || !ctroDestino) continue;

    const p1 = pontoBorda(aresta.de,   ctroDestino, nos, gruposBbox);
    const p2 = pontoBorda(aresta.para, ctroOrigem,  nos, gruposBbox);
    if (!p1 || !p2) continue;

    // Offset lateral para arestas paralelas
    const chave = [aresta.de, aresta.para].sort().join('|');
    let offsetLateral = 0;
    if (paralelas.has(chave)) {
      const indices = paralelas.get(chave);
      const pos = indices.indexOf(i);
      offsetLateral = (pos - (indices.length - 1) / 2) * ARESTAS.PARALELA_DIST;
    }

    // Nó origem (para selecionar rota)
    const noOrigem  = nos.get(aresta.de)   ?? { cx: ctroOrigem.x,  cy: ctroOrigem.y,  w: 1, h: 1 };
    const noDestino = nos.get(aresta.para) ?? { cx: ctroDestino.x, cy: ctroDestino.y, w: 1, h: 1 };
    const tipoRota  = selecionarRota(noOrigem, noDestino, aresta);

    let tracado;
    if (tipoRota === 'reta') {
      tracado = tracarReta(p1, p2);
    } else {
      tracado = tracarCurva(p1, p2, ARESTAS.OFFSET_CURVA, offsetLateral);
    }

    // Posição do badge: ponto real em t=0.5 + deslocamento perpendicular
    let badgeX = tracado.mid.x;
    let badgeY = tracado.mid.y;

    if (tipoRota === 'curva' && tracado.ctrl) {
      const tang = bezierTangente(p1, tracado.ctrl, p2, 0.5);
      const perp = perpendicularNorm(tang);
      badgeX = tracado.mid.x + perp.x * ARESTAS.BADGE_OFFSET;
      badgeY = tracado.mid.y + perp.y * ARESTAS.BADGE_OFFSET;
    } else {
      // Seta reta: deslocar perpendicularmente à direção
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      badgeX = tracado.mid.x + (-dy / mag) * ARESTAS.BADGE_OFFSET;
      badgeY = tracado.mid.y + ( dx / mag) * ARESTAS.BADGE_OFFSET;
    }

    // Texto do badge
    let badgeTxt = '';
    if (aresta.passo && aresta.rotulo) {
      badgeTxt = `${aresta.passo} · ${aresta.rotulo}`;
    } else if (aresta.passo) {
      badgeTxt = String(aresta.passo);
    } else if (aresta.rotulo) {
      badgeTxt = aresta.rotulo;
    }

    const cor       = COR_ARESTA[aresta.estilo]  ?? COR_ARESTA.requisicao;
    const dasharray = DASH_ARESTA[aresta.estilo]  ?? null;

    resultado.push({
      d: tracado.d,
      badgeX, badgeY,
      badgeTxt,
      cor, dasharray,
      estilo: aresta.estilo,
      aresta,
    });
  }

  return resultado;
}
