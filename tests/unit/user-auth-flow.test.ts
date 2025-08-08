/**
 * 智游助手v6.2 - 用户认证流程集成测试
 * 测试完整的用户注册、登录、认证流程
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll, vi } from './test-utils';

// node-mocks-http 功能需要在 Playwright 中重新实现
import registerHandler from '../../pages/api/user/register';
import loginHandler from '../../pages/api/user/login';
import refreshTokenHandler from '../../pages/api/user/refresh-token';
import preferencesHandler from '../../pages/api/user/preferences';

describe('User Authentication Flow Integration', () => {
  let testUser: {
    email: string;
    password: string;
    displayName: string;
  };

  let authTokens: {
    accessToken: string;
    refreshToken: string;
  };

  beforeEach(() => {
    testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      displayName: '测试用户'
    };
  });

  describe('User Registration Flow', () => {
    test('should register new user successfully', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName,
          preferences: {
            travelStyles: ['culture', 'food'],
            budgetRange: 'mid-range',
            language: 'zh-CN'
          }
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.user).toBeDefined();
      expect(responseData.user.email).toBe(testUser.email);
      expect(responseData.user.displayName).toBe(testUser.displayName);
      expect(responseData.tokens).toBeDefined();
      expect(responseData.tokens.accessToken).toBeDefined();
      expect(responseData.tokens.refreshToken).toBeDefined();

      // 保存tokens用于后续测试
      authTokens = {
        accessToken: responseData.tokens.accessToken,
        refreshToken: responseData.tokens.refreshToken
      };
    });

    test('should reject registration with weak password', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: '123', // 弱密码
          displayName: testUser.displayName
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('密码强度不足');
      expect(responseData.passwordStrength).toBeDefined();
    });

    test('should reject registration with invalid email', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'invalid-email',
          password: testUser.password,
          displayName: testUser.displayName
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid email format');
    });

    test('should reject registration with missing required fields', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testUser.email
          // 缺少password和displayName
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Missing required fields');
    });
  });

  describe('User Login Flow', () => {
    beforeEach(async () => {
      // 先注册用户
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName
        }
      });

      await registerHandler(req, res);
    });

    test('should login with correct credentials', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          rememberMe: true,
          deviceInfo: {
            type: 'web',
            name: 'Chrome Browser',
            userAgent: 'Mozilla/5.0 (Test)'
          }
        }
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.user).toBeDefined();
      expect(responseData.user.email).toBe(testUser.email);
      expect(responseData.tokens).toBeDefined();
      expect(responseData.tokens.accessToken).toBeDefined();
      expect(responseData.tokens.refreshToken).toBeDefined();

      // 检查Cookie设置
      const cookies = res._getHeaders()['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('accessToken'))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('refreshToken'))).toBe(true);

      authTokens = {
        accessToken: responseData.tokens.accessToken,
        refreshToken: responseData.tokens.refreshToken
      };
    });

    test('should reject login with incorrect password', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: 'WrongPassword123!'
        }
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid email or password');
    });

    test('should reject login with non-existent email', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
          password: testUser.password
        }
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Invalid email or password');
    });
  });

  describe('Token Refresh Flow', () => {
    beforeEach(async () => {
      // 先注册并登录用户
      const registerReq = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName
        }
      });

      await registerHandler(registerReq.req, registerReq.res);
      
      const registerData = JSON.parse(registerReq.res._getData());
      authTokens = {
        accessToken: registerData.tokens.accessToken,
        refreshToken: registerData.tokens.refreshToken
      };
    });

    test('should refresh token with valid refresh token', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          refreshToken: authTokens.refreshToken
        }
      });

      await refreshTokenHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.tokens).toBeDefined();
      expect(responseData.tokens.accessToken).toBeDefined();
      expect(responseData.tokens.refreshToken).toBeDefined();
      expect(responseData.tokens.accessToken).not.toBe(authTokens.accessToken);
    });

    test('should reject refresh with invalid token', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          refreshToken: 'invalid-refresh-token'
        }
      });

      await refreshTokenHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });

    test('should refresh token from cookie', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'POST',
        cookies: {
          refreshToken: authTokens.refreshToken
        }
      });

      await refreshTokenHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
    });
  });

  describe('Protected Route Access', () => {
    beforeEach(async () => {
      // 先注册并登录用户
      const registerReq = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName
        }
      });

      await registerHandler(registerReq.req, registerReq.res);
      
      const registerData = JSON.parse(registerReq.res._getData());
      authTokens = {
        accessToken: registerData.tokens.accessToken,
        refreshToken: registerData.tokens.refreshToken
      };
    });

    test('should access protected route with valid token', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer ${authTokens.accessToken}`
        }
      });

      await preferencesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.preferences).toBeDefined();
    });

    test('should reject access without token', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await preferencesHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('认证失败');
    });

    test('should reject access with invalid token', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      await preferencesHandler(req, res);

      expect(res._getStatusCode()).toBe(403);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });
  });

  describe('User Preferences Management', () => {
    beforeEach(async () => {
      // 先注册并登录用户
      const registerReq = createMocks({
        method: 'POST',
        body: {
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName
        }
      });

      await registerHandler(registerReq.req, registerReq.res);
      
      const registerData = JSON.parse(registerReq.res._getData());
      authTokens = {
        accessToken: registerData.tokens.accessToken,
        refreshToken: registerData.tokens.refreshToken
      };
    });

    test('should update user preferences', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          authorization: `Bearer ${authTokens.accessToken}`
        },
        body: {
          travelStyles: ['adventure', 'nature'],
          budgetRange: 'luxury',
          language: 'en-US',
          emailNotifications: false
        }
      });

      await preferencesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.preferences).toBeDefined();
      expect(responseData.preferences.travelStyles).toContain('adventure');
      expect(responseData.preferences.budgetRange).toBe('luxury');
    });

    test('should reject invalid preference values', async ({ unitContext }) => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          authorization: `Bearer ${authTokens.accessToken}`
        },
        body: {
          budgetRange: 'invalid-budget-range',
          language: 'invalid-language-format'
        }
      });

      await preferencesHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
    });
  });
});
