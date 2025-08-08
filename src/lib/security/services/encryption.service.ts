/**
 * 加密服务实现
 * 基于AES-256-GCM加密算法
 * 支持密钥轮换和JWT令牌管理
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { IEncryptionService, EncryptionError } from '../interfaces/security.interfaces';

export class AESEncryptionService implements IEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltRounds = 12;

  private masterKey: Buffer;
  private jwtSecret: string;
  private keyRotationInterval: number;
  private lastKeyRotation: Date;

  constructor(
    masterKeyHex: string,
    jwtSecret: string,
    keyRotationInterval: number = 24 * 60 * 60 * 1000 // 24小时
  ) {
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new EncryptionError('Master key must be 64 hex characters (256 bits)');
    }

    if (!jwtSecret || jwtSecret.length < 32) {
      throw new EncryptionError('JWT secret must be at least 32 characters');
    }

    this.masterKey = Buffer.from(masterKeyHex, 'hex');
    this.jwtSecret = jwtSecret;
    this.keyRotationInterval = keyRotationInterval;
    this.lastKeyRotation = new Date();

    console.log('🔐 AES加密服务初始化完成');
  }

  /**
   * 对称加密
   */
  async encrypt(data: string, key?: string): Promise<string> {
    try {
      const encryptionKey = key ? Buffer.from(key, 'hex') : this.masterKey;
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipher(this.algorithm, encryptionKey);
      cipher.setAAD(Buffer.from('smart-travel-v6.2', 'utf8'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // 组合: iv + tag + encrypted
      const result = iv.toString('hex') + tag.toString('hex') + encrypted;
      
      return result;
    } catch (error) {
      throw new EncryptionError(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * 对称解密
   */
  async decrypt(encryptedData: string, key?: string): Promise<string> {
    try {
      const encryptionKey = key ? Buffer.from(key, 'hex') : this.masterKey;
      
      // 解析: iv + tag + encrypted
      const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
      const tag = Buffer.from(encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2), 'hex');
      const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
      
      const decipher = crypto.createDecipher(this.algorithm, encryptionKey);
      decipher.setAAD(Buffer.from('smart-travel-v6.2', 'utf8'));
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new EncryptionError(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * 哈希
   */
  async hash(data: string, algorithm: string = 'sha256'): Promise<string> {
    try {
      if (algorithm === 'bcrypt') {
        return await bcrypt.hash(data, this.saltRounds);
      }
      
      const hash = crypto.createHash(algorithm);
      hash.update(data);
      return hash.digest('hex');
    } catch (error) {
      throw new EncryptionError(`Hashing failed: ${error.message}`);
    }
  }

  /**
   * 哈希比较
   */
  async compareHash(data: string, hash: string): Promise<boolean> {
    try {
      // 检测是否为bcrypt哈希
      if (hash.startsWith('$2b$') || hash.startsWith('$2a$') || hash.startsWith('$2y$')) {
        return await bcrypt.compare(data, hash);
      }
      
      // 普通哈希比较
      const dataHash = await this.hash(data);
      return crypto.timingSafeEqual(Buffer.from(dataHash), Buffer.from(hash));
    } catch (error) {
      throw new EncryptionError(`Hash comparison failed: ${error.message}`);
    }
  }

  /**
   * 数字签名
   */
  async sign(data: any, privateKey?: string): Promise<string> {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const key = privateKey || this.jwtSecret;
      
      const hmac = crypto.createHmac('sha256', key);
      hmac.update(dataString);
      return hmac.digest('hex');
    } catch (error) {
      throw new EncryptionError(`Signing failed: ${error.message}`);
    }
  }

  /**
   * 签名验证
   */
  async verify(data: any, signature: string, publicKey?: string): Promise<boolean> {
    try {
      const expectedSignature = await this.sign(data, publicKey);
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
      throw new EncryptionError(`Signature verification failed: ${error.message}`);
    }
  }

  /**
   * 生成密钥
   */
  async generateKey(length: number = 32): Promise<string> {
    try {
      const key = crypto.randomBytes(length);
      return key.toString('hex');
    } catch (error) {
      throw new EncryptionError(`Key generation failed: ${error.message}`);
    }
  }

  /**
   * 密钥轮换
   */
  async rotateKey(keyId: string): Promise<string> {
    try {
      const newKey = await this.generateKey();
      this.lastKeyRotation = new Date();
      
      console.log(`🔄 密钥轮换完成: ${keyId}`);
      return newKey;
    } catch (error) {
      throw new EncryptionError(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * JWT签名
   */
  async signJWT(payload: any, expiresIn: string = '1h'): Promise<string> {
    try {
      const options: jwt.SignOptions = {
        expiresIn,
        issuer: 'smart-travel-v6.2',
        audience: 'smart-travel-users'
      };

      return jwt.sign(payload, this.jwtSecret, options);
    } catch (error) {
      throw new EncryptionError(`JWT signing failed: ${error.message}`);
    }
  }

  /**
   * JWT验证
   */
  async verifyJWT(token: string): Promise<any> {
    try {
      const options: jwt.VerifyOptions = {
        issuer: 'smart-travel-v6.2',
        audience: 'smart-travel-users'
      };

      return jwt.verify(token, this.jwtSecret, options);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new EncryptionError('JWT token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new EncryptionError('Invalid JWT token');
      }
      throw new EncryptionError(`JWT verification failed: ${error.message}`);
    }
  }

  /**
   * 生成随机数
   */
  generateNonce(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成盐值
   */
  generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 检查是否需要密钥轮换
   */
  shouldRotateKey(): boolean {
    const timeSinceLastRotation = Date.now() - this.lastKeyRotation.getTime();
    return timeSinceLastRotation >= this.keyRotationInterval;
  }

  /**
   * 生成安全的密码哈希
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new EncryptionError(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new EncryptionError(`Password verification failed: ${error.message}`);
    }
  }

  /**
   * 生成安全令牌
   */
  async generateSecurityToken(data: any): Promise<string> {
    try {
      const timestamp = Date.now();
      const nonce = this.generateNonce();
      
      const tokenData = {
        data,
        timestamp,
        nonce
      };

      const encryptedData = await this.encrypt(JSON.stringify(tokenData));
      const signature = await this.sign(encryptedData);
      
      return `${encryptedData}.${signature}`;
    } catch (error) {
      throw new EncryptionError(`Security token generation failed: ${error.message}`);
    }
  }

  /**
   * 验证安全令牌
   */
  async verifySecurityToken(token: string): Promise<any> {
    try {
      const [encryptedData, signature] = token.split('.');
      
      if (!encryptedData || !signature) {
        throw new EncryptionError('Invalid token format');
      }

      // 验证签名
      const isValidSignature = await this.verify(encryptedData, signature);
      if (!isValidSignature) {
        throw new EncryptionError('Invalid token signature');
      }

      // 解密数据
      const decryptedData = await this.decrypt(encryptedData);
      const tokenData = JSON.parse(decryptedData);

      // 检查时间戳（防止重放攻击）
      const tokenAge = Date.now() - tokenData.timestamp;
      const maxAge = 30 * 60 * 1000; // 30分钟

      if (tokenAge > maxAge) {
        throw new EncryptionError('Token expired');
      }

      return tokenData.data;
    } catch (error) {
      throw new EncryptionError(`Security token verification failed: ${error.message}`);
    }
  }

  /**
   * 计算数据完整性校验和
   */
  async calculateChecksum(data: any): Promise<string> {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      return await this.hash(dataString, 'sha256');
    } catch (error) {
      throw new EncryptionError(`Checksum calculation failed: ${error.message}`);
    }
  }

  /**
   * 验证数据完整性
   */
  async verifyChecksum(data: any, expectedChecksum: string): Promise<boolean> {
    try {
      const actualChecksum = await this.calculateChecksum(data);
      return crypto.timingSafeEqual(Buffer.from(actualChecksum), Buffer.from(expectedChecksum));
    } catch (error) {
      throw new EncryptionError(`Checksum verification failed: ${error.message}`);
    }
  }

  /**
   * 获取加密服务状态
   */
  getStatus(): {
    algorithm: string;
    keyAge: number;
    shouldRotate: boolean;
    lastRotation: Date;
  } {
    return {
      algorithm: this.algorithm,
      keyAge: Date.now() - this.lastKeyRotation.getTime(),
      shouldRotate: this.shouldRotateKey(),
      lastRotation: this.lastKeyRotation
    };
  }
}
