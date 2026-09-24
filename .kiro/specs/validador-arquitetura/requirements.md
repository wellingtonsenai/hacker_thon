# Requirements: Validador de Arquitetura AWS

## Introdução
O validador analisa arquivos YAML de arquitetura e detecta problemas de design antes da renderização.

## Requisitos

### REQ-01 — Validação de tipos de serviço
- **O sistema deve** rejeitar qualquer serviço cujo `tipo` não esteja na lista de ícones disponíveis em `/icones/`
- **Mensagem de erro**: `"Tipo desconhecido: <tipo> no serviço <id>"`

### REQ-02 — Validação de referências de conexão
- **O sistema deve** rejeitar conexões cujo `destino` não corresponda a nenhum `id` existente no arquivo
- **Mensagem de erro**: `"Destino inválido: <destino> referenciado por <id>"`

### REQ-03 — Detecção de serviços isolados
- **O sistema deve** alertar quando um serviço não tiver nenhuma conexão de entrada nem de saída
- **Mensagem de aviso**: `"Serviço isolado: <id> (<nome>) não possui conexões"`

### REQ-04 — Detecção de IDs duplicados
- **O sistema deve** rejeitar arquivos com dois ou mais serviços com o mesmo `id`
- **Mensagem de erro**: `"ID duplicado: <id>"`

### REQ-05 — Validação de campos obrigatórios
- **O sistema deve** verificar que cada serviço possui `id`, `tipo`, `nome` e `conexoes`
- **Mensagem de erro**: `"Campo obrigatório ausente: <campo> no serviço <índice>"`

### REQ-06 — Saída estruturada
- **O sistema deve** retornar uma lista de erros e avisos, não interromper no primeiro erro
- Erros bloqueiam a renderização; avisos não bloqueiam

### REQ-07 — Interface de linha de comando
- **O sistema deve** aceitar o caminho do arquivo YAML como argumento
- Exit code `0` = válido, `1` = erros encontrados
- Suporte a flag `--json` para saída em JSON
