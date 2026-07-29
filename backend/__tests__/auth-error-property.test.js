'use strict';

/**
 * Feature: auth-and-ui-overhaul
 * Property 8: 認證 API 錯誤回應不洩露具體原因
 *
 * 對任意登入失敗場景（帳號不存在 OR 密碼錯誤 OR vendor 已刪除），
 * 驗證回傳的錯誤訊息完全相同（401, "帳號或密碼錯誤"）。
 *
 * **Validates: Requirements 1.2, 2.2, 2.5**
 */

const fc = require('fast-check');
const path = require('path');

// Mock Prisma Client - resolve to the path that authService.js uses
const prismaModulePath = path.resolve(__dirname, '..', 'generated', 'prisma');
const mockPrisma = {
  memberAccount: {
    findUnique: jest.fn(),
  },
  vendorUser: {
    findUnique: jest.fn(),
  },
};

jest.mock('../generated/prisma', () => {
  return { PrismaClient: jest.fn(() => mockPrisma) };
}, { virtual: true });

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Set JWT_SECRET for token signing
process.env.JWT_SECRET = 'test-secret-key-for-property-testing-32chars!';

const bcrypt = require('bcrypt');
const { loginMember, loginVendor } = require('../services/authService');

describe('Feature: auth-and-ui-overhaul, Property 8: 認證 API 錯誤回應不洩露具體原因', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loginMember: 帳號不存在 vs 密碼錯誤 → 相同錯誤訊息與狀態碼', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 72 }),
        async (email, password) => {
          // Scenario 1: 帳號不存在
          mockPrisma.memberAccount.findUnique.mockResolvedValue(null);

          let errorNotFound;
          try {
            await loginMember(email, password);
          } catch (e) {
            errorNotFound = e;
          }

          // Scenario 2: 密碼錯誤（帳號存在、狀態正常，但密碼不匹配）
          mockPrisma.memberAccount.findUnique.mockResolvedValue({
            id: 'user-123',
            emailHash: 'some-hash',
            passwordHash: '$2b$10$fakehash',
            status: '01',
            isDeleted: false,
          });
          bcrypt.compare.mockResolvedValue(false);

          let errorWrongPassword;
          try {
            await loginMember(email, password);
          } catch (e) {
            errorWrongPassword = e;
          }

          // Both errors must exist
          expect(errorNotFound).toBeDefined();
          expect(errorWrongPassword).toBeDefined();

          // Both errors must have identical message and statusCode
          expect(errorNotFound.message).toBe(errorWrongPassword.message);
          expect(errorNotFound.statusCode).toBe(errorWrongPassword.statusCode);

          // Verify the exact values
          expect(errorNotFound.message).toBe('帳號或密碼錯誤');
          expect(errorNotFound.statusCode).toBe(401);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('loginVendor: 帳號不存在 vs 密碼錯誤 vs vendor 已刪除 → 相同錯誤訊息與狀態碼', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 72 }),
        async (email, password) => {
          // Scenario 1: 帳號不存在
          mockPrisma.vendorUser.findUnique.mockResolvedValue(null);

          let errorNotFound;
          try {
            await loginVendor(email, password);
          } catch (e) {
            errorNotFound = e;
          }

          // Scenario 2: 密碼錯誤（帳號存在、未刪除、已啟用，但密碼不匹配）
          mockPrisma.vendorUser.findUnique.mockResolvedValue({
            id: 'vendor-user-123',
            emailHash: 'some-hash',
            passwordHash: '$2b$10$fakehash',
            isDeleted: false,
            isActive: '1',
            vendorId: 1,
          });
          bcrypt.compare.mockResolvedValue(false);

          let errorWrongPassword;
          try {
            await loginVendor(email, password);
          } catch (e) {
            errorWrongPassword = e;
          }

          // Scenario 3: vendor 已刪除（isDeleted = true）
          mockPrisma.vendorUser.findUnique.mockResolvedValue({
            id: 'vendor-user-456',
            emailHash: 'some-hash',
            passwordHash: '$2b$10$fakehash',
            isDeleted: true,
            isActive: '1',
            vendorId: 2,
          });

          let errorDeleted;
          try {
            await loginVendor(email, password);
          } catch (e) {
            errorDeleted = e;
          }

          // All three errors must exist
          expect(errorNotFound).toBeDefined();
          expect(errorWrongPassword).toBeDefined();
          expect(errorDeleted).toBeDefined();

          // All three errors must have identical message and statusCode
          expect(errorNotFound.message).toBe(errorWrongPassword.message);
          expect(errorWrongPassword.message).toBe(errorDeleted.message);
          expect(errorNotFound.statusCode).toBe(errorWrongPassword.statusCode);
          expect(errorWrongPassword.statusCode).toBe(errorDeleted.statusCode);

          // Verify the exact values
          expect(errorNotFound.message).toBe('帳號或密碼錯誤');
          expect(errorNotFound.statusCode).toBe(401);
        }
      ),
      { numRuns: 100 }
    );
  });
});
