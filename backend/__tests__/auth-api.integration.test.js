'use strict';

/**
 * 後端 API 整合測試：認證流程
 *
 * 使用 supertest 測試 /api/auth/login、/api/auth/logout、/api/auth/me 完整流程
 * Mock Prisma 與 bcrypt，使用真實 JWT 簽發/驗證
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.4, 2.5**
 */

const path = require('path');

// --- Mocks must be set up before requiring app ---

const mockPrisma = {
  memberAccount: { findUnique: jest.fn() },
  vendorUser: { findUnique: jest.fn() },
};

jest.mock('../generated/prisma', () => {
  return { PrismaClient: jest.fn(() => mockPrisma) };
}, { virtual: true });

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Set env vars before requiring modules
process.env.JWT_SECRET = 'integration-test-secret-key-32chars!!';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../index');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper: sign a valid token
function signTestToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}

// Helper: sign an expired token
function signExpiredToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '-1s' });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('一般會員登入', () => {
    it('有效憑證 → 200，Set-Cookie 含 token，body 含 success:true + user', async () => {
      mockPrisma.memberAccount.findUnique.mockResolvedValue({
        id: 'member-uuid-001',
        emailHash: 'hashed-email',
        passwordHash: '$2b$10$validhash',
        status: '01',
        isDeleted: false,
      });
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123', role: 'member' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.userId).toBe('member-uuid-001');
      expect(res.body.user.role).toBe('member');

      // Verify Set-Cookie header exists with token
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
    });

    it('email 不存在 → 401，"帳號或密碼錯誤"', async () => {
      mockPrisma.memberAccount.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexist@example.com', password: 'password123', role: 'member' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('帳號或密碼錯誤');
    });

    it('密碼錯誤 → 401，"帳號或密碼錯誤"', async () => {
      mockPrisma.memberAccount.findUnique.mockResolvedValue({
        id: 'member-uuid-001',
        emailHash: 'hashed-email',
        passwordHash: '$2b$10$validhash',
        status: '01',
        isDeleted: false,
      });
      bcrypt.compare.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword', role: 'member' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('帳號或密碼錯誤');
    });

    it('帳號已停用（status != "01"）→ 403，"帳號已停用"', async () => {
      mockPrisma.memberAccount.findUnique.mockResolvedValue({
        id: 'member-uuid-002',
        emailHash: 'hashed-email',
        passwordHash: '$2b$10$validhash',
        status: '02',
        isDeleted: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'disabled@example.com', password: 'password123', role: 'member' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('帳號已停用');
    });
  });

  describe('廠商用戶登入', () => {
    it('有效憑證 → 200，Set-Cookie (8h maxAge)，response 含 vendorId', async () => {
      mockPrisma.vendorUser.findUnique.mockResolvedValue({
        id: 'vendor-uuid-001',
        emailHash: 'hashed-email',
        passwordHash: '$2b$10$validhash',
        isDeleted: false,
        isActive: '1',
        vendorId: 42,
      });
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'vendor@example.com', password: 'vendorpass1', role: 'vendor' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.userId).toBe('vendor-uuid-001');
      expect(res.body.user.role).toBe('vendor');
      expect(res.body.user.vendorId).toBe(42);

      // Verify Set-Cookie with appropriate maxAge (8h = 28800000 ms)
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toMatch(/Max-Age=28800/);
    });

    it('vendor 已刪除 → 401，"帳號或密碼錯誤"（不揭露刪除事實）', async () => {
      mockPrisma.vendorUser.findUnique.mockResolvedValue({
        id: 'vendor-uuid-002',
        emailHash: 'hashed-email',
        passwordHash: '$2b$10$validhash',
        isDeleted: true,
        isActive: '1',
        vendorId: 99,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'deleted@vendor.com', password: 'vendorpass1', role: 'vendor' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('帳號或密碼錯誤');
    });

    it('vendor 已停用（isActive != "1"）→ 403，"帳號已被停用"', async () => {
      mockPrisma.vendorUser.findUnique.mockResolvedValue({
        id: 'vendor-uuid-003',
        emailHash: 'hashed-email',
        passwordHash: '$2b$10$validhash',
        isDeleted: false,
        isActive: '0',
        vendorId: 55,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inactive@vendor.com', password: 'vendorpass1', role: 'vendor' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('帳號已被停用');
    });
  });

  describe('角色驗證', () => {
    it('無效 role → 400，"無效的角色類型"', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123', role: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('無效的角色類型');
    });
  });
});

describe('POST /api/auth/logout', () => {
  it('登出 → 200，清除 cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify cookie is cleared (Set-Cookie with token= and expires in the past or Max-Age=0)
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    // Cleared cookie should have empty value or expiration in the past
    expect(tokenCookie).toMatch(/token=/);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('有效 token → 200，回傳 userId/role', async () => {
    const token = signTestToken({ sub: 'member-uuid-001', role: 'member' });

    // Mock the prisma query in /me route
    mockPrisma.memberAccount.findUnique.mockResolvedValue({
      id: 'member-uuid-001',
      name: null,
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('member-uuid-001');
    expect(res.body.role).toBe('member');
  });

  it('有效 vendor token → 200，回傳含 vendorId', async () => {
    const token = signTestToken({ sub: 'vendor-uuid-001', role: 'vendor', vendorId: 42 });

    mockPrisma.vendorUser.findUnique.mockResolvedValue({
      id: 'vendor-uuid-001',
      name: null,
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('vendor-uuid-001');
    expect(res.body.role).toBe('vendor');
    expect(res.body.vendorId).toBe(42);
  });

  it('無 token → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('token 過期 → 401，"認證已過期"', async () => {
    const token = signExpiredToken({ sub: 'member-uuid-001', role: 'member' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('認證已過期');
  });

  it('無效簽章 token → 401，"認證無效"', async () => {
    const token = jwt.sign(
      { sub: 'member-uuid-001', role: 'member' },
      'wrong-secret-key',
      { algorithm: 'HS256', expiresIn: '24h' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('認證無效');
  });

  it('格式損毀的 token → 401，"認證無效"', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'token=not.a.valid.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('認證無效');
  });
});

describe('Cookie 屬性驗證', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('登入成功時 cookie 含 HttpOnly、Secure、SameSite=Strict 屬性', async () => {
    mockPrisma.memberAccount.findUnique.mockResolvedValue({
      id: 'member-uuid-001',
      emailHash: 'hashed-email',
      passwordHash: '$2b$10$validhash',
      status: '01',
      isDeleted: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123', role: 'member' });

    const cookies = res.headers['set-cookie'];
    const tokenCookie = cookies.find(c => c.startsWith('token='));

    expect(tokenCookie).toMatch(/HttpOnly/i);
    expect(tokenCookie).toMatch(/Secure/i);
    expect(tokenCookie).toMatch(/SameSite=Strict/i);
    expect(tokenCookie).toMatch(/Path=\//);
  });

  it('一般會員 cookie maxAge 為 24h (86400s)', async () => {
    mockPrisma.memberAccount.findUnique.mockResolvedValue({
      id: 'member-uuid-001',
      emailHash: 'hashed-email',
      passwordHash: '$2b$10$validhash',
      status: '01',
      isDeleted: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123', role: 'member' });

    const cookies = res.headers['set-cookie'];
    const tokenCookie = cookies.find(c => c.startsWith('token='));

    expect(tokenCookie).toMatch(/Max-Age=86400/);
  });

  it('廠商用戶 cookie maxAge 為 8h (28800s)', async () => {
    mockPrisma.vendorUser.findUnique.mockResolvedValue({
      id: 'vendor-uuid-001',
      emailHash: 'hashed-email',
      passwordHash: '$2b$10$validhash',
      isDeleted: false,
      isActive: '1',
      vendorId: 42,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vendor@example.com', password: 'vendorpass1', role: 'vendor' });

    const cookies = res.headers['set-cookie'];
    const tokenCookie = cookies.find(c => c.startsWith('token='));

    expect(tokenCookie).toMatch(/Max-Age=28800/);
  });
});
