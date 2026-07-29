'use strict';

// This file exists only for Jest module resolution.
// In production, Prisma generate creates the actual client here.
// Tests should always use jest.mock() to replace this module.

class PrismaClient {
  constructor() {
    this.memberAccount = { findUnique: async () => null };
    this.vendorUser = { findUnique: async () => null };
  }
}

module.exports = { PrismaClient };
