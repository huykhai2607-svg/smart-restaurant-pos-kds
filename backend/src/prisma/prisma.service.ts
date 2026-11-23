import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function resolveDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;
  let resolved = rawUrl;
  if (resolved.includes(':6543')) {
    if (!resolved.includes('pgbouncer=true')) {
      resolved += `${resolved.includes('?') ? '&' : '?'}pgbouncer=true`;
    }
    if (!resolved.includes('connection_limit=')) {
      resolved += `${resolved.includes('?') ? '&' : '?'}connection_limit=10`;
    }
    if (!resolved.includes('pool_timeout=')) {
      resolved += `${resolved.includes('?') ? '&' : '?'}pool_timeout=20`;
    }
  }
  return resolved;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = resolveDatabaseUrl();
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
