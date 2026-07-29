'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../utils/prismaClient');
const { hashEmail, encryptField } = require('../utils/crypto');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 簽發 JWT token
 * @param {object} payload - Token payload
 * @param {string} expiresIn - Token 有效期（例如 '24h', '8h'）
 * @returns {string} 簽發的 JWT token
 */
function signToken(payload, expiresIn) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}

/**
 * 驗證 JWT token
 * @param {string} token - JWT token 字串
 * @returns {object} 解碼後的 payload
 * @throws {Error} Token 無效或過期
 */
function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

/**
 * 一般會員登入
 * @param {string} email - 會員 email
 * @param {string} password - 會員密碼
 * @returns {Promise<{token: string, userId: string}>} 登入成功回傳 token 與 userId
 * @throws {Error} 登入失敗拋出含 statusCode 的錯誤
 */
async function loginMember(email, password) {
  const emailHashed = hashEmail(email);

  // 查詢會員帳號
  const account = await prisma.memberAccount.findUnique({
    where: { emailHash: emailHashed },
  });

  // 帳號不存在 → 401（不揭露具體原因）
  if (!account) {
    const error = new Error('帳號或密碼錯誤');
    error.statusCode = 401;
    throw error;
  }

  // 帳號停用或已刪除 → 403
  if (account.status !== '01' || account.isDeleted === true) {
    const error = new Error('帳號已停用');
    error.statusCode = 403;
    throw error;
  }

  // 密碼比對
  const isPasswordValid = await bcrypt.compare(password, account.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('帳號或密碼錯誤');
    error.statusCode = 401;
    throw error;
  }

  // 簽發 JWT token（有效期 24h）
  const token = signToken({ sub: account.id, role: 'member' }, '24h');

  return { token, userId: account.id };
}

/**
 * 廠商用戶登入
 * @param {string} email - 廠商用戶 email
 * @param {string} password - 廠商用戶密碼
 * @returns {Promise<{token: string, userId: string, vendorId: number}>} 登入成功回傳 token、userId、vendorId
 * @throws {Error} 登入失敗拋出含 statusCode 的錯誤
 */
async function loginVendor(email, password) {
  const emailHashed = hashEmail(email);

  // 查詢廠商用戶
  const vendor = await prisma.vendorUser.findUnique({
    where: { emailHash: emailHashed },
  });

  // 帳號不存在 → 401（不揭露具體原因）
  if (!vendor) {
    const error = new Error('帳號或密碼錯誤');
    error.statusCode = 401;
    throw error;
  }

  // 已刪除 → 401（不揭露刪除事實，使用相同訊息）
  if (vendor.isDeleted === true) {
    const error = new Error('帳號或密碼錯誤');
    error.statusCode = 401;
    throw error;
  }

  // 帳號停用 → 403
  if (vendor.isActive !== '1') {
    const error = new Error('帳號已被停用');
    error.statusCode = 403;
    throw error;
  }

  // 密碼比對
  const isPasswordValid = await bcrypt.compare(password, vendor.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('帳號或密碼錯誤');
    error.statusCode = 401;
    throw error;
  }

  // 簽發 JWT token（有效期 8h，含 vendorId）
  const token = signToken(
    { sub: vendor.id, role: 'vendor', vendorId: vendor.vendorId },
    '8h'
  );

  return { token, userId: vendor.id, vendorId: vendor.vendorId };
}

/**
 * 一般會員註冊
 * @param {object} data - { email, password, name, phone }
 * @returns {Promise<{token: string, userId: string}>} 註冊成功回傳 token 與 userId
 * @throws {Error} Email 已被註冊時拋出含 statusCode 的錯誤
 */
async function registerMember({ email, password, name, phone }) {
  const emailHashed = hashEmail(email);

  const existing = await prisma.memberAccount.findUnique({
    where: { emailHash: emailHashed },
  });
  if (existing) {
    const error = new Error('此 Email 已被註冊');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newId = crypto.randomUUID();

  const account = await prisma.memberAccount.create({
    data: {
      id: newId,
      email: encryptField(email),
      emailHash: emailHashed,
      phone: phone ? encryptField(phone) : undefined,
      name: name ? encryptField(name) : undefined,
      passwordHash,
      // 自行註冊：audit 欄位帶入自身 id
      creId: newId,
      updId: newId,
    },
  });

  const token = signToken({ sub: account.id, role: 'member' }, '24h');
  return { token, userId: account.id };
}

/**
 * 廠商用戶註冊（自行申請帳號，尚無 vendorId）
 * @param {object} data - { email, password, companyName, name }
 * @returns {Promise<{token: string, userId: string}>} 註冊成功回傳 token 與 userId
 * @throws {Error} Email 已被註冊時拋出含 statusCode 的錯誤
 */
async function registerVendor({ email, password, companyName, name }) {
  const emailHashed = hashEmail(email);

  const existing = await prisma.vendorUser.findUnique({
    where: { emailHash: emailHashed },
  });
  if (existing) {
    const error = new Error('此 Email 已被註冊');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newId = crypto.randomUUID();

  const vendor = await prisma.vendorUser.create({
    data: {
      id: newId,
      companyName,
      email: encryptField(email),
      emailHash: emailHashed,
      name: name ? encryptField(name) : undefined,
      passwordHash,
      role: 'owner',
      creId: newId,
      updId: newId,
    },
  });

  const token = signToken(
    { sub: vendor.id, role: 'vendor', vendorId: vendor.vendorId },
    '8h'
  );
  return { token, userId: vendor.id, vendorId: vendor.vendorId };
}

module.exports = {
  signToken,
  verifyToken,
  loginMember,
  loginVendor,
  registerMember,
  registerVendor,
};
