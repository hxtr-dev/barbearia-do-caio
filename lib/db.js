import pg from 'pg';

// Um pool por instância. No Neon, use a connection string "pooled" (com -pooler no host).
const globalForPg = globalThis;

export function getPool() {
  if (!globalForPg.__brasaPool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada');
    globalForPg.__brasaPool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return globalForPg.__brasaPool;
}

export const TIMEZONE = 'America/Sao_Paulo';
