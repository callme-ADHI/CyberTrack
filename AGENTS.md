# Cybercrime Police Station Palakkad — Portal

Internal monitoring dashboard for the Cybercrime Police Station, Palakkad.

## Stack

- React 19 + TanStack Start (SSR)
- TanStack Router + TanStack Query
- Supabase (PostgreSQL)
- Tailwind CSS v4
- Recharts

## Development

```bash
cp .env.local.example .env.local   # fill in Supabase keys
npm install
npm run dev
```

## Environment Variables

| Variable                 | Description                  |
| ------------------------ | ---------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL         |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public JWT key |
