import type { Config } from 'drizzle-kit'

export default {
  schema: './src/lib/db/schemas/*.schema.ts',
  out: './migrations/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // Usar URL sin pooler para migraciones
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
  // Incluir todos los schemas del proyecto
  schemaFilter: ['shared', 'english', 'spanish', 'languages'],
  verbose: true,
  strict: true,
} satisfies Config
