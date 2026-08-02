'use strict';

require('dotenv').config();

const { PrismaClient } = require('../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

/**
 * 全域單一 PrismaClient 實例
 * Prisma v7 起強制要求 driver adapter，需明確傳入 PrismaPg
 * 避免每個模組各自 new PrismaClient() 造成連線池爆炸
 */
const globalForPrisma = globalThis;

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // RDS requires SSL but uses AWS CA cert; skip verification for internal VPC connections
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
