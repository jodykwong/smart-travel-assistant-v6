/**
 * 智游助手v6.2 - JWT管理器单元测试
 * 测试JWT token生成、验证、刷新功能
 */

import { test, expect, describe, beforeEach, beforeAll, afterAll, vi } from './test-utils';

import { JWTManager, TokenPayload } from '../../lib/auth/jwt-manager';

describe('JWTManager', () => {
  let jwtManager: JWTManager;
  let mockTokenPayload: TokenPayload;

  beforeEach(() => {
    jwtManager = new JWTManager({
      accessTokenSecret: 'test-access-secret-key-for-testing-purposes-only',
      refreshTokenSecret: 'test-refresh-secret-key-for-testing-purposes-only',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      issuer: 'smart-travel-test',
      audience: 'smart-travel-test-users'
    });

    mockTokenPayload = {
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: ['user:read', 'user:update'],
      sessionId: 'test-session-123'
    };
  });

  describe('Token Generation', () => {
    test('should generate valid token pair', async ({ unitContext }) => {
      const tokenPair = await jwtManager.generateTokenPair(mockTokenPayload);

      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('expiresIn');
      expect(tokenPair).toHaveProperty('tokenType', 'Bearer');
      expect(typeof tokenPair.accessToken).toBe('string');
      expect(typeof tokenPair.refreshToken).toBe('string');
      expect(tokenPair.expiresIn).toBeGreaterThan(0);
    });

    test('should generate different tokens for different payloads', async ({ unitContext }) => {
      const payload1 = { ...mockTokenPayload, userId: 'user-1' };
      const payload2 = { ...mockTokenPayload, userId: 'user-2' };

      const tokens1 = await jwtManager.generateTokenPair(payload1);
      const tokens2 = await jwtManager.generateTokenPair(payload2);

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('Token Validation', () => {
    test('should validate valid access token', async ({ unitContext }) => {
      const tokenPair = await jwtManager.generateTokenPair(mockTokenPayload);
      const validation = await jwtManager.validateAccessToken(tokenPair.accessToken);

      expect(validation.valid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.userId).toBe(mockTokenPayload.userId);
      expect(validation.payload?.email).toBe(mockTokenPayload.email);
      expect(validation.payload?.role).toBe(mockTokenPayload.role);
    });

    test('should reject invalid access token', async ({ unitContext }) => {
      const validation = await jwtManager.validateAccessToken('invalid-token');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
      expect(validation.payload).toBeUndefined();
    });

    test('should validate valid refresh token', async ({ unitContext }) => {
      const tokenPair = await jwtManager.generateTokenPair(mockTokenPayload);
      const validation = await jwtManager.validateRefreshToken(tokenPair.refreshToken);

      expect(validation.valid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.userId).toBe(mockTokenPayload.userId);
    });

    test('should reject invalid refresh token', async ({ unitContext }) => {
      const validation = await jwtManager.validateRefreshToken('invalid-refresh-token');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token with valid refresh token', async ({ unitContext }) => {
      const originalTokens = await jwtManager.generateTokenPair(mockTokenPayload);
      const newTokens = await jwtManager.refreshAccessToken(
        originalTokens.refreshToken,
        mockTokenPayload
      );

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    test('should fail to refresh with invalid refresh token', async ({ unitContext }) => {
      await expect(
        jwtManager.refreshAccessToken('invalid-refresh-token', mockTokenPayload)
      ).rejects.toThrow();
    });
  });

  describe('Token Revocation', () => {
    test('should revoke token successfully', async ({ unitContext }) => {
      const tokenPair = await jwtManager.generateTokenPair(mockTokenPayload);
      const revokeResult = await jwtManager.revokeToken(tokenPair.accessToken);

      expect(revokeResult).toBe(true);

      // 被撤销的token应该无法验证
      const validation = await jwtManager.validateAccessToken(tokenPair.accessToken);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('撤销');
    });

    test('should revoke all user tokens', async ({ unitContext }) => {
      const revokeResult = await jwtManager.revokeAllUserTokens(mockTokenPayload.userId);
      expect(revokeResult).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('should decode token without verification', () => {
      const tokenPair = jwtManager.generateTokenPair(mockTokenPayload);
      
      tokenPair.then(tokens => {
        const decoded = jwtManager.decodeToken(tokens.accessToken);
        expect(decoded).toBeDefined();
        expect(decoded.userId).toBe(mockTokenPayload.userId);
      });
    });

    test('should return null for invalid token decode', () => {
      const decoded = jwtManager.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    test('should cleanup blacklist', () => {
      expect(() => jwtManager.cleanupBlacklist()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed tokens gracefully', async ({ unitContext }) => {
      const validation = await jwtManager.validateAccessToken('malformed.token.here');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    test('should handle empty token gracefully', async ({ unitContext }) => {
      const validation = await jwtManager.validateAccessToken('');
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('should use default configuration when not provided', () => {
      const defaultJwtManager = new JWTManager();
      expect(defaultJwtManager).toBeDefined();
    });

    test('should use custom configuration when provided', () => {
      const customConfig = {
        accessTokenExpiry: '30m',
        refreshTokenExpiry: '14d'
      };
      
      const customJwtManager = new JWTManager(customConfig);
      expect(customJwtManager).toBeDefined();
    });
  });
});
