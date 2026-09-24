/**
 * schema.mjs — Carregamento, normalização v1→v2 e validação de YAMLs de arquitetura AWS.
 *
 * Pipeline público:
 *   carregarDoc(yamlPath, iconsDir?) → doc normalizado e validado
 *
 * Lança ValidacaoError para erros; usa console.warn para avisos.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const yaml    = require('js-yaml');

// ─── Erro de validação ─────────────────────────────────────────────────────────

export class ValidacaoError extends Error {
  /**
   * @param {string} arquivo  caminho do arquivo YAML
   * @param {string} caminho  caminho do campo (ex: "fluxo[2].para")
   * @param {string} motivo   descrição humana do problema
   */
  constructor(arquivo, caminho, motivo) {
    super(`[${arquivo}] ${caminho}: ${motivo}`);
    this.name    = 'ValidacaoError';
    this.arquivo = arquivo;
    this.caminho = caminho;
    this.motivo  = motivo;
  }
}

// ─── Tipos de serviços conhecidos (usado para aviso de tipo desconhecido) ──────

const TIPOS_CONHECIDOS = new Set([
  'aws-api-gateway', 'aws-cognito', 'aws-agentcore-runtime', 'aws-bedrock',
  'aws-s3', 'aws-opensearch', 'aws-lambda', 'aws-cloudfront', 'aws-dynamodb',
  'aws-ecs', 'aws-fargate', 'aws-ec2', 'aws-rds', 'aws-sqs', 'aws-sns',
  'aws-iam', 'aws-vpc', 'aws-alb', 'aws-eventbridge', 'aws-step-functions',
  'aws-kinesis', 'aws-glue', 'aws-athena', 'aws-redshift', 'aws-emr',
  'usuarios',
]);

// ─── Detecção de versão ────────────────────────────────────────────────────────

/**
 * Retorna 1 ou 2 baseado na presença do campo `versao`.
 * v1 não tem o campo; v2 declara `versao: 2`.
 * @param {object} doc
 * @returns {1|2}
 */
export function detectarVersao(doc) {
  if (doc.versao === 2) return 2;
  if (doc.versao !== undefined && doc.versao !== 2) {
    console.warn(`AVISO: versao "${doc.versao}" desconhecida — tratando como v1`);
  }
  return 1;
}

// ─── Normalização v1 → v2 ─────────────────────────────────────────────────────

/**
 * Converte um documento v1 (com `conexoes` nos serviços) para o formato v2
 * (com `fluxo[]` no topo). Mutação in-place; retorna o doc modificado.
 * @param {object} doc
 * @returns {object}
 */
export function normalizarV1(doc) {
  if (!doc.fluxo) doc.fluxo = [];

  for (const svc of (doc.servicos ?? [])) {
    for (const conn of (svc.conexoes ?? [])) {
      doc.fluxo.push({
        de:     svc.id,
        para:   conn.destino,
        passo:  conn.passo,
        rotulo: conn.rotulo,
        estilo: conn.estilo === 'tracejado' ? 'assincrono' : (conn.estilo ?? 'requisicao'),
        rota:   conn.rota,
      });
    }
    // Remove conexoes do serviço para evitar processamento duplo
    delete svc.conexoes;
  }

  doc.versao = 2;
  return doc;
}

// ─── Normalização do fluxo (v2 já normalizado) ────────────────────────────────

/**
 * Normaliza entradas do fluxo v2:
 * - `tracejado` → `assincrono`
 * - Entradas sem `de`/`para` → aviso + descarta como aresta (mantém para painel de passos)
 * - Sem `estilo` → padrão `requisicao`
 * @param {object} doc
 * @param {string} arquivo  para mensagens de aviso
 * @returns {object}
 */
export function normalizarFluxo(doc, arquivo = '') {
  const fluxoOriginal = doc.fluxo ?? [];
  doc.fluxoPassos = [];   // entradas só com descricao (para painel de passos)
  doc.fluxo = [];         // entradas com de/para (arestas reais)

  for (let i = 0; i < fluxoOriginal.length; i++) {
    const entrada = fluxoOriginal[i];

    // Normalizar alias tracejado → assincrono
    if (entrada.estilo === 'tracejado') entrada.estilo = 'assincrono';

    // Sem estilo → padrão
    if (!entrada.estilo) entrada.estilo = 'requisicao';

    if (!entrada.de || !entrada.para) {
      if (entrada.descricao) {
        // Só descrição — vai para painel de passos
        doc.fluxoPassos.push(entrada);
      } else {
        console.warn(`AVISO [${arquivo}] fluxo[${i}]: sem "de"/"para" e sem "descricao" — ignorado`);
      }
      continue;
    }

    doc.fluxo.push(entrada);

    // Entradas com de/para também vão para painel de passos se tiverem descricao
    if (entrada.descricao) {
      doc.fluxoPassos.push(entrada);
    }
  }

  return doc;
}

// ─── Validação ────────────────────────────────────────────────────────────────

/**
 * Valida o documento normalizado.
 * Lança ValidacaoError para erros.
 * Usa console.warn para avisos.
 * @param {object} doc
 * @param {string} arquivo
 * @param {string|null} iconsDir  pasta de ícones; null = pular checagem de ícones
 */
export function validar(doc, arquivo, iconsDir = null) {
  const servicos = doc.servicos ?? [];
  const fluxo    = doc.fluxo    ?? [];
  const grupos   = doc.grupos   ?? [];

  // REQ-03-1: servicos vazio
  if (servicos.length === 0) {
    throw new ValidacaoError(arquivo, 'servicos', 'lista não pode estar vazia');
  }

  // Conjuntos de ids para checagem rápida
  const idsServicos = new Set(servicos.map(s => s.id));
  const idsGrupos   = new Set(grupos.map(g => g.id));
  const idsValidos  = new Set([...idsServicos, ...idsGrupos]);

  // REQ-03-4: tipo desconhecido (aviso)
  for (let i = 0; i < servicos.length; i++) {
    const svc = servicos[i];
    if (svc.tipo && !TIPOS_CONHECIDOS.has(svc.tipo)) {
      console.warn(`AVISO [${arquivo}] servicos[${i}].tipo: "${svc.tipo}" desconhecido — faixa usará cor padrão`);
    }
  }

  // REQ-03-2: ícone não encontrado
  if (iconsDir) {
    for (let i = 0; i < servicos.length; i++) {
      const svc = servicos[i];
      if (svc.icone && svc.icone !== '') {
        const caminhoIcone = join(iconsDir, svc.icone);
        if (!existsSync(caminhoIcone)) {
          throw new ValidacaoError(
            arquivo,
            `servicos[${i}].icone`,
            `"${svc.icone}" não encontrado em ${iconsDir}`
          );
        }
      }
    }
  }

  // REQ-03-3: passo duplicado
  const passosVistos = new Map(); // passo → índice
  for (let i = 0; i < fluxo.length; i++) {
    const entrada = fluxo[i];
    if (entrada.passo !== undefined && entrada.passo !== null) {
      if (passosVistos.has(entrada.passo)) {
        throw new ValidacaoError(
          arquivo,
          `fluxo[${i}].passo`,
          `valor ${entrada.passo} já usado em fluxo[${passosVistos.get(entrada.passo)}]`
        );
      }
      passosVistos.set(entrada.passo, i);
    }
  }

  // REQ-03-1: de/para inexistente
  for (let i = 0; i < fluxo.length; i++) {
    const entrada = fluxo[i];
    if (entrada.de && !idsValidos.has(entrada.de)) {
      throw new ValidacaoError(
        arquivo,
        `fluxo[${i}].de`,
        `id "${entrada.de}" não existe em servicos nem grupos`
      );
    }
    if (entrada.para && !idsValidos.has(entrada.para)) {
      throw new ValidacaoError(
        arquivo,
        `fluxo[${i}].para`,
        `id "${entrada.para}" não existe em servicos nem grupos`
      );
    }
  }

  // Grupos: ids de serviços dentro de grupos existem
  for (let g = 0; g < grupos.length; g++) {
    const grp = grupos[g];
    for (const sid of (grp.servicos ?? [])) {
      if (!idsServicos.has(sid)) {
        console.warn(`AVISO [${arquivo}] grupos[${g}].servicos: id "${sid}" não encontrado em servicos`);
      }
    }
    for (const fid of (grp.filhos ?? [])) {
      if (!idsGrupos.has(fid)) {
        console.warn(`AVISO [${arquivo}] grupos[${g}].filhos: id "${fid}" não encontrado em grupos`);
      }
    }
  }
}

// ─── Pipeline público ─────────────────────────────────────────────────────────

/**
 * Carrega, normaliza e valida um YAML de arquitetura.
 *
 * @param {string} yamlPath   caminho absoluto ou relativo ao arquivo YAML
 * @param {string|null} iconsDir  pasta de ícones para checagem; null = pular
 * @returns {object}          documento normalizado e validado
 * @throws {ValidacaoError}   em caso de erro de validação
 * @throws {Error}            em caso de erro de leitura ou parse YAML
 */
export function carregarDoc(yamlPath, iconsDir = null) {
  const caminhoResolvido = resolve(yamlPath);
  const arquivo = yamlPath; // manter relativo nas mensagens

  // Leitura
  let conteudo;
  try {
    conteudo = readFileSync(caminhoResolvido, 'utf8');
  } catch (e) {
    throw new Error(`Não foi possível ler "${yamlPath}": ${e.message}`);
  }

  // Parse
  let doc;
  try {
    doc = yaml.load(conteudo);
  } catch (e) {
    throw new Error(`YAML inválido em "${yamlPath}": ${e.message}`);
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error(`"${yamlPath}" não contém um objeto YAML válido`);
  }

  // Normalização
  const versao = detectarVersao(doc);
  if (versao === 1) {
    normalizarV1(doc);
  }
  normalizarFluxo(doc, arquivo);

  // Validação
  validar(doc, arquivo, iconsDir);

  return doc;
}
