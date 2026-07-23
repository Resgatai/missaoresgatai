# Missão Resgatai

Sistema web de gestão de igreja construído com Next.js, Auth.js, Drizzle e Neon Postgres.

## O que está incluído

- Acesso por e-mail ou usuário, bloqueio de tentativas, encerramento de sessões e recuperação de senha por e-mail.
- Cargos, permissões no servidor, escopos de departamento e auditoria imutável.
- Membros, famílias, departamentos, agenda, presença, escalas e financeiro com estorno imutável.
- Mural, mensagens, vídeos, podcasts, rádio, pedidos de oração e notificações.
- Relatórios básicos, configurações da igreja e área pública responsiva.

MFA permanece desativado por decisão da igreja; a proteção é baseada em contas individuais, senhas, sessão, RBAC, escopos e auditoria.

## Executar localmente

1. Copie `.env.example` para `.env.local` e preencha os valores reais.
2. Instale dependências com `npm install`.
3. Aplique as migrações históricas, na ordem, se este for um banco novo: `0000` até `0011`.
4. Aplique a migração complementar do MVP: `npm run db:migrate:mvp`.
5. Aplique a migração operacional (vínculo usuário/membro e tokens FCM): `npm run db:migrate:operational`.
6. Crie o primeiro administrador com `npm run seed:admin`.
7. Inicie em `npm run dev` e abra `http://localhost:3000`.

Para recuperação de senha em produção, configure `RESEND_API_KEY`, `EMAIL_FROM` e `AUTH_URL`. Em desenvolvimento, o link é registrado somente no terminal local.

## Firebase: imagens e notificações push

As imagens de logotipo e membro são enviadas somente por upload autenticado e aceitam PNG/JPEG de até 5 MB. O banco guarda apenas o caminho interno do Storage (`branding/...` ou `members/...`); a URL assinada retornada pela API serve apenas para a prévia.

Configure os identificadores públicos no ambiente web: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (opcional) e `NEXT_PUBLIC_FIREBASE_VAPID_KEY`. `NEXT_PUBLIC_FIREBASE_CONFIG` continua aceito como alternativa JSON.

Para os endpoints de servidor, configure `FIREBASE_STORAGE_BUCKET` e uma credencial Admin usando `FIREBASE_SERVICE_ACCOUNT_JSON` **ou** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`. Essas variáveis são exclusivamente de servidor e nunca devem usar o prefixo `NEXT_PUBLIC_`. O botão em Configurações solicita a permissão do navegador, registra o token FCM em `/api/notificacoes/dispositivo` e o service worker `/firebase-messaging-sw.js` exibe notificações em segundo plano. Para revogar um dispositivo, envie `DELETE` para o mesmo endpoint com o token.

No Firebase Console, habilite Cloud Messaging, gere a chave VAPID em Configurações do projeto > Cloud Messaging e configure as regras do Storage para permitir gravações somente pelo Admin SDK. Consulte a documentação oficial de [FCM Web](https://firebase.google.com/docs/cloud-messaging/web/get-started) e [upload no Storage](https://firebase.google.com/docs/storage/web/upload-files).

## Validação

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`

## Publicação na Vercel

Conecte o repositório a um projeto Vercel e registre `DATABASE_URL`, `AUTH_SECRET`, `DATA_ENCRYPTION_KEY`, `AUTH_TRUST_HOST=true`, `RESEND_API_KEY`, `EMAIL_FROM` e `AUTH_URL` nas variáveis de produção. Use um banco Neon separado para desenvolvimento, preview e produção.

Nunca envie `.env.local`, senhas, chaves de criptografia ou URLs de conexão ao Git.
