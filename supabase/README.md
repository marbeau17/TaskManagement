# Supabase Configuration

## Regenerating TypeScript Types

When the database schema changes, regenerate the TypeScript type definitions with:

```bash
npx supabase gen types typescript --project-id ewlxqiowzdebksykxvuv > src/lib/supabase/types.generated.ts
```

This requires the Supabase CLI to be installed (`npx supabase` or `npm i -g supabase`).

The generated file is consumed by `src/lib/supabase/types.ts` which re-exports the `Database` type used by the Supabase client.

## Migrations

Migration files live in `supabase/migrations/`. Apply them with:

```bash
npx supabase db push
```

## Seed Data

`seed.sql` contains initial seed data for development. `create_auth_users.sql` sets up auth users in the Supabase Auth system.
