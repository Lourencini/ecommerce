# Cenários de Teste — E-commerce 3D Print

## Estrutura de testes

```
testes/
├── e2e/                        # Playwright (end-to-end)
│   ├── auth.spec.ts            # Login, registro, logout, proteção de rotas
│   ├── storefront.spec.ts      # Catálogo, busca, página de produto
│   ├── checkout.spec.ts        # Carrinho e fluxo de checkout
│   └── admin.spec.ts           # Painel administrativo
├── cenarios/
│   └── cenarios-de-teste.md    # Este documento

frontend/src/__tests__/
├── setup.ts                    # Mocks globais (next/navigation, next-auth, etc.)
├── unit/
│   ├── CartContext.test.tsx    # Vitest — lógica do carrinho
│   ├── components/
│   │   ├── ProductCard.test.tsx
│   │   └── Header.test.tsx
│   ├── lib/
│   │   └── api.test.ts
│   └── hooks/
│       └── useAdminToken.test.ts
└── integration/
    ├── login.test.tsx
    └── cart.test.tsx

backend/src/
├── auth/auth.service.spec.ts   # Jest — register, login, JWT
├── orders/orders.service.spec.ts
└── categories/categories.service.spec.ts
```

---

## 1. Autenticação

### CT-AUTH-001 — Login com credenciais válidas (cliente)
- **Pré-condição**: Usuário `cliente@email.com` cadastrado e ativo
- **Passos**: Preencher e-mail e senha corretos → clicar "Entrar"
- **Resultado esperado**: Redirecionado para `/`, sessão ativa no header

### CT-AUTH-002 — Login com credenciais inválidas
- **Passos**: Preencher e-mail válido com senha errada → clicar "Entrar"
- **Resultado esperado**: Mensagem "E-mail ou senha incorretos" exibida; usuário permanece em `/login`

### CT-AUTH-003 — Login com e-mail inexistente
- **Passos**: Preencher e-mail não cadastrado → clicar "Entrar"
- **Resultado esperado**: Mesma mensagem genérica de credenciais inválidas (não revela se e-mail existe)

### CT-AUTH-004 — Login admin e acesso ao painel
- **Passos**: Login com `admin@3dprint.com` → navegar para `/admin`
- **Resultado esperado**: Dashboard carregado com KPIs visíveis

### CT-AUTH-005 — Redirect pós-login
- **Passos**: Acessar `/login?redirect=/checkout` → fazer login
- **Resultado esperado**: Redirecionado para `/checkout`

### CT-AUTH-006 — Logout
- **Passos**: Usuário logado clica em "Sair" no header
- **Resultado esperado**: Sessão encerrada, header exibe "Entrar", `/admin` redireciona para `/login`

### CT-AUTH-007 — Usuário inativo não consegue login
- **Pré-condição**: Conta com `isActive: false` no banco
- **Resultado esperado**: `UnauthorizedException` / mensagem de erro

### CT-AUTH-008 — Registro de novo usuário
- **Passos**: Preencher nome, e-mail único, senha → submeter
- **Resultado esperado**: Conta criada, accessToken retornado, usuário logado

### CT-AUTH-009 — Registro com e-mail já cadastrado
- **Resultado esperado**: `ConflictException` / mensagem de e-mail já em uso

### CT-AUTH-010 — Senha armazenada com hash bcrypt
- **Verificação**: Senha nunca persiste em plain text no banco

---

## 2. Vitrine / Catálogo

### CT-STORE-001 — Listagem de produtos na home
- **Resultado esperado**: Cards de produtos visíveis com nome, preço, imagem

### CT-STORE-002 — Filtro por categoria
- **Passos**: Clicar em categoria específica
- **Resultado esperado**: Apenas produtos daquela categoria exibidos

### CT-STORE-003 — Busca por texto
- **Passos**: Digitar "vaso" no campo de busca
- **Resultado esperado**: Apenas produtos com "vaso" no nome/descrição

### CT-STORE-004 — Paginação
- **Pré-condição**: Mais de 12 produtos cadastrados
- **Resultado esperado**: Controles de próxima/anterior página visíveis e funcionais

### CT-STORE-005 — Página de detalhe do produto
- **Passos**: Clicar em um produto
- **Resultado esperado**: Nome, preço, descrição, imagens, botão "Adicionar ao Carrinho"

### CT-STORE-006 — Produto esgotado
- **Pré-condição**: Produto com `stockQuantity: 0`
- **Resultado esperado**: Badge "Esgotado", botão desabilitado

### CT-STORE-007 — Badge de desconto
- **Pré-condição**: Produto com `compareAtPrice > price`
- **Resultado esperado**: Badge de porcentagem de desconto exibido

### CT-STORE-008 — Produto sem imagem exibe fallback
- **Resultado esperado**: Texto "Sem Imagem" ou imagem placeholder

---

## 3. Carrinho

### CT-CART-001 — Carrinho vazio
- **Resultado esperado**: Mensagem "carrinho está vazio", link para produtos

### CT-CART-002 — Adicionar produto ao carrinho
- **Passos**: Na página do produto, clicar "Adicionar ao Carrinho"
- **Resultado esperado**: Badge `1` no ícone do carrinho no header

### CT-CART-003 — Exibir itens no carrinho
- **Resultado esperado**: Nome, preço unitário, quantidade e subtotal exibidos

### CT-CART-004 — Atualizar quantidade
- **Passos**: Alterar input de quantidade para 3
- **Resultado esperado**: Subtotal atualizado (preço × 3)

### CT-CART-005 — Remover item
- **Passos**: Clicar no botão de remover
- **Resultado esperado**: Item removido; se último item, carrinho exibe estado vazio

### CT-CART-006 — Subtotal total correto com múltiplos itens
- **Dados**: Item A (R$ 79,90 × 2) + Item B (R$ 120,00 × 1) = R$ 279,80
- **Resultado esperado**: Total R$ 279,80 exibido

### CT-CART-007 — Persistência no localStorage
- **Passos**: Adicionar produto, fechar aba, reabrir
- **Resultado esperado**: Carrinho mantém itens

### CT-CART-008 — Finalizar sem autenticação
- **Passos**: Clicar "Finalizar Pedido" sem estar logado
- **Resultado esperado**: Redirecionado para `/login?redirect=/checkout`

### CT-CART-009 — Finalizar autenticado
- **Passos**: Clicar "Finalizar Pedido" logado
- **Resultado esperado**: Redirecionado para `/checkout`

---

## 4. Checkout

### CT-CHK-001 — Página de checkout exige autenticação
- **Resultado esperado**: Sem login, redireciona para `/login`

### CT-CHK-002 — Exibir resumo do pedido
- **Resultado esperado**: Produtos, quantidades e preços visíveis

### CT-CHK-003 — Cálculo de frete por CEP
- **Passos**: Preencher CEP válido → calcular
- **Resultado esperado**: Opções de frete exibidas (Correios PAC, SEDEX, etc.)

### CT-CHK-004 — CEP inválido exibe erro
- **Passos**: Preencher "00000-000"
- **Resultado esperado**: Mensagem de CEP inválido

### CT-CHK-005 — Selecionar opção de frete
- **Resultado esperado**: Total atualizado com frete selecionado

### CT-CHK-006 — Confirmar pedido
- **Pré-condição**: Produto em estoque, CEP válido, frete selecionado
- **Resultado esperado**: Pedido criado, estoque deduzido, página de confirmação

### CT-CHK-007 — Pedido com produto sem estoque
- **Resultado esperado**: Erro "Estoque insuficiente" exibido

---

## 5. Painel Administrativo

### CT-ADM-001 — Acesso sem autenticação bloqueado
- **Resultado esperado**: Redirecionado para `/login`

### CT-ADM-002 — Acesso por cliente não-admin bloqueado
- **Resultado esperado**: Redirecionado para home ou 403

### CT-ADM-003 — Dashboard exibe métricas
- **Resultado esperado**: Total de pedidos, receita mensal, pedidos pendentes, estoque baixo, cycle time

### CT-ADM-004 — Token expirado → logout automático
- **Pré-condição**: JWT expirado no backend
- **Resultado esperado**: Redirecionado para `/login?redirect=/admin`

### CT-ADM-005 — Listar pedidos
- **Resultado esperado**: Tabela com número, cliente, total, status, data

### CT-ADM-006 — Transição de status: PENDING → CONFIRMED
- **Resultado esperado**: Status atualizado na tabela, histórico registrado

### CT-ADM-007 — Transição de status: READY → SHIPPED (com código de rastreio)
- **Passos**: Clicar "Enviar" → modal pede código de rastreio → confirmar
- **Resultado esperado**: Status SHIPPED, tracking code salvo

### CT-ADM-008 — Transição inválida bloqueada
- **Exemplo**: SHIPPED → PENDING
- **Resultado esperado**: Erro exibido, status não alterado

### CT-ADM-009 — Listar produtos no admin
- **Resultado esperado**: Tabela com nome, SKU, preço, estoque, status

### CT-ADM-010 — Criar novo produto
- **Passos**: Preencher campos obrigatórios (nome, SKU, preço, estoque) → salvar
- **Resultado esperado**: Produto criado, aparece na listagem

### CT-ADM-011 — Editar produto existente
- **Passos**: Clicar "Editar" → alterar nome → salvar
- **Resultado esperado**: Nome atualizado na listagem

### CT-ADM-012 — Upload de imagem de produto
- **Passos**: Selecionar arquivo de imagem no formulário
- **Resultado esperado**: Imagem exibida no preview, salva no servidor

### CT-ADM-013 — Listar categorias
- **Resultado esperado**: Tabela com ícone, nome, slug, contagem de produtos, status

### CT-ADM-014 — Criar categoria
- **Passos**: Abrir modal → preencher nome → salvar
- **Resultado esperado**: Categoria criada com slug gerado automaticamente, aparece na listagem

### CT-ADM-015 — Slug gerado automaticamente
- **Exemplo**: Nome "Miniaturas RPG" → slug "miniaturas-rpg"

### CT-ADM-016 — Categoria com produtos: soft-delete
- **Passos**: Tentar excluir categoria com produtos vinculados
- **Resultado esperado**: Categoria desativada (não deletada), badge "Inativo"

### CT-ADM-017 — Categoria sem produtos: hard-delete
- **Passos**: Excluir categoria sem produtos
- **Resultado esperado**: Categoria removida da listagem

### CT-ADM-018 — Ativar/Desativar categoria
- **Resultado esperado**: Status alterna entre "Ativo" e "Inativo"

---

## 6. Rastreamento de Pedido

### CT-TRACK-001 — Rastrear pedido por número + e-mail
- **Passos**: Inserir número do pedido e e-mail do cliente
- **Resultado esperado**: Histórico de status exibido

### CT-TRACK-002 — Pedido não encontrado
- **Resultado esperado**: Mensagem "Pedido não encontrado"

---

## Como executar

### Testes unitários e integração (frontend)
```bash
cd frontend
npm test               # executa uma vez
npm run test:watch     # modo watch
npm run test:coverage  # com cobertura
```

### Testes de unidade (backend)
```bash
cd backend
npm run test           # executa uma vez
npm run test:cov       # com cobertura
```

### Testes E2E (Playwright)
```bash
# Na raiz do projeto
npx playwright install  # apenas na primeira vez
npx playwright test     # executa todos os E2E
npx playwright test testes/e2e/auth.spec.ts   # arquivo específico
npx playwright show-report testes/playwright-report
```

> **Pré-requisito para E2E**: frontend em `localhost:3000` e backend em `localhost:3001` devem estar em execução.
