/**
 * 智游助手v6.2 - 加密服务
 * 遵循原则: [纵深防御] + [为失败而设计] + [SOLID-单一职责]
 * 
 * 核心功能:
 * 1. 支付数据加密解密
 * 2. 敏感信息保护
 * 3. 密钥管理
 * 4. 数据完整性验证
 */

import { createCipher, createDecipher, createHash, randomBytes, pbkdf2Sync } from 'crypto';

// ============= 加密配置接口 =============

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
  hashAlgorithm: string;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  tag?: string;
  algorithm: string;
  timestamp: Date;
}

export interface DecryptedData {
  data: string;
  verified: boolean;
  timestamp: Date;
}

// ============= 加密服务实现 =============

export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: string;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      saltLength: 32,
      iterations: 100000,
      hashAlgorithm: 'sha256',
      ...config
    };

    // 从环境变量获取主密钥，如果没有则生成一个
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey();

    console.log('✅ 加密服务初始化完成');
  }

  // ============= 支付数据加密功能 =============

  /**
   * 加密支付敏感数据
   * 遵循原则: [纵深防御] - AES-256-GCM + PBKDF2密钥派生
   */
  async encryptPaymentData(data: any): Promise<EncryptedData> {
    try {
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      
      // 生成随机盐值和IV
      const salt = randomBytes(this.config.saltLength);
      const iv = randomBytes(this.config.ivLength);
      
      // 使用PBKDF2派生加密密钥
      const key = pbkdf2Sync(
        this.masterKey,
        salt,
        this.config.iterations,
        this.config.keyLength,
        this.config.hashAlgorithm
      );

      // 创建加密器
      const cipher = createCipher(this.config.algorithm, key);
      cipher.setAAD(Buffer.from('payment-data')); // 附加认证数据

      // 执行加密
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 获取认证标签（GCM模式）
      const tag = cipher.getAuthTag();

      const result: EncryptedData = {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.config.algorithm,
        timestamp: new Date()
      };

      console.log('✅ 支付数据加密成功');
      return result;

    } catch (error) {
      console.error('❌ 支付数据加密失败:', error);
      throw new Error(`加密失败: ${error.message}`);
    }
  }

  /**
   * 解密支付敏感数据
   * 遵循原则: [为失败而设计] - 完整的验证和错误处理
   */
  async decryptPaymentData(encryptedData: EncryptedData): Promise<DecryptedData> {
    try {
      // 验证加密数据完整性
      if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.salt) {
        throw new Error('加密数据不完整');
      }

      // 重建密钥
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const key = pbkdf2Sync(
        this.masterKey,
        salt,
        this.config.iterations,
        this.config.keyLength,
        this.config.hashAlgorithm
      );

      // 创建解密器
      const decipher = createDecipher(encryptedData.algorithm, key);
      decipher.setAAD(Buffer.from('payment-data'));
      
      if (encryptedData.tag) {
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      }

      // 执行解密
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      console.log('✅ 支付数据解密成功');

      return {
        data: decrypted,
        verified: true,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ 支付数据解密失败:', error);
      return {
        data: '',
        verified: false,
        timestamp: new Date()
      };
    }
  }

  // ============= 通用加密功能 =============

  /**
   * 加密敏感字符串
   */
  async encryptString(plaintext: string, context: string = 'general'): Promise<EncryptedData> {
    try {
      const salt = randomBytes(this.config.saltLength);
      const iv = randomBytes(this.config.ivLength);
      
      const key = pbkdf2Sync(
        this.masterKey,
        salt,
        this.config.iterations,
        this.config.keyLength,
        this.config.hashAlgorithm
      );

      const cipher = createCipher(this.config.algorithm, key);
      cipher.setAAD(Buffer.from(context));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.config.algorithm,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ 字符串加密失败:', error);
      throw new Error(`加密失败: ${error.message}`);
    }
  }

  /**
   * 解密敏感字符串
   */
  async decryptString(encryptedData: EncryptedData, context: string = 'general'): Promise<string> {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const key = pbkdf2Sync(
        this.masterKey,
        salt,
        this.config.iterations,
        this.config.keyLength,
        this.config.hashAlgorithm
      );

      const decipher = createDecipher(encryptedData.algorithm, key);
      decipher.setAAD(Buffer.from(context));
      
      if (encryptedData.tag) {
        decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      }

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      console.error('❌ 字符串解密失败:', error);
      throw new Error(`解密失败: ${error.message}`);
    }
  }

  // ============= 哈希功能 =============

  /**
   * 生成数据哈希
   * 用于数据完整性验证
   */
  generateHash(data: string | Buffer, algorithm: string = 'sha256'): string {
    try {
      const hash = createHash(algorithm);
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      console.error('❌ 哈希生成失败:', error);
      throw new Error(`哈希生成失败: ${error.message}`);
    }
  }

  /**
   * 验证数据哈希
   */
  verifyHash(data: string | Buffer, expectedHash: string, algorithm: string = 'sha256'): boolean {
    try {
      const actualHash = this.generateHash(data, algorithm);
      return actualHash === expectedHash;
    } catch (error) {
      console.error('❌ 哈希验证失败:', error);
      return false;
    }
  }

  // ============= 密钥管理功能 =============

  /**
   * 生成主密钥
   */
  private generateMasterKey(): string {
    const key = randomBytes(64).toString('hex');
    console.log('⚠️ 生成了新的主密钥，请保存到环境变量 ENCRYPTION_MASTER_KEY');
    console.log('🔑 主密钥:', key);
    return key;
  }

  /**
   * 轮换密钥（生成新的主密钥）
   */
  rotateMasterKey(): string {
    const newKey = randomBytes(64).toString('hex');
    console.log('🔄 密钥轮换完成');
    console.log('🔑 新主密钥:', newKey);
    return newKey;
  }

  /**
   * 验证密钥强度
   */
  validateKeyStrength(key: string): boolean {
    if (key.length < 64) {
      console.warn('⚠️ 密钥长度不足，建议至少64字符');
      return false;
    }
    
    // 检查密钥熵
    const uniqueChars = new Set(key).size;
    if (uniqueChars < 16) {
      console.warn('⚠️ 密钥熵不足，建议使用更复杂的密钥');
      return false;
    }

    return true;
  }

  // ============= 工具方法 =============

  /**
   * 安全地比较两个字符串（防时序攻击）
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * 生成随机字符串
   */
  generateRandomString(length: number = 32): string {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * 获取配置信息（脱敏）
   */
  public getConfig(): Partial<EncryptionConfig> {
    return {
      algorithm: this.config.algorithm,
      keyLength: this.config.keyLength,
      ivLength: this.config.ivLength,
      saltLength: this.config.saltLength,
      iterations: this.config.iterations,
      hashAlgorithm: this.config.hashAlgorithm
    };
  }

  /**
   * 测试加密解密功能
   */
  async testEncryption(): Promise<boolean> {
    try {
      const testData = 'test-payment-data-' + Date.now();
      const encrypted = await this.encryptPaymentData(testData);
      const decrypted = await this.decryptPaymentData(encrypted);
      
      const success = decrypted.verified && decrypted.data === testData;
      console.log(success ? '✅ 加密测试通过' : '❌ 加密测试失败');
      return success;
    } catch (error) {
      console.error('❌ 加密测试异常:', error);
      return false;
    }
  }
}

// ============= 单例导出 =============

export const encryptionService = new EncryptionService();
export default encryptionService;
