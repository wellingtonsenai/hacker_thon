---
inclusion: always
---

# Guia Visual AWS

## Princípios visuais
- Usar **exclusivamente** ícones oficiais do AWS Architecture Icons
- Fundo branco ou cinza claro (`#F8F8F8`)
- Bordas de grupo com cantos arredondados e cor por categoria de serviço
- Setas direcionais indicam fluxo de dados (da origem ao destino)
- Sem texto redundante — o nome do serviço já aparece abaixo do ícone

## Categorias e cores de agrupamento

| Categoria AWS | Cor de borda | Exemplos |
|---|---|---|
| Compute | `#FF9900` (laranja AWS) | Lambda, EC2, ECS, Fargate |
| Storage | `#3F8624` (verde) | S3, EBS, EFS |
| Database | `#C7131F` (vermelho) | RDS, DynamoDB, Aurora |
| Networking | `#8C4FFF` (roxo) | VPC, CloudFront, Route 53, ALB |
| Security | `#DD344C` (rosa) | IAM, Cognito, WAF, KMS |
| Integration | `#E7157B` (magenta) | SQS, SNS, EventBridge, Step Functions |
| AI/ML | `#01A88D` (teal) | Bedrock, SageMaker, Rekognition |

## Nomenclatura de ícones (pasta `/icones/`)
```
aws-lambda.png
aws-s3.png
aws-ec2.png
aws-rds.png
aws-dynamodb.png
aws-sqs.png
aws-sns.png
aws-cloudfront.png
aws-api-gateway.png
aws-cognito.png
aws-iam.png
aws-vpc.png
aws-alb.png
aws-ecs.png
aws-fargate.png
aws-eventbridge.png
aws-step-functions.png
aws-bedrock.png
```

## Layout padrão de diagrama
```
┌─────────────────────────────────────────────┐
│  [Usuário / Cliente]                        │
│         │                                   │
│         ▼                                   │
│  [Entry Point: CloudFront / API Gateway]    │
│         │                                   │
│    ┌────▼────┐    ┌──────────┐              │
│    │ Compute │───▶│ Database │              │
│    └─────────┘    └──────────┘              │
│         │                                   │
│         ▼                                   │
│  [Storage / Integration]                    │
└─────────────────────────────────────────────┘
```

## Regras de conexão
- **Seta sólida** (`→`) — chamada síncrona (HTTP, gRPC)
- **Seta tracejada** (`-->`) — mensagem assíncrona (SQS, SNS, EventBridge)
- **Seta bidirecional** (`↔`) — leitura e escrita (banco de dados)
- Máximo de **2 níveis de agrupamento** por diagrama para não poluir visualmente

## Formato do YAML de arquitetura
```yaml
nome: meu-caso
descricao: Descrição curta do caso de uso
servicos:
  - id: api
    tipo: aws-api-gateway
    nome: API Gateway
    conexoes:
      - destino: auth
        tipo: sincrona
      - destino: backend
        tipo: sincrona
  - id: auth
    tipo: aws-cognito
    nome: Cognito
    conexoes: []
  - id: backend
    tipo: aws-lambda
    nome: Lambda Handler
    conexoes:
      - destino: db
        tipo: sincrona
  - id: db
    tipo: aws-dynamodb
    nome: DynamoDB
    conexoes: []
```

## Disponibilidade regional

> Todos os serviços abaixo foram verificados em **us-east-1 (N. Virginia)** — fonte: [AWS Regional Services](https://aws.amazon.com/about-aws/globalinfrastructure/regional-product-services/) e [Amazon Bedrock endpoints](https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints-region-availability.html).

| Serviço | us-east-1 | Observação |
|---|---|---|
| Lambda | ✅ | |
| S3 | ✅ | |
| EC2 | ✅ | |
| RDS | ✅ | |
| DynamoDB | ✅ | |
| SQS | ✅ | |
| SNS | ✅ | |
| CloudFront | ✅ | Global, endpoint de controle em us-east-1 |
| API Gateway | ✅ | |
| Cognito | ✅ | |
| IAM | ✅ | Global |
| VPC | ✅ | |
| ALB | ✅ | |
| ECS | ✅ | |
| Fargate | ✅ | |
| EventBridge | ✅ | |
| Step Functions | ✅ | |
| Bedrock | ✅ | `bedrock-runtime` e `bedrock-mantle` disponíveis |

**Região padrão do projeto: `us-east-1`**

## O que o validador verifica
1. Todos os `tipo` existem na lista de ícones disponíveis
2. Todos os `destino` referenciam um `id` existente no mesmo arquivo
3. Nenhum serviço está completamente isolado (sem conexões de entrada ou saída)
4. Não há ciclos diretos entre dois serviços (A→B e B→A ao mesmo tempo)
