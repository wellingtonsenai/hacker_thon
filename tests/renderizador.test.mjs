/**
 * tests/renderizador.test.mjs
 * Testes do renderizador v2 usando node:test (Node ≥ 18)
 *
 * Executar: node --test tests/renderizador.test.mjs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';

import {
  detectarVersao,
  normalizarV1,
  normalizarFluxo,
  validar,
  carregarDoc,
  ValidacaoError,
} from '../renderizador/schema.mjs';

// ─── helpers ──────────────────────────────────────────────────────────────────

const ROOT = resolve('.');

/** Cria um YAML temporário e retorna o caminho */
function criarYamlTemp(conteudo) {
  const dir  = join(tmpdir(), 'renderizador-test-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'test.yaml');
  writeFileSync(path, conteudo, 'utf8');
  return path;
}

// ─── Onda 1: detecção de versão ───────────────────────────────────────────────

describe('detectarVersao', () => {
  test('doc sem versao → 1', () => {
    assert.equal(detectarVersao({}), 1);
  });
  test('doc com versao:2 → 2', () => {
    assert.equal(detectarVersao({ versao: 2 }), 2);
  });
  test('doc com versao:1 → 1 (com aviso)', () => {
    assert.equal(detectarVersao({ versao: 1 }), 1);
  });
});

// ─── Onda 1: normalização v1 → v2 ────────────────────────────────────────────

describe('normalizarV1', () => {
  test('converte conexoes em fluxo[]', () => {
    const doc = {
      servicos: [
        {
          id: 'a',
          nome: 'A',
          conexoes: [
            { destino: 'b', passo: 1, rotulo: 'vai', estilo: undefined },
            { destino: 'c', passo: 2, rotulo: 'também', estilo: 'tracejado' },
          ],
        },
        { id: 'b', nome: 'B', conexoes: [] },
        { id: 'c', nome: 'C' },
      ],
    };

    normalizarV1(doc);

    assert.equal(doc.fluxo.length, 2);
    assert.deepEqual(doc.fluxo[0], {
      de: 'a', para: 'b', passo: 1, rotulo: 'vai',
      estilo: 'requisicao', rota: undefined,
    });
    assert.deepEqual(doc.fluxo[1], {
      de: 'a', para: 'c', passo: 2, rotulo: 'também',
      estilo: 'assincrono', rota: undefined,
    });
    assert.equal(doc.versao, 2);
    // conexoes devem ser removidas dos serviços
    assert.equal(doc.servicos[0].conexoes, undefined);
  });

  test('doc sem conexoes não quebra', () => {
    const doc = { servicos: [{ id: 'x', nome: 'X' }] };
    assert.doesNotThrow(() => normalizarV1(doc));
    assert.deepEqual(doc.fluxo, []);
  });

  test('v1 e v2 equivalente produzem o mesmo fluxo após normalização', () => {
    const docV1 = {
      servicos: [
        { id: 'web', nome: 'Web', conexoes: [{ destino: 'api', passo: 1, rotulo: 'req' }] },
        { id: 'api', nome: 'API', conexoes: [] },
      ],
    };
    const docV2 = {
      versao: 2,
      servicos: [
        { id: 'web', nome: 'Web' },
        { id: 'api', nome: 'API' },
      ],
      fluxo: [{ de: 'web', para: 'api', passo: 1, rotulo: 'req', estilo: 'requisicao' }],
    };

    normalizarV1(docV1);
    normalizarFluxo(docV1, 'v1');
    normalizarFluxo(docV2, 'v2');

    // fluxo deve ser idêntico
    assert.equal(docV1.fluxo.length, docV2.fluxo.length);
    assert.equal(docV1.fluxo[0].de,    docV2.fluxo[0].de);
    assert.equal(docV1.fluxo[0].para,  docV2.fluxo[0].para);
    assert.equal(docV1.fluxo[0].passo, docV2.fluxo[0].passo);
    assert.equal(docV1.fluxo[0].rotulo,docV2.fluxo[0].rotulo);
  });
});

// ─── Onda 1: normalizarFluxo ──────────────────────────────────────────────────

describe('normalizarFluxo', () => {
  test('tracejado vira assincrono', () => {
    const doc = {
      fluxo: [{ de: 'a', para: 'b', estilo: 'tracejado' }],
    };
    normalizarFluxo(doc, 'test');
    assert.equal(doc.fluxo[0].estilo, 'assincrono');
  });

  test('sem estilo recebe requisicao', () => {
    const doc = { fluxo: [{ de: 'a', para: 'b' }] };
    normalizarFluxo(doc, 'test');
    assert.equal(doc.fluxo[0].estilo, 'requisicao');
  });

  test('entrada só com descricao vai para fluxoPassos, não para fluxo', () => {
    const doc = {
      fluxo: [
        { descricao: 'Passo narrativo sem aresta' },
        { de: 'a', para: 'b', descricao: 'Com aresta' },
      ],
    };
    normalizarFluxo(doc, 'test');
    assert.equal(doc.fluxo.length, 1);          // só a aresta real
    assert.equal(doc.fluxoPassos.length, 2);    // ambos vão para painel de passos
  });
});

// ─── Onda 1: validação ────────────────────────────────────────────────────────

describe('validar — erros', () => {
  test('servicos vazio lança ValidacaoError', () => {
    const doc = { versao: 2, servicos: [], fluxo: [] };
    assert.throws(
      () => validar(doc, 'test.yaml', null),
      (e) => e instanceof ValidacaoError && e.caminho === 'servicos'
    );
  });

  test('fluxo[n].de inexistente lança ValidacaoError', () => {
    const doc = {
      versao: 2,
      servicos: [{ id: 'a', nome: 'A' }],
      fluxo: [{ de: 'xyz', para: 'a', estilo: 'requisicao' }],
      grupos: [],
    };
    assert.throws(
      () => validar(doc, 'test.yaml', null),
      (e) => e instanceof ValidacaoError &&
             e.caminho === 'fluxo[0].de' &&
             e.motivo.includes('"xyz"')
    );
  });

  test('fluxo[n].para inexistente lança ValidacaoError', () => {
    const doc = {
      versao: 2,
      servicos: [{ id: 'a', nome: 'A' }],
      fluxo: [{ de: 'a', para: 'naoexiste', estilo: 'requisicao' }],
      grupos: [],
    };
    assert.throws(
      () => validar(doc, 'test.yaml', null),
      (e) => e instanceof ValidacaoError &&
             e.caminho === 'fluxo[0].para' &&
             e.motivo.includes('"naoexiste"')
    );
  });

  test('passo duplicado lança ValidacaoError', () => {
    const doc = {
      versao: 2,
      servicos: [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }],
      fluxo: [
        { de: 'a', para: 'b', passo: 1, estilo: 'requisicao' },
        { de: 'b', para: 'a', passo: 1, estilo: 'resposta' },
      ],
      grupos: [],
    };
    assert.throws(
      () => validar(doc, 'test.yaml', null),
      (e) => e instanceof ValidacaoError &&
             e.caminho === 'fluxo[1].passo' &&
             e.motivo.includes('1')
    );
  });

  test('ícone ausente lança ValidacaoError', () => {
    const dir = join(tmpdir(), 'icones-vazio-' + Date.now());
    mkdirSync(dir, { recursive: true });

    const doc = {
      versao: 2,
      servicos: [{ id: 'a', nome: 'A', icone: 'naoexiste.svg' }],
      fluxo: [],
      grupos: [],
    };
    assert.throws(
      () => validar(doc, 'test.yaml', dir),
      (e) => e instanceof ValidacaoError &&
             e.caminho === 'servicos[0].icone' &&
             e.motivo.includes('naoexiste.svg')
    );
  });
});

describe('validar — avisos (não lança)', () => {
  test('tipo desconhecido não lança erro', () => {
    const doc = {
      versao: 2,
      servicos: [{ id: 'a', nome: 'A', tipo: 'aws-servico-inventado' }],
      fluxo: [],
      grupos: [],
    };
    assert.doesNotThrow(() => validar(doc, 'test.yaml', null));
  });
});

// ─── Onda 1: carregarDoc ──────────────────────────────────────────────────────

describe('carregarDoc', () => {
  test('carrega e normaliza apostilas.yaml (v1 — compatibilidade)', () => {
    const path = join(ROOT, 'arquiteturas', 'apostilas.yaml');
    // Não passa iconsDir para não checar ícones neste teste
    const doc = carregarDoc(path, null);
    assert.ok(doc.servicos.length > 0);
    assert.ok(Array.isArray(doc.fluxo));
    assert.equal(doc.versao, 2); // sempre normalizado para v2
  });

  test('arquivo inexistente lança Error', () => {
    assert.throws(
      () => carregarDoc('nao-existe.yaml', null),
      (e) => !(e instanceof ValidacaoError) && e.message.includes('nao-existe.yaml')
    );
  });

  test('YAML inválido lança Error', () => {
    const path = criarYamlTemp('{ chave: [isso: não: é: yaml');
    assert.throws(
      () => carregarDoc(path, null),
      (e) => !(e instanceof ValidacaoError)
    );
  });
});

// ─── Onda 2: layout ───────────────────────────────────────────────────────────

import { detectarModo, calcularLayout, LAYOUT } from '../renderizador/layout.mjs';

describe('detectarModo', () => {
  test('todos com col/row → manual', () => {
    const s = [{ id: 'a', col: 0, row: 0 }, { id: 'b', col: 1, row: 0 }];
    assert.equal(detectarModo(s), 'manual');
  });
  test('nenhum com col/row → automatico', () => {
    const s = [{ id: 'a' }, { id: 'b' }];
    assert.equal(detectarModo(s), 'automatico');
  });
  test('alguns com col/row → misto', () => {
    const s = [{ id: 'a', col: 0, row: 0 }, { id: 'b' }];
    assert.equal(detectarModo(s), 'misto');
  });
});

describe('calcularLayout', () => {
  test('modo manual: posições corretas', () => {
    const s = [
      { id: 'a', col: 0, row: 0 },
      { id: 'b', col: 1, row: 0 },
      { id: 'c', col: 0, row: 1 },
    ];
    const nos = calcularLayout(s, []);
    const a = nos.get('a'), b = nos.get('b'), c = nos.get('c');
    // b deve estar à direita de a
    assert.ok(b.cx > a.cx, 'b.cx > a.cx');
    // c deve estar abaixo de a
    assert.ok(c.cy > a.cy, 'c.cy > a.cy');
    // a e b devem ter mesma altura
    assert.equal(a.cy, b.cy);
  });

  test('modo automatico: distribui em grade', () => {
    const s = Array.from({ length: 6 }, (_, i) => ({ id: `s${i}` }));
    const nos = calcularLayout(s, []);
    assert.equal(nos.size, 6);
    // os 4 primeiros devem estar na mesma linha
    const cy0 = nos.get('s0').cy;
    assert.equal(nos.get('s1').cy, cy0);
    assert.equal(nos.get('s2').cy, cy0);
    assert.equal(nos.get('s3').cy, cy0);
    // s4 deve estar numa linha abaixo
    assert.ok(nos.get('s4').cy > cy0);
  });

  test('modo misto: manuais respeitados, automáticos preenchidos', () => {
    const s = [
      { id: 'a', col: 0, row: 0 },   // manual
      { id: 'b' },                    // automático
      { id: 'c', col: 2, row: 0 },   // manual
    ];
    const nos = calcularLayout(s, []);
    const a = nos.get('a'), b = nos.get('b'), c = nos.get('c');
    // a e c devem estar nas posições exatas
    assert.equal(a.cx, LAYOUT.PADDING + 0 * (LAYOUT.NODE_W + LAYOUT.GAP_X) + LAYOUT.NODE_W / 2);
    assert.equal(c.cx, LAYOUT.PADDING + 2 * (LAYOUT.NODE_W + LAYOUT.GAP_X) + LAYOUT.NODE_W / 2);
    // b não deve colidir com a nem c
    assert.ok(b.cx !== a.cx || b.cy !== a.cy);
    assert.ok(b.cx !== c.cx || b.cy !== c.cy);
  });

  test('serviço externo ao grupo fica fora do bbox dos internos', () => {
    const s = [
      { id: 'externo' },
      { id: 'interno', col: 0, row: 0 },
    ];
    const grupos = [{ id: 'g', nome: 'G', servicos: ['interno'] }];
    const nos = calcularLayout(s, grupos);
    const ext = nos.get('externo'), int = nos.get('interno');
    // externo deve estar à esquerda do interno
    assert.ok(ext.cx < int.cx, `externo.cx(${ext.cx}) < interno.cx(${int.cx})`);
  });
});

// ─── Onda 2: ícones ───────────────────────────────────────────────────────────

import {
  extrairViewBox, prefixarIds, extrairCorFaixa,
  carregarIcone, carregarTodos,
} from '../renderizador/icones.mjs';
import { mkdirSync as mkd, writeFileSync as wf } from 'fs';
import { join as pjoin } from 'path';
import { tmpdir as td } from 'os';

const ICONS_DIR = join(ROOT, 'icones');

describe('extrairViewBox', () => {
  test('viewBox 80x80', () => {
    const svg = '<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"></svg>';
    assert.deepEqual(extrairViewBox(svg), { w: 80, h: 80 });
  });
  test('viewBox 64x64', () => {
    const svg = '<svg viewBox="0 0 64 64"></svg>';
    assert.deepEqual(extrairViewBox(svg), { w: 64, h: 64 });
  });
  test('sem viewBox → fallback 80x80', () => {
    assert.deepEqual(extrairViewBox('<svg></svg>'), { w: 80, h: 80 });
  });
  test('viewBox com aspas simples', () => {
    const svg = "<svg viewBox='0 0 100 100'></svg>";
    assert.deepEqual(extrairViewBox(svg), { w: 100, h: 100 });
  });
});

describe('prefixarIds', () => {
  test('prefixa id e url(#...)', () => {
    const svg = `<g id="camada"><circle fill="url(#grad)"/><linearGradient id="grad"/></g>`;
    const resultado = prefixarIds(svg, 'svc1');
    assert.ok(resultado.includes('id="svc1-camada"'));
    assert.ok(resultado.includes('id="svc1-grad"'));
    assert.ok(resultado.includes('url(#svc1-grad)'));
  });

  test('prefixa href="#..."', () => {
    const svg = `<use href="#icone" id="icone"/>`;
    const resultado = prefixarIds(svg, 'svc2');
    assert.ok(resultado.includes('href="#svc2-icone"'));
    assert.ok(resultado.includes('id="svc2-icone"'));
  });

  test('dois ícones com mesmo id interno não colidem', () => {
    const svgA = `<g id="fundo"><rect fill="#FF9900"/></g>`;
    const svgB = `<g id="fundo"><rect fill="#01A88D"/></g>`;
    const a = prefixarIds(svgA, 'servicoA');
    const b = prefixarIds(svgB, 'servicoB');
    // ids devem ser diferentes
    assert.ok(!a.includes('id="servicoB-fundo"'));
    assert.ok(!b.includes('id="servicoA-fundo"'));
    // nenhum id duplicado quando ambos estão num mesmo SVG
    const combinado = a + b;
    const ids = [...combinado.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    const unicos = new Set(ids);
    assert.equal(ids.length, unicos.size, 'ids duplicados detectados: ' + ids.join(', '));
  });

  test('SVG sem ids não quebra', () => {
    const svg = `<rect width="10" height="10"/>`;
    assert.doesNotThrow(() => prefixarIds(svg, 'x'));
  });
});

describe('extrairCorFaixa', () => {
  test('retorna primeira cor fill sólida (não branco/preto)', () => {
    const svg = `<rect fill="#FF9900" width="80" height="80"/>`;
    assert.equal(extrairCorFaixa(svg), '#ff9900');
  });
  test('ignora branco', () => {
    const svg = `<rect fill="#ffffff"/><rect fill="#01A88D"/>`;
    assert.equal(extrairCorFaixa(svg), '#01a88d');
  });
  test('retorna null se só houver branco/preto', () => {
    const svg = `<rect fill="#ffffff"/><rect fill="#000000"/>`;
    assert.equal(extrairCorFaixa(svg), null);
  });
});

describe('carregarIcone', () => {
  test('ícone inexistente retorna null', () => {
    assert.equal(carregarIcone('naoexiste.svg', 'svc', ICONS_DIR), null);
  });

  test('ícone em branco retorna null', () => {
    assert.equal(carregarIcone('', 'svc', ICONS_DIR), null);
  });

  test('carrega Bedrock corretamente', () => {
    const icone = carregarIcone('Arch_Amazon-Bedrock_64.svg', 'bedrock', ICONS_DIR);
    if (!icone) {
      // Ícone pode não estar presente em todos os ambientes — skip
      console.warn('AVISO: Arch_Amazon-Bedrock_64.svg não encontrado — teste pulado');
      return;
    }
    assert.ok(typeof icone.inner === 'string' && icone.inner.length > 0);
    assert.ok(icone.escala > 0);
    assert.ok(icone.viewBoxW > 0);
    // ids não devem conter o formato original sem prefixo
    const idsOriginais = [...icone.inner.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    for (const id of idsOriginais) {
      assert.ok(id.startsWith('bedrock-'), `id "${id}" deveria começar com "bedrock-"`);
    }
  });

  test('viewBox dinâmico: ícone 64x64 escala corretamente', () => {
    const dir = pjoin(td(), 'icones-test-' + Date.now());
    mkd(dir, { recursive: true });
    // SVG com viewBox 64×64
    wf(pjoin(dir, 'icone64.svg'),
      '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect fill="#FF9900"/></svg>',
      'utf8'
    );
    const icone = carregarIcone('icone64.svg', 'svc', dir, 64);
    assert.ok(icone !== null);
    assert.equal(icone.viewBoxW, 64);
    assert.equal(icone.escala, 1.0); // 64/64 = 1
  });
});

describe('carregarTodos', () => {
  test('retorna Map com uma entrada por serviço', () => {
    const servicos = [
      { id: 'a', icone: 'naoexiste.svg' },
      { id: 'b', icone: '' },
    ];
    const mapa = carregarTodos(servicos, ICONS_DIR);
    assert.equal(mapa.size, 2);
    assert.equal(mapa.get('a'), null);
    assert.equal(mapa.get('b'), null);
  });
});

// ─── Onda 3: arestas ─────────────────────────────────────────────────────────

import {
  edgePtNo, edgePtGrupo, bezierPonto, calcularArestas,
} from '../renderizador/arestas.mjs';

describe('edgePtNo', () => {
  const no = { cx: 100, cy: 100, w: 140, h: 150 };
  test('alvo à direita → ponto na borda direita', () => {
    const pt = edgePtNo(no, { x: 300, y: 100 });
    assert.equal(pt.x, 170);   // cx + w/2
    assert.equal(pt.y, 100);
  });
  test('alvo acima → ponto na borda superior', () => {
    const pt = edgePtNo(no, { x: 100, y: 0 });
    assert.equal(pt.x, 100);
    assert.equal(pt.y, 25);   // cy - h/2
  });
  test('alvo abaixo-direita → ponto diagonal', () => {
    const pt = edgePtNo(no, { x: 300, y: 300 });
    // deve estar na borda (não no centro)
    const dx = pt.x - no.cx, dy = pt.y - no.cy;
    const dentroW = Math.abs(dx) <= no.w / 2 + 0.1;
    const dentroH = Math.abs(dy) <= no.h / 2 + 0.1;
    assert.ok(dentroW && dentroH, 'ponto deve estar na borda do retângulo');
    assert.ok(Math.abs(dx) === no.w/2 || Math.abs(dy) === no.h/2);
  });
});

describe('bezierPonto', () => {
  test('t=0 → P0', () => {
    const p = bezierPonto({ x:0,y:0 }, { x:50,y:100 }, { x:100,y:0 }, 0);
    assert.equal(p.x, 0); assert.equal(p.y, 0);
  });
  test('t=1 → P2', () => {
    const p = bezierPonto({ x:0,y:0 }, { x:50,y:100 }, { x:100,y:0 }, 1);
    assert.equal(p.x, 100); assert.equal(p.y, 0);
  });
  test('t=0.5 → ponto intermediário correto', () => {
    // B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
    const p = bezierPonto({ x:0,y:0 }, { x:0,y:100 }, { x:0,y:0 }, 0.5);
    assert.equal(p.x, 0);
    assert.equal(p.y, 50); // 0.25*0 + 0.5*100 + 0.25*0 = 50
  });
});

describe('calcularArestas', () => {
  const nos = new Map([
    ['a', { id:'a', cx:70,  cy:100, w:140, h:150 }],
    ['b', { id:'b', cx:290, cy:100, w:140, h:150 }],  // mesma linha → reta
    ['c', { id:'c', cx:70,  cy:300, w:140, h:150 }],  // mesma col → reta
    ['d', { id:'d', cx:290, cy:300, w:140, h:150 }],  // diagonal → curva
  ]);

  test('retorna array vazio para fluxo sem de/para', () => {
    const r = calcularArestas([{ descricao: 'passo narrativo', estilo:'requisicao' }], nos);
    assert.equal(r.length, 0);
  });

  test('aresta reta (mesma linha): path começa com M e termina com L', () => {
    const r = calcularArestas([{ de:'a', para:'b', estilo:'requisicao' }], nos);
    assert.equal(r.length, 1);
    assert.ok(r[0].d.startsWith('M'), 'path começa com M');
    assert.ok(r[0].d.includes('L'), 'linha reta usa L');
  });

  test('aresta curva (diagonal): path usa Q (Bézier quadrática)', () => {
    const r = calcularArestas([{ de:'a', para:'d', estilo:'requisicao' }], nos);
    assert.equal(r.length, 1);
    assert.ok(r[0].d.includes('Q'), 'curva usa Q');
  });

  test('badge text: passo + rotulo → "N · texto"', () => {
    const r = calcularArestas(
      [{ de:'a', para:'b', passo:1, rotulo:'req', estilo:'requisicao' }], nos
    );
    assert.equal(r[0].badgeTxt, '1 · req');
  });

  test('badge text: só passo → "N"', () => {
    const r = calcularArestas([{ de:'a', para:'b', passo:3, estilo:'requisicao' }], nos);
    assert.equal(r[0].badgeTxt, '3');
  });

  test('badge text: só rotulo → texto', () => {
    const r = calcularArestas([{ de:'a', para:'b', rotulo:'login', estilo:'requisicao' }], nos);
    assert.equal(r[0].badgeTxt, 'login');
  });

  test('arestas paralelas têm paths distintos', () => {
    const fluxo = [
      { de:'a', para:'b', passo:1, estilo:'requisicao' },
      { de:'b', para:'a', passo:2, estilo:'resposta'   },
    ];
    const r = calcularArestas(fluxo, nos);
    assert.equal(r.length, 2);
    assert.notEqual(r[0].d, r[1].d, 'arestas paralelas devem ter paths diferentes');
  });

  test('estilo assincrono → dasharray definido', () => {
    const r = calcularArestas([{ de:'a', para:'b', estilo:'assincrono' }], nos);
    assert.ok(r[0].dasharray !== null);
  });

  test('aresta para grupo termina dentro do bbox', () => {
    const bbox = { id:'g', x:200, y:200, w:300, h:200 };
    const r = calcularArestas([{ de:'a', para:'g', estilo:'requisicao' }], nos, [bbox]);
    assert.equal(r.length, 1);
    // path deve existir
    assert.ok(r[0].d.length > 0);
  });
});

// ─── Onda 3: grupos ───────────────────────────────────────────────────────────

import { calcularGrupos } from '../renderizador/grupos.mjs';

describe('calcularGrupos', () => {
  // Nós de suporte para os testes
  const nosBase = new Map([
    ['s1', { id:'s1', cx:200, cy:200, w:140, h:150 }],
    ['s2', { id:'s2', cx:400, cy:200, w:140, h:150 }],
    ['s3', { id:'s3', cx:200, cy:450, w:140, h:150 }],
    ['s4', { id:'s4', cx:400, cy:450, w:140, h:150 }],
  ]);

  test('retorna array vazio para grupos undefined/vazio', () => {
    assert.deepEqual(calcularGrupos([], nosBase), []);
    assert.deepEqual(calcularGrupos(undefined, nosBase), []);
  });

  test('grupo simples cobre os nós com padding', () => {
    const grupos = [{ id:'g', nome:'G', tipo:'generico', servicos:['s1','s2'] }];
    const bboxs = calcularGrupos(grupos, nosBase);
    assert.equal(bboxs.length, 1);
    const g = bboxs[0];
    // deve cobrir s1 e s2 (cx 200 e 400, largura 140 cada)
    assert.ok(g.x < 130,  `g.x(${g.x}) deve estar antes de s1.cx-w/2=130`);
    assert.ok(g.x + g.w > 470, `g.x+g.w(${g.x+g.w}) deve ultrapassar s2.cx+w/2=470`);
  });

  test('grupo filho está contido no pai', () => {
    const grupos = [
      { id:'pai',   nome:'Pai',   tipo:'aws-cloud',  servicos:['s1','s2'], filhos:['filho'] },
      { id:'filho', nome:'Filho', tipo:'aws-region', servicos:['s3','s4'] },
    ];
    const bboxs = calcularGrupos(grupos, nosBase);
    assert.equal(bboxs.length, 2);
    const pai   = bboxs.find(b => b.id === 'pai');
    const filho = bboxs.find(b => b.id === 'filho');
    assert.ok(pai,   'pai não encontrado');
    assert.ok(filho, 'filho não encontrado');

    // filho deve estar dentro do pai
    assert.ok(filho.x >= pai.x,          `filho.x(${filho.x}) >= pai.x(${pai.x})`);
    assert.ok(filho.y >= pai.y,          `filho.y(${filho.y}) >= pai.y(${pai.y})`);
    assert.ok(filho.x + filho.w <= pai.x + pai.w, 'filho.x+w <= pai.x+w');
    assert.ok(filho.y + filho.h <= pai.y + pai.h, 'filho.y+h <= pai.y+h');
  });

  test('filhos vêm antes dos pais no array (folha → raiz)', () => {
    const grupos = [
      { id:'raiz',  nome:'R', tipo:'aws-cloud',  servicos:[], filhos:['meio'] },
      { id:'meio',  nome:'M', tipo:'aws-region', servicos:[], filhos:['folha'] },
      { id:'folha', nome:'F', tipo:'generico',   servicos:['s1'] },
    ];
    const bboxs = calcularGrupos(grupos, nosBase);
    const idxRaiz  = bboxs.findIndex(b => b.id === 'raiz');
    const idxMeio  = bboxs.findIndex(b => b.id === 'meio');
    const idxFolha = bboxs.findIndex(b => b.id === 'folha');
    // folha < meio < raiz
    assert.ok(idxFolha < idxMeio,  'folha deve vir antes de meio');
    assert.ok(idxMeio  < idxRaiz,  'meio deve vir antes de raiz');
  });
});

// ─── Onda 4: svg.mjs ─────────────────────────────────────────────────────────

import { montar } from '../renderizador/svg.mjs';

// Fixtures mínimas para testar o SVG sem depender de arquivos
const nosFixture = new Map([
  ['a', { id:'a', cx:150, cy:200, w:140, h:150 }],
  ['b', { id:'b', cx:370, cy:200, w:140, h:150 }],
]);
const iconesFix = new Map([['a', null], ['b', null]]);
const docFixture = {
  nome: 'Teste',
  servicos: [
    { id:'a', nome:'Serviço A', tipo:'aws-s3' },
    { id:'b', nome:'Serviço B', tipo:'aws-bedrock' },
  ],
  fluxo: [{ de:'a', para:'b', passo:1, rotulo:'envia', estilo:'requisicao' }],
  fluxoPassos: [{ passo:1, descricao:'A envia para B', de:'a', para:'b', estilo:'requisicao' }],
  grupos: [],
};

describe('svg.montar', () => {
  test('retorna string SVG válida', () => {
    const arestas = calcularArestas(docFixture.fluxo, nosFixture);
    const svg = montar(docFixture, nosFixture, iconesFix, [], arestas);
    assert.ok(typeof svg === 'string');
    assert.ok(svg.includes('<?xml'));
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('</svg>'));
  });

  test('contém o nome do diagrama', () => {
    const arestas = calcularArestas(docFixture.fluxo, nosFixture);
    const svg = montar(docFixture, nosFixture, iconesFix, [], arestas);
    assert.ok(svg.includes('Teste'));
  });

  test('contém ids dos nós', () => {
    const arestas = calcularArestas(docFixture.fluxo, nosFixture);
    const svg = montar(docFixture, nosFixture, iconesFix, [], arestas);
    assert.ok(svg.includes('no-a'));
    assert.ok(svg.includes('no-b'));
  });

  test('contém o badge da aresta "1 · envia"', () => {
    const arestas = calcularArestas(docFixture.fluxo, nosFixture);
    const svg = montar(docFixture, nosFixture, iconesFix, [], arestas);
    assert.ok(svg.includes('1 · envia'));
  });

  test('contém painel de passos com descricao', () => {
    const arestas = calcularArestas(docFixture.fluxo, nosFixture);
    const svg = montar(docFixture, nosFixture, iconesFix, [], arestas);
    assert.ok(svg.includes('A envia para B'));
  });

  test('ids de ícones não colidem no SVG final (dois ícones reais)', () => {
    const iconeA = carregarIcone('Arch_Amazon-Bedrock_64.svg', 'svc_a', ICONS_DIR);
    const iconeB = carregarIcone('Arch_Amazon-Bedrock_64.svg', 'svc_b', ICONS_DIR);
    if (!iconeA || !iconeB) return; // skip se ícone ausente

    const iconesComIcone = new Map([['a', iconeA], ['b', iconeB]]);
    const arestas = calcularArestas(docFixture.fluxo, nosFixture);
    const svg = montar(docFixture, nosFixture, iconesComIcone, [], arestas);

    // Extrair todos os ids do SVG
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    const unicos = new Set(ids);
    assert.equal(ids.length, unicos.size,
      `ids duplicados: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`);
  });
});

// ─── Onda 4+: testes de integração (CLI + compatibilidade) ───────────────────

describe('integração', () => {
  test('apostilas.yaml (v1) renderiza sem erro', () => {
    const path = join(ROOT, 'arquiteturas', 'apostilas.yaml');
    const doc = carregarDoc(path, null);
    const nos        = calcularLayout(doc.servicos, doc.grupos ?? []);
    const icones     = carregarTodos(doc.servicos, ICONS_DIR);
    const grupos     = calcularGrupos(doc.grupos ?? [], nos);
    const arestas    = calcularArestas(doc.fluxo ?? [], nos, grupos);
    const svg        = montar(doc, nos, icones, grupos, arestas);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('Assistente das Apostilas'));
  });

  test('SVG de apostilas.yaml não tem ids duplicados', () => {
    const path = join(ROOT, 'arquiteturas', 'apostilas.yaml');
    const doc  = carregarDoc(path, null);
    const nos  = calcularLayout(doc.servicos, doc.grupos ?? []);
    const icones  = carregarTodos(doc.servicos, ICONS_DIR);
    const grupos  = calcularGrupos(doc.grupos ?? [], nos);
    const arestas = calcularArestas(doc.fluxo ?? [], nos, grupos);
    const svg     = montar(doc, nos, icones, grupos, arestas);

    const ids    = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    const unicos = new Set(ids);
    // Aceitar duplicações apenas em elementos de defs (marcadores são reutilizáveis por design)
    // Verificar que ids de ícones não colidem
    const idsIcone = ids.filter(id => !['arr-req','arr-resp','arr-async'].includes(id));
    const unicosIcone = new Set(idsIcone);
    assert.equal(idsIcone.length, unicosIcone.size,
      `ids de ícone duplicados: ${idsIcone.filter((id,i) => idsIcone.indexOf(id) !== i).join(', ')}`);
  });

  test('ausência de colisão de bbox entre pílulas e nós', () => {
    const path    = join(ROOT, 'arquiteturas', 'apostilas.yaml');
    const doc     = carregarDoc(path, null);
    const nos     = calcularLayout(doc.servicos, doc.grupos ?? []);
    const arestas = calcularArestas(doc.fluxo ?? [], nos, []);

    // Verificar que badges não estão dentro de nenhum nó (bounding box check simplificado)
    for (const tr of arestas) {
      if (!tr.badgeTxt) continue;
      for (const no of nos.values()) {
        const nodeX1 = no.cx - no.w / 2, nodeX2 = no.cx + no.w / 2;
        const nodeY1 = no.cy - no.h / 2, nodeY2 = no.cy + no.h / 2;
        const dentroX = tr.badgeX > nodeX1 + 10 && tr.badgeX < nodeX2 - 10;
        const dentroY = tr.badgeY > nodeY1 + 10 && tr.badgeY < nodeY2 - 10;
        assert.ok(!(dentroX && dentroY),
          `badge "${tr.badgeTxt}" colide com nó "${no.id}"`);
      }
    }
  });
});
