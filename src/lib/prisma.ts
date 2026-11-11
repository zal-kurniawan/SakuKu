import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

const connectionString =
  process.env.DATABASE_URL || 'file:./dev.db';

const isSqlite =
  connectionString.startsWith('file:') ||
  connectionString.startsWith('sqlite:') ||
  connectionString.endsWith('.db');

let adapter: any;

if (isSqlite) {
  adapter = new PrismaBetterSqlite3({ url: connectionString });
} else {
  const pool = globalForPrisma.pool ?? new pg.Pool({ connectionString });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;
  adapter = new PrismaPg(pool);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
