# Central de Cancelamentos, Trocas e Correções de Vendas — WG Colchões & Estofados

Fase 1 (Fundação): autenticação, perfis, filiais e navegação base.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000 — você será redirecionado para `/login`.

## Variáveis de ambiente

O arquivo `.env.local` já está configurado com o projeto Supabase
`central-cancelamentos-wg` (região São Paulo). Se for rodar em outra
máquina, copie `.env.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Ambos os valores podem ser obtidos em Project Settings → API no painel
do Supabase. É seguro expor essas duas chaves no front-end — a proteção
real dos dados está nas políticas de RLS aplicadas nas migrations.

## Usuários de teste (Fase 1)

Todos com senha `Teste@2026!` (troque antes de usar fora de desenvolvimento):

| E-mail | Papel |
|---|---|
| vendedor.teste@wgcolchoes.local | Vendedor (filial NORTE-F1) |
| sac.teste@wgcolchoes.local | SAC (filial NORTE-F1) |
| logistica.teste@wgcolchoes.local | Logística (filial NORTE-F1) |
| administrativo.teste@wgcolchoes.local | Administrativo (todas as filiais) |
| gerenteloja.teste@wgcolchoes.local | Gerente de loja (SUL-F1) |
| gerentesac.teste@wgcolchoes.local | Gerente do SAC (todas as filiais) |
| gerenciageral.teste@wgcolchoes.local | Gerência geral (todas as filiais) |
| supervisorageral.teste@wgcolchoes.local | Gerência geral escopada (SUL-F2, sem gerente próprio) |
| admin.teste@wgcolchoes.local | Administrador |

## Estrutura

- `src/lib/supabase/` — clientes Supabase (browser, server, middleware).
- `src/lib/current-user.ts` — busca perfil + papéis do usuário autenticado.
- `src/lib/nav.ts` — itens de navegação visíveis por papel.
- `src/app/login/` — tela de login com recuperação de senha.
- `src/app/(dashboard)/` — shell autenticado (navegação lateral + painel inicial).
- `src/components/ProtocolBadge.tsx` — elemento visual do número de protocolo
  (estilo "carimbo" de livro-razão, usado em toda a aplicação).

## Identidade visual

Paleta definida em `src/app/globals.css` (variáveis CSS): vermelho
(`--color-red-600` #b91c3c), branco, cinza (`--color-gray-50/100/200`) e
grafite (`--color-graphite-900/700/500`). Tipografia: fonte de sistema
para textos de interface e monoespaçada para números de protocolo,
timestamps e trilha de auditoria — reforçando visualmente que cada
registro é um item permanente e rastreável.

## Próximos passos (Fase 2)

Nova solicitação manual, cadastro de venda/cliente/itens/pagamentos,
cancelamento total e parcial, detecção de duplicidade, central e
detalhe do protocolo, histórico.
