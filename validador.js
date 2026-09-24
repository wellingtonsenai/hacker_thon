#!/usr/bin/env node
/**
 * Dev Validador — verifica se os ícones referenciados em um YAML de caso de uso
 * existem dentro da pasta `icones/`.
 *
 * Uso:
 *   node validador.js [caminho-do-yaml]
 *
 * Se nenhum caminho for passado, varre todos os arquivos .yaml em casos/
 */

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─── configuração ───────────────────────────────────────────────────────────

const ROOT       = __dirname;
const ICONES_DIR = path.join(ROOT, 'icones');
const CASOS_DIR  = path.join(ROOT, 'casos');

// Extensões aceitas para ícones
const EXTENSOES_VALIDAS = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];

// ─── utilitários ─────────────────────────────────────────────────────────────

/**
 * Retorna o conjunto de nomes de arquivo (sem extensão e com extensão)
 * disponíveis na pasta de ícones.
 */
function carregarIconesDisponiveis() {
  if (!fs.existsSync(ICONES_DIR)) {
    return { porNome: new Set(), porArquivo: new Set() };
  }

  const arquivos = fs.readdirSync(ICONES_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return EXTENSOES_VALIDAS.includes(ext);
  });

  const porNome    = new Set(arquivos.map(f => path.basename(f, path.extname(f)).toLowerCase()));
  const porArquivo = new Set(arquivos.map(f => f.toLowerCase()));

  return { porNome, porArquivo };
}

/**
 * Varre recursivamente um objeto JS e coleta todos os valores de chaves
 * que indicam ícone: `icone`, `icon`, `icon_file`, `imagem`, `image`.
 */
function extrairReferenciaDeIcones(obj, refs = []) {
  if (obj === null || obj === undefined) return refs;

  if (typeof obj === 'string') return refs;

  if (Array.isArray(obj)) {
    obj.forEach(item => extrairReferenciaDeIcones(item, refs));
    return refs;
  }

  if (typeof obj === 'object') {
    const chavesDeIcone = ['icone', 'icon', 'icon_file', 'imagem', 'image', 'logo'];

    for (const [chave, valor] of Object.entries(obj)) {
      if (chavesDeIcone.includes(chave.toLowerCase()) && typeof valor === 'string') {
        refs.push({ chave, valor });
      } else {
        extrairReferenciaDeIcones(valor, refs);
      }
    }
  }

  return refs;
}

// ─── validação ───────────────────────────────────────────────────────────────

/**
 * Valida um arquivo YAML e retorna um relatório de validação.
 *
 * @param {string} caminhoYaml - Caminho absoluto para o arquivo .yaml
 * @returns {{ arquivo: string, refs: Array, ok: number, ausentes: Array, erros: string[] }}
 */
function validarYaml(caminhoYaml) {
  const resultado = {
    arquivo: path.relative(ROOT, caminhoYaml),
    refs: [],
    ok: 0,
    ausentes: [],
    erros: [],
  };

  // Leitura do arquivo
  let conteudo;
  try {
    conteudo = fs.readFileSync(caminhoYaml, 'utf8');
  } catch (e) {
    resultado.erros.push(`Não foi possível ler o arquivo: ${e.message}`);
    return resultado;
  }

  // Parse do YAML
  let documento;
  try {
    documento = yaml.load(conteudo);
  } catch (e) {
    resultado.erros.push(`YAML inválido: ${e.message}`);
    return resultado;
  }

  // Extração das referências de ícone
  resultado.refs = extrairReferenciaDeIcones(documento);

  if (resultado.refs.length === 0) {
    resultado.erros.push('Nenhuma referência de ícone encontrada no YAML.');
    return resultado;
  }

  // Checagem de existência
  const { porNome, porArquivo } = carregarIconesDisponiveis();

  for (const ref of resultado.refs) {
    const valorLower    = ref.valor.toLowerCase();
    const semExtensao   = path.basename(valorLower, path.extname(valorLower));
    const nomeArquivo   = path.basename(valorLower);

    const existe =
      porArquivo.has(nomeArquivo) ||   // nome exato com extensão
      porNome.has(semExtensao)    ||   // nome sem extensão
      porArquivo.has(valorLower);      // caminho relativo completo

    if (existe) {
      resultado.ok += 1;
    } else {
      resultado.ausentes.push(ref);
    }
  }

  return resultado;
}

// ─── formatação do relatório ─────────────────────────────────────────────────

const COR = {
  reset:  '\x1b[0m',
  verde:  '\x1b[32m',
  vermelho: '\x1b[31m',
  amarelo: '\x1b[33m',
  azul:   '\x1b[34m',
  negrito: '\x1b[1m',
  cinza:  '\x1b[90m',
};

function imprimirRelatorio(resultado) {
  const { arquivo, refs, ok, ausentes, erros } = resultado;
  const total = refs.length;

  console.log(`\n${COR.negrito}${COR.azul}📄 ${arquivo}${COR.reset}`);
  console.log(`${COR.cinza}${'─'.repeat(50)}${COR.reset}`);

  if (erros.length > 0) {
    erros.forEach(e => console.log(`  ${COR.amarelo}⚠ ${e}${COR.reset}`));
  }

  if (total === 0) {
    console.log(`  ${COR.cinza}Sem ícones para validar.${COR.reset}`);
    return;
  }

  console.log(`  ${COR.cinza}Total de referências: ${total}${COR.reset}`);

  if (ok > 0) {
    console.log(`  ${COR.verde}✔ Encontrados: ${ok}${COR.reset}`);
  }

  if (ausentes.length > 0) {
    console.log(`  ${COR.vermelho}✘ Ausentes: ${ausentes.length}${COR.reset}`);
    ausentes.forEach(ref => {
      console.log(`    ${COR.vermelho}→ [${ref.chave}] "${ref.valor}"${COR.reset}`);
    });
  } else if (total > 0) {
    console.log(`  ${COR.verde}✔ Todos os ícones existem!${COR.reset}`);
  }
}

// ─── execução principal ───────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

  let arquivos = [];

  if (args.length > 0) {
    // Arquivo(s) passados como argumento
    arquivos = args.map(a => path.resolve(a));
  } else {
    // Varre todos os .yaml em casos/
    if (!fs.existsSync(CASOS_DIR)) {
      console.error(`${COR.vermelho}Pasta "casos/" não encontrada.${COR.reset}`);
      process.exit(1);
    }

    arquivos = fs.readdirSync(CASOS_DIR)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map(f => path.join(CASOS_DIR, f));

    if (arquivos.length === 0) {
      console.log(`${COR.amarelo}Nenhum arquivo .yaml encontrado em casos/${COR.reset}`);
      process.exit(0);
    }
  }

  console.log(`\n${COR.negrito}╔══════════════════════════════════════════╗`);
  console.log(`║   Dev Validador — Checagem de Ícones     ║`);
  console.log(`╚══════════════════════════════════════════╝${COR.reset}`);
  console.log(`${COR.cinza}Pasta de ícones: ${path.relative(ROOT, ICONES_DIR)}${COR.reset}`);

  const resultados = arquivos.map(validarYaml);
  resultados.forEach(imprimirRelatorio);

  // Resumo final
  const totalAusentes = resultados.reduce((acc, r) => acc + r.ausentes.length, 0);
  const totalOk       = resultados.reduce((acc, r) => acc + r.ok, 0);
  const totalRefs     = resultados.reduce((acc, r) => acc + r.refs.length, 0);

  console.log(`\n${COR.negrito}${COR.cinza}${'═'.repeat(50)}${COR.reset}`);
  console.log(`${COR.negrito}Resumo: ${totalRefs} referências | ${COR.verde}${totalOk} OK${COR.reset}${COR.negrito} | ${totalAusentes > 0 ? COR.vermelho : COR.verde}${totalAusentes} ausentes${COR.reset}`);

  // Código de saída: 0 = tudo ok, 1 = algum ícone ausente
  process.exit(totalAusentes > 0 ? 1 : 0);
}

main();
