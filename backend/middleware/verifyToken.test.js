'use strict';

const jwt = require('jsonwebtoken');

// Mock authService to avoid env dependency
jest.mock('../services/authService', () => {
  const realJwt = require('jsonwebtoken');
  const TEST_SECRET = 'test-secret-key';
  return {
    verifyToken: (token) => realJwt.verify(token, TEST_SECRET, { algorithms: ['HS256'] }),
    __TEST_SECRET: TEST_SECRET,
  };
});

const verifyTokenMiddleware = require('./verifyToken');
const { __TEST_SECRET } = require('../services/authService');

function createMockReq(cookies = {}) {
  return { cookies };
}

function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('verifyToken middleware', () => {
  it('should call next() and set req.user when token is valid', () => {
    const token = jwt.sign({ sub: 'user-1', role: 'member' }, __TEST_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    const req = createMockReq({ token });
    const res = createMockRes();
    const next = jest.fn();

    verifyTokenMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.sub).toBe('user-1');
    expect(req.user.role).toBe('member');
  });

  it('should return 401 with "認證無效" when no token is present', () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = jest.fn();

    verifyTokenMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: '認證無效' });
  });

  it('should return 401 with "認證無效" when cookies is undefined', () => {
    const req = { cookies: undefined };
    const res = createMockRes();
    const next = jest.fn();

    verifyTokenMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: '認證無效' });
  });

  it('should return 401 with "認證已過期" when token is expired', () => {
    const token = jwt.sign({ sub: 'user-1', role: 'member' }, __TEST_SECRET, {
      algorithm: 'HS256',
      expiresIn: '-1s', // already expired
    });
    const req = createMockReq({ token });
    const res = createMockRes();
    const next = jest.fn();

    verifyTokenMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: '認證已過期' });
  });

  it('should return 401 with "認證無效" when token has invalid signature', () => {
    const token = jwt.sign({ sub: 'user-1' }, 'wrong-secret', {
      algorithm: 'HS256',
      expiresIn: '1h',
    });
    const req = createMockReq({ token });
    const res = createMockRes();
    const next = jest.fn();

    verifyTokenMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: '認證無效' });
  });

  it('should return 401 with "認證無效" when token is malformed', () => {
    const req = createMockReq({ token: 'not-a-valid-jwt' });
    const res = createMockRes();
    const next = jest.fn();

    verifyTokenMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: '認證無效' });
  });
});
