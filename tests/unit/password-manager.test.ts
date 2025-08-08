/**
 * 智游助手v6.2 - 密码管理器单元测试
 * 测试密码哈希、验证、强度检查功能
 * 使用 Playwright 测试框架
 */

import { test, expect, describe, beforeEach } from './test-utils';
import { PasswordManager } from '../../lib/auth/password-manager';

describe('PasswordManager', () => {
  let passwordManager: PasswordManager;

  beforeEach(() => {
    passwordManager = new PasswordManager({
      saltRounds: 10, // 降低测试时的计算复杂度
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAttempts: 3,
      lockoutDuration: 5 // 5分钟
    });
  });

  describe('Password Hashing', () => {
    test('should hash password successfully', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const hashResult = await passwordManager.hashPassword(password);

      expect(hashResult).toHaveProperty('hash');
      expect(hashResult).toHaveProperty('salt');
      expect(hashResult).toHaveProperty('algorithm', 'bcrypt');
      expect(hashResult).toHaveProperty('rounds', 10);
      expect(hashResult).toHaveProperty('createdAt');
      expect(typeof hashResult.hash).toBe('string');
      expect(hashResult.hash.length).toBeGreaterThan(0);
    });

    test('should generate different hashes for same password', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const hash1 = await passwordManager.hashPassword(password);
      const hash2 = await passwordManager.hashPassword(password);

      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.salt).not.toBe(hash2.salt);
    });

    test('should reject weak password', async ({ unitContext }) => {
      const weakPassword = '123';
      
      await expect(passwordManager.hashPassword(weakPassword))
        .rejects.toThrow('密码强度不足');
    });
  });

  describe('Password Verification', () => {
    test('should verify correct password', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const hashResult = await passwordManager.hashPassword(password);
      const verification = await passwordManager.verifyPassword(password, hashResult.hash);

      expect(verification.valid).toBe(true);
      expect(verification.error).toBeUndefined();
    });

    test('should reject incorrect password', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashResult = await passwordManager.hashPassword(password);
      const verification = await passwordManager.verifyPassword(wrongPassword, hashResult.hash);

      expect(verification.valid).toBe(false);
      expect(verification.error).toBe('密码错误');
    });

    test('should track failed attempts', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const userId = 'test-user-123';
      const hashResult = await passwordManager.hashPassword(password);

      // 第一次失败尝试
      const attempt1 = await passwordManager.verifyPassword(wrongPassword, hashResult.hash, userId);
      expect(attempt1.valid).toBe(false);
      expect(attempt1.attempts).toBe(1);

      // 第二次失败尝试
      const attempt2 = await passwordManager.verifyPassword(wrongPassword, hashResult.hash, userId);
      expect(attempt2.valid).toBe(false);
      expect(attempt2.attempts).toBe(2);
    });

    test('should lock account after max attempts', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const userId = 'test-user-456';
      const hashResult = await passwordManager.hashPassword(password);

      // 达到最大尝试次数
      for (let i = 0; i < 3; i++) {
        await passwordManager.verifyPassword(wrongPassword, hashResult.hash, userId);
      }

      // 第四次尝试应该被锁定
      const lockedAttempt = await passwordManager.verifyPassword(wrongPassword, hashResult.hash, userId);
      expect(lockedAttempt.valid).toBe(false);
      expect(lockedAttempt.error).toContain('锁定');
      expect(lockedAttempt.lockedUntil).toBeDefined();
    });

    test('should clear failed attempts on successful login', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const userId = 'test-user-789';
      const hashResult = await passwordManager.hashPassword(password);

      // 失败尝试
      await passwordManager.verifyPassword(wrongPassword, hashResult.hash, userId);
      
      // 成功登录应该清除失败记录
      const successAttempt = await passwordManager.verifyPassword(password, hashResult.hash, userId);
      expect(successAttempt.valid).toBe(true);
      expect(successAttempt.attempts).toBeUndefined();
    });
  });

  describe('Password Strength Check', () => {
    test('should pass strong password', () => {
      const strongPassword = 'StrongPassword123!@#';
      const result = passwordManager.checkPasswordStrength(strongPassword);

      expect(result.passed).toBe(true);
      expect(result.level).toBeOneOf(['good', 'strong', 'very-strong']);
      expect(result.score).toBeGreaterThan(60);
      expect(result.feedback).toHaveLength(0);
    });

    test('should fail weak password', () => {
      const weakPassword = '123';
      const result = passwordManager.checkPasswordStrength(weakPassword);

      expect(result.passed).toBe(false);
      expect(result.level).toBe('weak');
      expect(result.score).toBeLessThan(60);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    test('should check minimum length requirement', () => {
      const shortPassword = '1234567'; // 7 characters
      const result = passwordManager.checkPasswordStrength(shortPassword);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('密码长度至少8位');
    });

    test('should check uppercase requirement', () => {
      const noUppercasePassword = 'testpassword123!';
      const result = passwordManager.checkPasswordStrength(noUppercasePassword);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('密码必须包含大写字母');
    });

    test('should check lowercase requirement', () => {
      const noLowercasePassword = 'TESTPASSWORD123!';
      const result = passwordManager.checkPasswordStrength(noLowercasePassword);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('密码必须包含小写字母');
    });

    test('should check number requirement', () => {
      const noNumberPassword = 'TestPassword!';
      const result = passwordManager.checkPasswordStrength(noNumberPassword);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('密码必须包含数字');
    });

    test('should check special character requirement', () => {
      const noSpecialPassword = 'TestPassword123';
      const result = passwordManager.checkPasswordStrength(noSpecialPassword);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('密码必须包含特殊字符');
    });

    test('should detect common passwords', () => {
      const commonPassword = 'Password123!';
      const result = passwordManager.checkPasswordStrength(commonPassword);

      expect(result.passed).toBe(false);
      expect(result.feedback).toContain('密码不能包含常见密码模式');
    });
  });

  describe('Account Management', () => {
    test('should unlock account manually', () => {
      const userId = 'test-user-unlock';
      const result = passwordManager.unlockAccount(userId);

      expect(result).toBe(true);
    });

    test('should cleanup failed attempts', () => {
      expect(() => passwordManager.cleanupFailedAttempts()).not.toThrow();
    });
  });

  describe('Password Generation', () => {
    test('should generate secure password', () => {
      const password = passwordManager.generateSecurePassword(16);

      expect(typeof password).toBe('string');
      expect(password.length).toBe(16);
      
      // 检查生成的密码是否符合强度要求
      const strengthCheck = passwordManager.checkPasswordStrength(password);
      expect(strengthCheck.passed).toBe(true);
    });

    test('should generate different passwords each time', () => {
      const password1 = passwordManager.generateSecurePassword(12);
      const password2 = passwordManager.generateSecurePassword(12);

      expect(password1).not.toBe(password2);
    });
  });

  describe('Password Policy', () => {
    test('should check if password needs update', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100天前
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前

      expect(passwordManager.shouldUpdatePassword(oldDate, 90)).toBe(true);
      expect(passwordManager.shouldUpdatePassword(recentDate, 90)).toBe(false);
    });

    test('should get password policy', () => {
      const policy = passwordManager.getPasswordPolicy();

      expect(policy).toHaveProperty('minLength');
      expect(policy).toHaveProperty('maxLength');
      expect(policy).toHaveProperty('requireUppercase');
      expect(policy).toHaveProperty('requireLowercase');
      expect(policy).toHaveProperty('requireNumbers');
      expect(policy).toHaveProperty('requireSpecialChars');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid hash gracefully', async ({ unitContext }) => {
      const password = 'TestPassword123!';
      const invalidHash = 'invalid-hash';

      const verification = await passwordManager.verifyPassword(password, invalidHash);
      expect(verification.valid).toBe(false);
      expect(verification.error).toBeDefined();
    });

    test('should handle empty password gracefully', async ({ unitContext }) => {
      await expect(passwordManager.hashPassword(''))
        .rejects.toThrow();
    });
  });
});
