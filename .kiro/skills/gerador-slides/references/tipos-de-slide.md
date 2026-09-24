# Tipos de slide — referência gerada do código

> Gerado por `python -m slides.catalogo`. Não edite à mão.

| Tipo | Quando usar |
|---|---|
| `capa` | Primeiro slide: título, subtítulo e autor sobre o fundo em ondas. |
| `encerramento` | Slide final só com os logos LAB365 e SENAI. |
| `fechamento` | Último slide de conteúdo: mensagem final e até 3 números de impacto. |
| `secao` | Divide o deck em partes (fundo gradiente). Ícone e selo opcionais. |
| `cards` | 2 a 6 cards com ícone, rótulo, título e texto. O layout mais versátil. |
| `citacao` | Frase de impacto em destaque (com fonte) e até 3 cards de apoio abaixo. |
| `comparacao` | Duas colunas lado a lado (opção A x opção B), cada uma com linhas chave/valor. |
| `conteudo` | Título e até 6 tópicos, cada um com ícone. Para listas simples. |
| `diagrama` | Imagem (ex.: diagrama de arquitetura) sem distorção, com até 6 passos numerados ao lado. |
| `numeros` | 2 a 4 números de destaque em anéis coloridos, com legenda e fonte. |
| `processo` | Fluxo de 3 a 6 etapas em setas (chevrons) com ícone acima e texto abaixo. |

## Estrutura do deck

### `capa`

Primeiro slide: título, subtítulo e autor sobre o fundo em ondas.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `subtitulo`: texto ≤ 90 caracteres, opcional
- `autor`: texto ≤ 70 caracteres, opcional

Exemplo:
```yaml
- tipo: capa
  titulo: Energia solar no Brasil
  subtitulo: Como o sol virou a fonte que mais cresce no país
  autor: Grupo 1  ·  LAB365 × SENAI
```

### `encerramento`

Slide final só com os logos LAB365 e SENAI.

Campos:

Exemplo:
```yaml
- tipo: encerramento
```

### `fechamento`

Último slide de conteúdo: mensagem final e até 3 números de impacto.

Campos:
- `titulo`: texto ≤ 36 caracteres, obrigatório
- `subtitulo`: texto ≤ 90 caracteres, opcional
- `numeros`: lista de 0 a 3 itens, opcional
  - cada item:
    - `valor`: texto ≤ 7 caracteres, obrigatório
    - `rotulo`: texto ≤ 30 caracteres, obrigatório

Exemplo:
```yaml
- tipo: fechamento
  titulo: Obrigado!
  subtitulo: Perguntas?
  numeros:
  - valor: 90%
    rotulo: queda de custo desde 2010
```

### `secao`

Divide o deck em partes (fundo gradiente). Ícone e selo opcionais.

Campos:
- `titulo`: texto ≤ 36 caracteres, obrigatório
- `subtitulo`: texto ≤ 80 caracteres, opcional
- `icone`: ícone Lucide, opcional
- `selo`: texto ≤ 24 caracteres, opcional

Exemplo:
```yaml
- tipo: secao
  titulo: 'Bloco 1: o recurso'
  subtitulo: Por que o sol é a fonte mais abundante
  icone: sun
```

## Conteúdo

### `cards`

2 a 6 cards com ícone, rótulo, título e texto. O layout mais versátil.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `itens`: lista de 2 a 6 itens, obrigatório
  - cada item:
    - `icone`: ícone Lucide, obrigatório
    - `rotulo`: texto ≤ 22 caracteres, opcional
    - `titulo`: texto ≤ 30 caracteres, obrigatório
    - `texto`: texto ≤ 90 caracteres, obrigatório
    - `cor`: um de ['laranja', 'magenta', 'roxo', 'azul'], opcional — Força a cor do acento (senão segue a sequência laranja→magenta→roxo→azul)
- `nota`: nota de rodapé ≤ 120 caracteres, opcional — Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito).

Exemplo:
```yaml
- tipo: cards
  titulo: Os três pilares
  itens:
  - icone: sun
    rotulo: Fonte
    titulo: Radiação solar
    texto: Energia abundante e gratuita todos os dias.
  - icone: zap
    rotulo: Conversão
    titulo: Painel fotovoltaico
    texto: Transforma luz em eletricidade.
  - icone: battery-charging
    rotulo: Uso
    titulo: Armazenamento
    texto: Baterias guardam o excedente.
  nota: 'Resumo: fonte, conversão e uso formam o sistema.'
```

### `citacao`

Frase de impacto em destaque (com fonte) e até 3 cards de apoio abaixo.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `frase`: texto ≤ 140 caracteres, obrigatório
- `fonte`: texto ≤ 70 caracteres, opcional
- `cards`: lista de 0 a 3 itens, opcional
  - cada item:
    - `icone`: ícone Lucide, obrigatório
    - `rotulo`: texto ≤ 22 caracteres, opcional
    - `titulo`: texto ≤ 30 caracteres, obrigatório
    - `texto`: texto ≤ 90 caracteres, obrigatório
    - `cor`: um de ['laranja', 'magenta', 'roxo', 'azul'], opcional — Força a cor do acento (senão segue a sequência laranja→magenta→roxo→azul)
- `nota`: nota de rodapé ≤ 120 caracteres, opcional — Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito).

Exemplo:
```yaml
- tipo: citacao
  titulo: Por que isso importa
  frase: A energia solar é a eletricidade mais barata da história.
  fonte: IEA, World Energy Outlook 2020
```

### `comparacao`

Duas colunas lado a lado (opção A x opção B), cada uma com linhas chave/valor.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `esquerda`: objeto, obrigatório
  - `icone`: ícone Lucide, obrigatório
  - `rotulo`: texto ≤ 22 caracteres, opcional
  - `titulo`: texto ≤ 30 caracteres, obrigatório
  - `itens`: lista de 2 a 5 itens, obrigatório
    - cada item:
      - `chave`: texto ≤ 14 caracteres, obrigatório
      - `valor`: texto ≤ 42 caracteres, obrigatório
- `direita`: objeto, obrigatório
  - `icone`: ícone Lucide, obrigatório
  - `rotulo`: texto ≤ 22 caracteres, opcional
  - `titulo`: texto ≤ 30 caracteres, obrigatório
  - `itens`: lista de 2 a 5 itens, obrigatório
    - cada item:
      - `chave`: texto ≤ 14 caracteres, obrigatório
      - `valor`: texto ≤ 42 caracteres, obrigatório
- `separador`: texto ≤ 3 caracteres, opcional
- `nota`: nota de rodapé ≤ 120 caracteres, opcional — Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito).

Exemplo:
```yaml
- tipo: comparacao
  titulo: Fotovoltaica x térmica
  separador: x
  esquerda:
    icone: zap
    rotulo: Eletricidade
    titulo: Fotovoltaica
    itens:
    - chave: Gera
      valor: energia elétrica
    - chave: Eficiência
      valor: 15 a 23%
  direita:
    icone: thermometer-sun
    rotulo: Calor
    titulo: Térmica
    itens:
    - chave: Gera
      valor: água quente
    - chave: Custo
      valor: mais baixo
```

### `conteudo`

Título e até 6 tópicos, cada um com ícone. Para listas simples.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `bullets`: lista de 2 a 6 itens, obrigatório
  - cada item: texto ≤ 90 caracteres, obrigatório
- `icone`: ícone Lucide, opcional
- `nota`: nota de rodapé ≤ 120 caracteres, opcional — Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito).

Exemplo:
```yaml
- tipo: conteudo
  titulo: Por que energia solar?
  bullets:
  - Fonte renovável e inesgotável
  - Emissão zero na operação
  - Custo caiu 90% desde 2010
  icone: circle-check
```

### `diagrama`

Imagem (ex.: diagrama de arquitetura) sem distorção, com até 6 passos numerados ao lado.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `imagem`: caminho de imagem, obrigatório
- `passos`: lista de 0 a 6 itens, opcional
  - cada item:
    - `titulo`: texto ≤ 24 caracteres, obrigatório
    - `texto`: texto ≤ 60 caracteres, opcional
- `nota`: nota de rodapé ≤ 120 caracteres, opcional — Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito).

Exemplo:
```yaml
- tipo: diagrama
  titulo: Arquitetura da solução
  imagem: saida/apostilas-depois.png
  passos:
  - titulo: Pergunta
    texto: O aluno envia a dúvida
  - titulo: Resposta
    texto: O agente responde com fonte
```

### `numeros`

2 a 4 números de destaque em anéis coloridos, com legenda e fonte.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `itens`: lista de 2 a 4 itens, obrigatório
  - cada item:
    - `valor`: texto ≤ 6 caracteres, obrigatório
    - `rotulo`: texto ≤ 60 caracteres, obrigatório
    - `fonte`: texto ≤ 40 caracteres, opcional
    - `cor`: um de ['laranja', 'magenta', 'roxo', 'azul'], opcional — Força a cor do acento (senão segue a sequência laranja→magenta→roxo→azul)
- `nota`: nota de rodapé ≤ 120 caracteres, opcional — Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito).

Exemplo:
```yaml
- tipo: numeros
  titulo: O que os números dizem
  itens:
  - valor: 90%
    rotulo: queda no custo dos painéis desde 2010
    fonte: IRENA, 2023
  - valor: '25'
    rotulo: anos de vida útil de um painel
```

### `processo`

Fluxo de 3 a 6 etapas em setas (chevrons) com ícone acima e texto abaixo.

Campos:
- `titulo`: texto ≤ 40 caracteres, obrigatório
- `etapas`: lista de 3 a 6 itens, obrigatório
  - cada item:
    - `icone`: ícone Lucide, obrigatório
    - `titulo`: texto ≤ 16 caracteres, obrigatório
    - `texto`: texto ≤ 50 caracteres, obrigatório
    - `cor`: um de ['laranja', 'magenta', 'roxo', 'azul'], opcional — Força a cor do acento (senão segue a sequência laranja→magenta→roxo→azul)
- `nota`: nota de rodapé ≤ 120 caracteres, opcional — Barra de destaque no rodapé. Formato 'Destaque: texto' (o trecho antes de ':' fica em negrito).

Exemplo:
```yaml
- tipo: processo
  titulo: Da luz à tomada
  etapas:
  - icone: sun
    titulo: Captação
    texto: Painéis recebem a luz
  - icone: zap
    titulo: Conversão
    texto: Inversor gera corrente alternada
  - icone: plug
    titulo: Consumo
    texto: Energia chega à casa
```

