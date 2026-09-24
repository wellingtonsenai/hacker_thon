/**
 * grupos.mjs — Cálculo de bounding boxes de grupos com suporte a hierarquia.
 *
 * Calcula de dentro para fora:
 *   1. Grupos folha (sem filhos): bbox dos seus nós + padding
 *   2. Grupos pai: bbox dos seus nós + bboxes dos filhos + padding
 *
 * Garante que grupos filho nunca ficam a menos de FILHO_MIN da borda do pai.
 *
 * Exporta:
 *   calcularGrupos(grupos, nos, opts) → GrupoBbox[]  (ordem: folhas → raízes)
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

export const GRUPOS_OPTS = {
  GRUPO_PAD:  28,  // padding interno: distância mínima nó → borda do grupo
  FILHO_MIN:  18,  // distância mínima grupo-filho → borda do grupo-pai
  LABEL_H:    20,  // altura reservada para o label no topo do grupo
};

// ─── Construção da hierarquia ─────────────────────────────────────────────────

/**
 * Constrói um mapa de id → grupo e identifica raízes (sem pai).
 * @param {Array} grupos
 * @returns {{ mapa: Map, raizes: string[], profundidades: Map }}
 */
function construirHierarquia(grupos) {
  const mapa = new Map(grupos.map(g => [g.id, g]));

  // Calcular profundidade de cada grupo (BFS a partir das raízes)
  const temPai = new Set();
  for (const g of grupos) {
    for (const fid of (g.filhos ?? [])) temPai.add(fid);
  }
  const raizes = grupos.map(g => g.id).filter(id => !temPai.has(id));

  const profundidades = new Map();
  const fila = raizes.map(id => ({ id, prof: 0 }));
  while (fila.length > 0) {
    const { id, prof } = fila.shift();
    profundidades.set(id, prof);
    const g = mapa.get(id);
    for (const fid of (g?.filhos ?? [])) {
      if (!profundidades.has(fid)) fila.push({ id: fid, prof: prof + 1 });
    }
  }

  // Grupos não alcançados pela BFS recebem profundidade 0
  for (const g of grupos) {
    if (!profundidades.has(g.id)) profundidades.set(g.id, 0);
  }

  return { mapa, raizes, profundidades };
}

// ─── BBox de um conjunto de nós ───────────────────────────────────────────────

/**
 * Retorna o bounding box (x, y, w, h) cobrindo os nós informados.
 * Retorna null se nenhum nó válido for encontrado.
 */
function bboxNos(ids, nos) {
  const candidatos = ids.map(id => nos.get(id)).filter(Boolean);
  if (candidatos.length === 0) return null;

  const xs1 = candidatos.map(n => n.cx - n.w / 2);
  const ys1 = candidatos.map(n => n.cy - n.h / 2);
  const xs2 = candidatos.map(n => n.cx + n.w / 2);
  const ys2 = candidatos.map(n => n.cy + n.h / 2);

  return {
    x: Math.min(...xs1),
    y: Math.min(...ys1),
    w: Math.max(...xs2) - Math.min(...xs1),
    h: Math.max(...ys2) - Math.min(...ys1),
  };
}

// ─── Expandir bbox por padding ────────────────────────────────────────────────

function expandirBbox(bbox, pad, labelH = 0) {
  return {
    x: bbox.x - pad,
    y: bbox.y - pad - labelH,
    w: bbox.w + pad * 2,
    h: bbox.h + pad * 2 + labelH,
  };
}

// ─── União de bboxes ──────────────────────────────────────────────────────────

function unirBboxes(bboxes) {
  const validos = bboxes.filter(Boolean);
  if (validos.length === 0) return null;
  const x1 = Math.min(...validos.map(b => b.x));
  const y1 = Math.min(...validos.map(b => b.y));
  const x2 = Math.max(...validos.map(b => b.x + b.w));
  const y2 = Math.max(...validos.map(b => b.y + b.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

// ─── calcularGrupos ───────────────────────────────────────────────────────────

/**
 * @typedef {object} GrupoBbox
 * @property {string} id
 * @property {string} nome
 * @property {string} tipo
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {number} nivel   0 = raiz, 1 = filho, 2 = neto...
 */

/**
 * Calcula os bounding boxes de todos os grupos, respeitando a hierarquia.
 *
 * @param {Array}  grupos    doc.grupos
 * @param {Map}    nos       Map<id, No> de layout.mjs
 * @param {object} [opts]
 * @returns {GrupoBbox[]}   ordenado de folhas (maior profundidade) para raízes
 */
export function calcularGrupos(grupos, nos, opts = {}) {
  if (!grupos || grupos.length === 0) return [];

  const {
    grupoPad = GRUPOS_OPTS.GRUPO_PAD,
    filhoMin = GRUPOS_OPTS.FILHO_MIN,
    labelH   = GRUPOS_OPTS.LABEL_H,
  } = opts;

  const { mapa, profundidades } = construirHierarquia(grupos);

  // Ordenar do mais profundo para o mais raso (folhas primeiro)
  const ordenados = [...grupos].sort((a, b) => {
    const pa = profundidades.get(a.id) ?? 0;
    const pb = profundidades.get(b.id) ?? 0;
    return pb - pa; // decrescente: maiores profundidades primeiro
  });

  const bboxs = new Map(); // id → GrupoBbox calculado

  for (const grp of ordenados) {
    // BBox dos nós membros diretos
    const bboxMembros = bboxNos(grp.servicos ?? [], nos);

    // BBox dos grupos filhos já calculados
    const bboxsFilhos = (grp.filhos ?? [])
      .map(fid => bboxs.get(fid))
      .filter(Boolean);

    // Unir tudo
    const partes = [bboxMembros, ...bboxsFilhos].filter(Boolean);
    if (partes.length === 0) continue; // grupo sem nós nem filhos visíveis

    const bboxUnido = unirBboxes(partes);
    const bboxExpandido = expandirBbox(bboxUnido, grupoPad, labelH);

    const nivel = profundidades.get(grp.id) ?? 0;

    bboxs.set(grp.id, {
      id:    grp.id,
      nome:  grp.nome ?? grp.id,
      tipo:  grp.tipo ?? 'generico',
      nivel,
      ...bboxExpandido,
    });
  }

  // Garantir que grupos filhos ficam dentro dos pais com margem mínima
  // (segunda passagem, de raízes para folhas)
  const porNivel = [...bboxs.values()].sort((a, b) => a.nivel - b.nivel);
  for (const pai of porNivel) {
    const grpPai = mapa.get(pai.id);
    for (const fid of (grpPai?.filhos ?? [])) {
      const filho = bboxs.get(fid);
      if (!filho) continue;

      // Verificar se filho está dentro do pai com margem FILHO_MIN
      const margemEsq  = filho.x - pai.x;
      const margemTopo = filho.y - pai.y;
      const margemDir  = (pai.x + pai.w) - (filho.x + filho.w);
      const margemBase = (pai.y + pai.h) - (filho.y + filho.h);

      let ajustado = false;
      const bboxFilhoAjust = { ...filho };

      if (margemEsq < filhoMin) {
        const delta = filhoMin - margemEsq;
        pai.x -= delta;
        pai.w += delta;
        ajustado = true;
      }
      if (margemTopo < filhoMin) {
        const delta = filhoMin - margemTopo;
        pai.y -= delta;
        pai.h += delta;
        ajustado = true;
      }
      if (margemDir < filhoMin) {
        pai.w += filhoMin - margemDir;
        ajustado = true;
      }
      if (margemBase < filhoMin) {
        pai.h += filhoMin - margemBase;
        ajustado = true;
      }

      if (ajustado) bboxs.set(pai.id, pai);
    }
  }

  // Retornar ordenado de folhas para raízes (para z-order correto no SVG:
  // grupos mais internos são desenhados depois dos externos → ficam na frente)
  return [...bboxs.values()].sort((a, b) => b.nivel - a.nivel);
}
