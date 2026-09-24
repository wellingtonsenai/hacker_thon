/**
 * svg.mjs — Montagem do SVG final a partir das estruturas dos módulos anteriores.
 *
 * Ordem de z-order (SVG renderiza em ordem, último fica na frente):
 *   1. defs (marcadores, fonte)
 *   2. fundo geral + área de conteúdo
 *   3. cabeçalho
 *   4. grupos (raiz → folha: externos primeiro, internos depois → ficam na frente)
 *   5. setas
 *   6. pílulas (badge + rótulo)
 *   7. nós
 *   8. painel de passos
 *   9. rodapé
 *
 * Exporta:
 *   montar(doc, nos, icones, gruposBbox, arestas) → string SVG
 */

import { LAYOUT, calcularDimensoes } from './layout.mjs';
import { categoryCor }               from './icones.mjs';

// ─── Constantes visuais ───────────────────────────────────────────────────────

const COR = {
  fundo:       '#FFFFFF',
  fundoCinza:  '#F2F3F3',
  headerBg:    '#232F3E',
  headerTxt:   '#FFFFFF',
  headerSub:   '#8B9098',
  awsLaranja:  '#FF9900',
  nodeFundo:   '#FFFFFF',
  nodeBorda:   '#AAB7B8',
  nomeServico: '#16191F',
  sublabel:    '#687078',
  grupoBorda:  '#AAB7B8',
  grupoCloud:  '#232F3E',
  grupoLabelBg:'#F2F3F3',
  rodapeTxt:   '#545B64',
  painelBg:    '#FAFAFA',
  painelBorda: '#E1E4E5',
  painelTxt:   '#16191F',
  painelMuted: '#687078',
};

const FAIXA_H = 6;   // altura da faixa colorida no topo do card
const ICON_SIZE = 64; // tamanho do ícone em px
const CARD_PAD  = 10; // padding horizontal do card
const PASSO_LINE_H = 18; // altura de cada linha no painel de passos
const PASSO_PAD    = 16; // padding interno do painel

// Legenda de estilos de aresta
const LEGENDA_ESTILO = {
  requisicao: { label: 'Requisição',  cor: '#545B64', dash: null       },
  resposta:   { label: 'Resposta',    cor: '#0073BB', dash: '6 3'      },
  assincrono: { label: 'Assíncrono',  cor: '#EB5F07', dash: '8 5'      },
};

// ─── Utilitários ──────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Quebra texto em linhas respeitando maxCh caracteres por linha.
 * Máximo de maxLines linhas; trunca a última com "…" se necessário.
 */
function wrap(txt, maxCh = 16, maxLines = 3) {
  const palavras = String(txt ?? '').split(' ');
  const linhas = [];
  let atual = '';
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > maxCh && atual) {
      linhas.push(atual.trim());
      atual = p;
    } else {
      atual = (atual + ' ' + p).trim();
    }
  }
  if (atual) linhas.push(atual.trim());

  if (linhas.length > maxLines) {
    const truncado = linhas.slice(0, maxLines);
    if (truncado[maxLines - 1].length > maxCh - 1) {
      truncado[maxLines - 1] = truncado[maxLines - 1].slice(0, maxCh - 1) + '…';
    } else {
      truncado[maxLines - 1] += '…';
    }
    return truncado;
  }
  return linhas;
}

/** Estima largura de texto (fallback sem opentype.js) */
function estimarLargura(txt, fontSize = 10) {
  // Tabela aproximada por categoria de caractere
  const str = String(txt ?? '');
  let w = 0;
  for (const ch of str) {
    if ('iIl1|'.includes(ch))         w += fontSize * 0.35;
    else if ('mwMW'.includes(ch))      w += fontSize * 0.75;
    else if (' '.includes(ch))         w += fontSize * 0.30;
    else                               w += fontSize * 0.58;
  }
  return Math.ceil(w);
}

// ─── Defs (marcadores + fonte) ────────────────────────────────────────────────

function renderDefs() {
  return `
  <defs>
    <style>
      text { font-family: Arial, Helvetica, sans-serif; }
    </style>
    <!-- seta padrão (requisição) -->
    <marker id="arr-req" markerWidth="9" markerHeight="9"
            refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#545B64"/>
    </marker>
    <!-- seta resposta (azul) -->
    <marker id="arr-resp" markerWidth="9" markerHeight="9"
            refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#0073BB"/>
    </marker>
    <!-- seta assíncrono (laranja) -->
    <marker id="arr-async" markerWidth="9" markerHeight="9"
            refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#EB5F07"/>
    </marker>
  </defs>`;
}

const MARKER_ID = {
  requisicao: 'arr-req',
  resposta:   'arr-resp',
  assincrono: 'arr-async',
};

// ─── Cabeçalho ────────────────────────────────────────────────────────────────

function renderCabecalho(doc, W) {
  const titulo   = esc(doc.nome ?? 'Diagrama de Arquitetura AWS');
  const subtitulo = esc(doc.subtitulo ?? '');   // padrao só exibido se subtitulo ausente E for legível
  const regiao   = esc(doc.regiao ?? '');
  const exibirSub = subtitulo || '';

  return `
  <!-- cabeçalho -->
  <rect x="0" y="0" width="${W}" height="${LAYOUT.HEADER_H}" fill="${COR.headerBg}"/>
  <text x="20" y="26"
        font-size="11" font-weight="700" letter-spacing="1.5"
        fill="${COR.awsLaranja}">aws</text>
  <text x="20" y="50"
        font-size="18" font-weight="700"
        fill="${COR.headerTxt}">${titulo}</text>
  ${exibirSub ? `<text x="20" y="66" font-size="10" fill="${COR.headerSub}">${exibirSub}</text>` : ''}
  ${regiao ? `
  <text x="${W - 16}" y="40" text-anchor="end" font-size="10" fill="${COR.headerSub}">
    ${regiao}
  </text>` : ''}`;
}

// ─── Grupos ───────────────────────────────────────────────────────────────────

function renderGrupo(bbox) {
  const isCloud  = bbox.tipo === 'aws-cloud';
  const isRegion = bbox.tipo === 'aws-region';

  const bordaCor   = isCloud  ? COR.grupoCloud  : COR.grupoBorda;
  const bordaW     = isCloud  ? 1.8 : 1.2;
  const bordaDash  = isCloud  ? '' : 'stroke-dasharray="6 3"';
  const labelColor = isCloud  ? COR.grupoCloud  : COR.rodapeTxt;

  // Prefixo do tipo
  const prefixo = isCloud ? '☁ AWS Cloud' : isRegion ? '⬡ Region' : '';
  const labelTxt = esc(prefixo ? `${prefixo} · ${bbox.nome}` : bbox.nome);
  const labelW   = estimarLargura(labelTxt, 10) + 24;

  return `
  <rect x="${bbox.x}" y="${bbox.y}" width="${bbox.w}" height="${bbox.h}"
        rx="6" fill="none"
        stroke="${bordaCor}" stroke-width="${bordaW}" ${bordaDash}/>
  <rect x="${bbox.x + 10}" y="${bbox.y - 8}"
        width="${labelW}" height="16"
        rx="3" fill="${COR.grupoLabelBg}"/>
  <text x="${bbox.x + 18}" y="${bbox.y + 3}"
        font-size="10" font-weight="700" fill="${labelColor}">${labelTxt}</text>`;
}

// ─── Setas e pílulas ──────────────────────────────────────────────────────────

function renderAresta(tr) {
  const markerId = MARKER_ID[tr.estilo] ?? 'arr-req';
  const dashAttr = tr.dasharray ? `stroke-dasharray="${tr.dasharray}"` : '';
  return `
  <path d="${tr.d}" fill="none"
        stroke="${tr.cor}" stroke-width="1.6"
        ${dashAttr} marker-end="url(#${markerId})"/>`;
}

function renderPilula(tr) {
  if (!tr.badgeTxt) return '';

  const fontSize   = 9.5;
  const txtW       = estimarLargura(tr.badgeTxt, fontSize);
  const pilW       = txtW + 14;
  const pilH       = 16;
  const pilX       = tr.badgeX - pilW / 2;
  const pilY       = tr.badgeY - pilH / 2;

  return `
  <rect x="${pilX.toFixed(1)}" y="${pilY.toFixed(1)}"
        width="${pilW}" height="${pilH}" rx="8"
        fill="${COR.headerBg}" opacity="0.92"/>
  <text x="${tr.badgeX.toFixed(1)}" y="${(tr.badgeY + 3.5).toFixed(1)}"
        text-anchor="middle" font-size="${fontSize}" font-weight="600"
        fill="#FFFFFF">${esc(tr.badgeTxt)}</text>`;
}

// ─── Nós (cards) ─────────────────────────────────────────────────────────────

function renderNo(svc, no, icone) {
  const x  = no.cx - no.w / 2;
  const y  = no.cy - no.h / 2;
  const cc = (icone?.corFaixa) ?? categoryCor(svc.tipo);

  // Faixa de cor
  const faixaRect = `
    <rect x="${x}" y="${y}" width="${no.w}" height="${FAIXA_H}"
          rx="8" fill="${cc}"/>
    <rect x="${x}" y="${y + FAIXA_H / 2}" width="${no.w}" height="${FAIXA_H / 2}"
          fill="${cc}"/>`;

  // Ícone
  let svgIcon;
  if (icone?.inner) {
    const ix = no.cx - ICON_SIZE / 2;
    const iy = y + FAIXA_H + 8;
    svgIcon = `<g transform="translate(${ix.toFixed(1)},${iy.toFixed(1)}) scale(${icone.escala.toFixed(4)})">${icone.inner}</g>`;
  } else {
    // Placeholder com inicial e cor de categoria
    const ix = no.cx - ICON_SIZE / 2;
    const iy = y + FAIXA_H + 8;
    svgIcon = `
      <rect x="${ix}" y="${iy}" width="${ICON_SIZE}" height="${ICON_SIZE}"
            rx="8" fill="${cc}" opacity="0.15"/>
      <text x="${no.cx}" y="${iy + ICON_SIZE / 2 + 8}"
            text-anchor="middle" font-size="26" font-weight="700"
            fill="${cc}">${esc((svc.nome ?? svc.id)[0].toUpperCase())}</text>`;
  }

  // Texto do nome (até 3 linhas)
  const nomeY   = y + FAIXA_H + 8 + ICON_SIZE + 12;
  const linhas  = wrap(svc.nome ?? svc.id, 15, 3);
  const nomeStr = linhas.map((l, i) =>
    `<tspan x="${no.cx}" dy="${i === 0 ? 0 : 13}">${esc(l)}</tspan>`
  ).join('');

  // Sublabel (opcional)
  const sublabelY = nomeY + linhas.length * 13 + 4;
  const sublabelStr = svc.sublabel
    ? `<text x="${no.cx}" y="${sublabelY}" text-anchor="middle"
             font-size="8.5" fill="${COR.sublabel}">${esc(svc.sublabel)}</text>`
    : '';

  return `
  <g id="no-${esc(svc.id)}">
    <!-- sombra -->
    <rect x="${x + 2}" y="${y + 2}" width="${no.w}" height="${no.h}"
          rx="8" fill="rgba(0,0,0,0.07)"/>
    <!-- fundo -->
    <rect x="${x}" y="${y}" width="${no.w}" height="${no.h}"
          rx="8" fill="${COR.nodeFundo}" stroke="${COR.nodeBorda}" stroke-width="1"/>
    ${faixaRect}
    ${svgIcon}
    <text x="${no.cx}" y="${nomeY}"
          text-anchor="middle" font-size="10.5" font-weight="600"
          fill="${COR.nomeServico}">${nomeStr}</text>
    ${sublabelStr}
  </g>`;
}

// ─── Painel de passos ────────────────────────────────────────────────────────

function renderPainelPassos(fluxoPassos, estilosUsados, y, W) {
  if (fluxoPassos.length === 0 && estilosUsados.size === 0) return { svg: '', h: 0 };

  const linhas    = fluxoPassos.filter(e => e.descricao);
  const legendaH  = estilosUsados.size > 0 ? 28 : 0;
  const conteudoH = linhas.length * PASSO_LINE_H + PASSO_PAD * 2 + legendaH;
  const painelH   = Math.max(conteudoH, 0);
  if (painelH === 0) return { svg: '', h: 0 };

  let itens = '';
  for (let i = 0; i < linhas.length; i++) {
    const e   = linhas[i];
    const lbl = e.passo ? `${e.passo}. ` : '';
    const txt = esc(lbl + (e.descricao ?? '').trim());
    itens += `
    <text x="${16 + PASSO_PAD}" y="${y + PASSO_PAD + (i + 1) * PASSO_LINE_H}"
          font-size="10" fill="${COR.painelTxt}">${txt}</text>`;
  }

  // Legenda de estilos
  let legenda = '';
  let lx = 16 + PASSO_PAD;
  const ly = y + conteudoH - legendaH + 16;
  for (const estilo of estilosUsados) {
    const info = LEGENDA_ESTILO[estilo];
    if (!info) continue;
    const dash = info.dash ? `stroke-dasharray="${info.dash}"` : '';
    legenda += `
    <line x1="${lx}" y1="${ly}" x2="${lx + 24}" y2="${ly}"
          stroke="${info.cor}" stroke-width="1.8" ${dash}/>
    <text x="${lx + 30}" y="${ly + 4}" font-size="9" fill="${COR.painelMuted}">${info.label}</text>`;
    lx += 100;
  }

  const svg = `
  <!-- painel de passos -->
  <rect x="0" y="${y}" width="${W}" height="${painelH}"
        fill="${COR.painelBg}" stroke="${COR.painelBorda}" stroke-width="0"/>
  <line x1="0" y1="${y}" x2="${W}" y2="${y}"
        stroke="${COR.painelBorda}" stroke-width="1"/>
  ${itens}
  ${legenda}`;

  return { svg, h: painelH };
}

// ─── Rodapé ───────────────────────────────────────────────────────────────────

function renderRodape(W, H) {
  const rodapeY = H - LAYOUT.FOOTER_H;
  return `
  <!-- rodapé -->
  <rect x="0" y="${rodapeY}" width="${W}" height="${LAYOUT.FOOTER_H}"
        fill="${COR.headerBg}" opacity="0.05"/>
  <line x1="0" y1="${rodapeY}" x2="${W}" y2="${rodapeY}"
        stroke="${COR.nodeBorda}" stroke-width="0.8"/>
  <text x="16" y="${rodapeY + 18}" font-size="8.5" fill="${COR.rodapeTxt}">
    Gerado por render.mjs · Workshop Kiro e Agentes na AWS · LAB365 × SENAI
  </text>
  <text x="${W - 16}" y="${rodapeY + 18}" text-anchor="end"
        font-size="8.5" fill="${COR.rodapeTxt}">
    AWS Architecture Icons © Amazon Web Services, Inc.
  </text>`;
}

// ─── Montagem final ───────────────────────────────────────────────────────────

/**
 * Monta o SVG final completo.
 *
 * @param {object} doc          documento normalizado (de schema.mjs)
 * @param {Map}    nos          posições dos nós (de layout.mjs)
 * @param {Map}    icones       ícones carregados (de icones.mjs)
 * @param {Array}  gruposBbox   bboxes dos grupos (de grupos.mjs)
 * @param {Array}  arestas      traçados das arestas (de arestas.mjs)
 * @returns {string}            SVG completo como string
 */
export function montar(doc, nos, icones, gruposBbox, arestas) {
  // Detectar estilos de aresta efetivamente usados
  const estilosUsados = new Set(arestas.map(a => a.estilo).filter(Boolean));

  // Painel de passos
  const fluxoPassos = doc.fluxoPassos ?? [];

  // Dimensões base (sem painel)
  const { W, H: Hbase } = calcularDimensoes(nos, {
    nodeW:   LAYOUT.NODE_W,
    nodeH:   LAYOUT.NODE_H,
    padding: LAYOUT.PADDING,
    headerH: LAYOUT.HEADER_H,
    footerH: LAYOUT.FOOTER_H,
  });

  // Calcular altura do painel de passos antecipadamente
  const linhasPainel  = fluxoPassos.filter(e => e.descricao);
  const legendaH      = estilosUsados.size > 0 ? 28 : 0;
  const painelH       = linhasPainel.length > 0 || estilosUsados.size > 0
    ? linhasPainel.length * PASSO_LINE_H + PASSO_PAD * 2 + legendaH
    : 0;

  const H = Hbase + painelH;

  // Painel y position = Hbase - FOOTER_H
  const painelY = Hbase - LAYOUT.FOOTER_H;

  // ── Renderizar partes ──
  const svgDefs       = renderDefs();
  const svgCabecalho  = renderCabecalho(doc, W);

  // Grupos: ordem inversa para z-order correto (raízes primeiro = atrás)
  // gruposBbox já vem de folhas→raízes; invertemos para desenhar raízes atrás
  const svgGrupos = [...gruposBbox].reverse().map(renderGrupo).join('');

  const svgArestas = arestas.map(renderAresta).join('');
  const svgPilulas = arestas.map(renderPilula).join('');

  const svgNos = doc.servicos.map(svc => {
    const no    = nos.get(svc.id);
    const icone = icones.get(svc.id) ?? null;
    if (!no) return '';
    return renderNo(svc, no, icone);
  }).join('');

  const { svg: svgPainel } = renderPainelPassos(fluxoPassos, estilosUsados, painelY, W);
  const svgRodape          = renderRodape(W, H);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${W}" height="${H}"
     viewBox="0 0 ${W} ${H}">
  ${svgDefs}

  <!-- fundo -->
  <rect width="${W}" height="${H}" fill="${COR.fundo}"/>
  <rect x="0" y="${LAYOUT.HEADER_H}" width="${W}" height="${H - LAYOUT.HEADER_H - LAYOUT.FOOTER_H - painelH}"
        fill="${COR.fundoCinza}"/>

  ${svgCabecalho}
  ${svgGrupos}
  ${svgArestas}
  ${svgPilulas}
  ${svgNos}
  ${svgPainel}
  ${svgRodape}
</svg>`;
}
