# CBN Check-in

Daily check-in gamification for the CBN fiber app: admin (`/admin`), app webview (`/app`), and API. Next.js 15 + Postgres (Prisma).

- Architecture, formula, app contract, decisions: [KNOWLEDGE_GRAPH.md](KNOWLEDGE_GRAPH.md)
- Original Claude Design export: [`project/`](project) and [`chats/`](chats)

```bash
cp .env.example .env && npm install && npx prisma migrate deploy
npm run seed -- --demo && npm run dev   # /login, or /app#token=30110910
```
