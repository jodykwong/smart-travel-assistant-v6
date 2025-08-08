/**
 * 智游助手v6.2 - 密码管理器
 * 遵循原则: [纵深防御] + [为失败而设计] + [SOLID-单一职责]
 * 
 * 核心功能:
 * 1. 密码哈希加密
 * 2. 密码验证
 * 3. 密码强度检查
 * 4. 密码策略管理
 */

import bcrypt from 'bcrypt';
import validator from 'validator';
import { randomBytes } from 'crypto';

// ============= 密码管理接口定义 =============

export interface PasswordConfig {
  saltRounds: number;
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAttempts: number;
  lockoutDuration: number; // 分钟
}

export interface PasswordStrengthResult {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
  passed: boolean;
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
  algorithm: string;
  rounds: number;
  createdAt: Date;
}

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  attempts?: number | undefined;
  lockedUntil?: Date | undefined;
}

// ============= 密码管理器实现 =============

export class PasswordManager {
  private config: PasswordConfig;
  private failedAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();

  constructor(config?: Partial<PasswordConfig>) {
    this.config = {
      saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAttempts: 5,
      lockoutDuration: 15, // 15分钟
      ...config
    };

    console.log('✅ 密码管理器初始化完成');
  }

  // ============= 密码哈希功能 =============

  /**
   * 生成密码哈希
   * 遵循原则: [纵深防御] - 使用bcrypt + 自定义盐值
   */
  async hashPassword(password: string): Promise<PasswordHashResult> {
    try {
      // 密码强度检查
      const strengthCheck = this.checkPasswordStrength(password);
      if (!strengthCheck.passed) {
        throw new Error(`密码强度不足: ${strengthCheck.feedback.join(', ')}`);
      }

      // 生成盐值
      const salt = await bcrypt.genSalt(this.config.saltRounds);
      
      // 生成哈希
      const hash = await bcrypt.hash(password, salt);

      const result: PasswordHashResult = {
        hash,
        salt,
        algorithm: 'bcrypt',
        rounds: this.config.saltRounds,
        createdAt: new Date()
      };

      console.log('✅ 密码哈希生成成功');
      return result;

    } catch (error) {
      console.error('❌ 密码哈希生成失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`密码哈希失败: ${errorMessage}`);
    }
  }

  /**
   * 验证密码
   * 遵循原则: [为失败而设计] - 防暴力破解机制
   */
  async verifyPassword(
    password: string, 
    hash: string, 
    userId?: string
  ): Promise<PasswordValidationResult> {
    try {
      // 检查账户是否被锁定
      if (userId && this.isAccountLocked(userId)) {
        const lockInfo = this.failedAttempts.get(userId);
        return {
          valid: false,
          error: '账户已被锁定，请稍后再试',
          lockedUntil: lockInfo?.lockedUntil || undefined
        };
      }

      // 验证密码
      const isValid = await bcrypt.compare(password, hash);

      if (isValid) {
        // 密码正确，清除失败记录
        if (userId) {
          this.failedAttempts.delete(userId);
        }
        
        console.log('✅ 密码验证成功');
        return { valid: true };
      } else {
        // 密码错误，记录失败尝试
        if (userId) {
          this.recordFailedAttempt(userId);
          const attempts = this.failedAttempts.get(userId);
          
          return {
            valid: false,
            error: '密码错误',
            attempts: attempts?.count,
            lockedUntil: attempts?.lockedUntil
          };
        }

        return {
          valid: false,
          error: '密码错误'
        };
      }

    } catch (error) {
      console.error('❌ 密码验证失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        error: `密码验证失败: ${errorMessage}`
      };
    }
  }

  // ============= 密码强度检查 =============

  /**
   * 检查密码强度
   * 遵循原则: [SOLID-单一职责] - 专门处理密码强度评估
   */
  checkPasswordStrength(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length < this.config.minLength) {
      feedback.push(`密码长度至少${this.config.minLength}位`);
    } else if (password.length >= this.config.minLength) {
      score += 20;
    }

    if (password.length > this.config.maxLength) {
      feedback.push(`密码长度不能超过${this.config.maxLength}位`);
      return { score: 0, level: 'weak', feedback, passed: false };
    }

    // 大写字母检查
    if (this.config.requireUppercase) {
      if (!/[A-Z]/.test(password)) {
        feedback.push('密码必须包含大写字母');
      } else {
        score += 15;
      }
    }

    // 小写字母检查
    if (this.config.requireLowercase) {
      if (!/[a-z]/.test(password)) {
        feedback.push('密码必须包含小写字母');
      } else {
        score += 15;
      }
    }

    // 数字检查
    if (this.config.requireNumbers) {
      if (!/\d/.test(password)) {
        feedback.push('密码必须包含数字');
      } else {
        score += 15;
      }
    }

    // 特殊字符检查
    if (this.config.requireSpecialChars) {
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        feedback.push('密码必须包含特殊字符');
      } else {
        score += 15;
      }
    }

    // 复杂度加分
    if (password.length >= 12) score += 10;
    if (/[A-Z].*[A-Z]/.test(password)) score += 5; // 多个大写字母
    if (/\d.*\d/.test(password)) score += 5; // 多个数字
    if (!/(.)\1{2,}/.test(password)) score += 5; // 无连续重复字符

    // 常见密码检查
    const commonPasswords = [
      'password', '123456', 'qwerty', 'abc123', 'password123',
      '12345678', 'welcome', 'admin', 'letmein', 'monkey'
    ];
    
    if (commonPasswords.some(common => 
      password.toLowerCase().includes(common.toLowerCase())
    )) {
      feedback.push('密码不能包含常见密码模式');
      score -= 20;
    }

    // 确定强度等级
    let level: PasswordStrengthResult['level'];
    if (score >= 90) level = 'very-strong';
    else if (score >= 75) level = 'strong';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'fair';
    else level = 'weak';

    const passed = feedback.length === 0 && score >= 60;

    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      feedback,
      passed
    };
  }

  // ============= 防暴力破解功能 =============

  /**
   * 记录失败尝试
   */
  private recordFailedAttempt(userId: string): void {
    const now = new Date();
    const existing = this.failedAttempts.get(userId);

    if (existing) {
      existing.count++;
      existing.lastAttempt = now;

      // 达到最大尝试次数，锁定账户
      if (existing.count >= this.config.maxAttempts) {
        existing.lockedUntil = new Date(now.getTime() + this.config.lockoutDuration * 60 * 1000);
        console.log(`⚠️ 用户${userId}账户已被锁定，锁定至: ${existing.lockedUntil}`);
      }
    } else {
      this.failedAttempts.set(userId, {
        count: 1,
        lastAttempt: now
      });
    }
  }

  /**
   * 检查账户是否被锁定
   */
  private isAccountLocked(userId: string): boolean {
    const attempts = this.failedAttempts.get(userId);
    if (!attempts || !attempts.lockedUntil) return false;

    const now = new Date();
    if (now > attempts.lockedUntil) {
      // 锁定期已过，清除记录
      this.failedAttempts.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * 手动解锁账户
   */
  public unlockAccount(userId: string): boolean {
    try {
      this.failedAttempts.delete(userId);
      console.log(`✅ 用户${userId}账户已解锁`);
      return true;
    } catch (error) {
      console.error('❌ 账户解锁失败:', error);
      return false;
    }
  }

  // ============= 密码策略管理 =============

  /**
   * 生成安全密码
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';
    let charset = '';

    // 确保包含所有必需的字符类型
    if (this.config.requireUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      charset += uppercase;
    }
    if (this.config.requireLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      charset += lowercase;
    }
    if (this.config.requireNumbers) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
      charset += numbers;
    }
    if (this.config.requireSpecialChars) {
      password += special[Math.floor(Math.random() * special.length)];
      charset += special;
    }

    // 填充剩余长度
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // 打乱密码字符顺序
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * 检查密码是否需要更新
   */
  shouldUpdatePassword(createdAt: Date, maxAge: number = 90): boolean {
    const now = new Date();
    const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > maxAge;
  }

  /**
   * 清理过期的失败尝试记录
   */
  public cleanupFailedAttempts(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时前

    for (const [userId, attempts] of this.failedAttempts.entries()) {
      if (attempts.lastAttempt < cutoff) {
        this.failedAttempts.delete(userId);
      }
    }

    console.log('✅ 过期的失败尝试记录已清理');
  }

  /**
   * 获取密码策略信息
   */
  public getPasswordPolicy(): PasswordConfig {
    return { ...this.config };
  }
}

// ============= 单例导出 =============

export const passwordManager = new PasswordManager();
export default passwordManager;
