# DROP LINK V3.1 — aplicação funcional

## O que já funciona
- Dashboard real consumindo `/api/dashboard`
- CRUD de produtos
- CRUD de fornecedores
- CRUD de clientes
- Criação/listagem de pedidos
- Atualização de status dos pedidos
- Persistência local em `data/db.json` quando Supabase não estiver configurado
- Health check
- Página de status da integração Mercado Livre
- Estrutura SQL para Supabase com RLS
- Frontend servido pelo próprio Express
- Interface responsiva inspirada na arte visual aprovada

## Rodar no computador

Requer Node.js 20+.

```bash
npm install
cp .env.example .env
npm start
```

Abra `http://localhost:10000`.

O modo local não inventa vendas: começa vazio e mostra estados reais de "sem dados".
O arquivo `data/db.json` é criado automaticamente e não deve ser usado como banco de produção.

## Produção
Configure Supabase e Mercado Livre no `.env`/Render. Nunca envie
`SUPABASE_SERVICE_ROLE_KEY` para o navegador.

Para Supabase, execute `database/schema.sql` no SQL Editor e configure
a autenticação. A camada de produção deve usar o usuário autenticado
e RLS; a chave service-role permanece somente no backend.
