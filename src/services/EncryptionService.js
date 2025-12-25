import CryptoJS from 'crypto-js';
import { KeyManager } from './KeyManager';

/**
 * 加密服务
 * 使用AES-256算法对敏感数据进行加密/解密
 */
export class EncryptionService {
  /**
   * 加密数据
   * @param {string} data - 要加密的数据（JSON字符串）
   * @returns {Promise<string>} 加密后的数据（base64编码）
   */
  static async encrypt(data) {
    try {
      if (!data) {
        return data;
      }

      // 获取加密密钥
      const key = await KeyManager.getOrCreateKey();

      // 使用AES-256-CBC模式加密
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // 返回base64编码的加密数据
      return encrypted.toString();
    } catch (error) {
      console.error('加密失败:', error);
      throw new Error('数据加密失败');
    }
  }

  /**
   * 解密数据
   * @param {string} encryptedData - 加密的数据（base64编码）
   * @returns {Promise<string>} 解密后的原始数据（JSON字符串）
   */
  static async decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        return encryptedData;
      }

      // 检查是否是加密数据（加密数据通常是base64格式，长度较长）
      // 简单检查：如果数据看起来不像加密数据，直接返回
      if (typeof encryptedData !== 'string' || encryptedData.length < 20) {
        // 可能是旧数据（未加密），尝试直接返回
        return encryptedData;
      }

      // 获取加密密钥
      const key = await KeyManager.getOrCreateKey();

      // 解密数据
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // 转换为UTF-8字符串
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      // 如果解密失败，返回空字符串或原始数据
      if (!decryptedString) {
        // 可能是旧数据（未加密），尝试直接返回
        return encryptedData;
      }

      return decryptedString;
    } catch (error) {
      console.error('解密失败:', error);
      // 如果解密失败，可能是旧数据（未加密），尝试直接返回
      try {
        return encryptedData;
      } catch {
        throw new Error('数据解密失败');
      }
    }
  }

  /**
   * 加密对象（自动序列化为JSON）
   * @param {any} obj - 要加密的对象
   * @returns {Promise<string>} 加密后的数据
   */
  static async encryptObject(obj) {
    try {
      const jsonString = JSON.stringify(obj);
      return await this.encrypt(jsonString);
    } catch (error) {
      console.error('加密对象失败:', error);
      throw error;
    }
  }

  /**
   * 解密对象（自动反序列化JSON）
   * @param {string} encryptedData - 加密的数据
   * @returns {Promise<any>} 解密后的对象
   */
  static async decryptObject(encryptedData) {
    try {
      const decryptedString = await this.decrypt(encryptedData);
      
      // 尝试解析JSON
      try {
        return JSON.parse(decryptedString);
      } catch (parseError) {
        // 如果不是JSON，返回原始字符串
        return decryptedString;
      }
    } catch (error) {
      console.error('解密对象失败:', error);
      throw error;
    }
  }

  /**
   * 检查数据是否已加密
   * @param {string} data - 要检查的数据
   * @returns {boolean} 是否为加密数据
   */
  static isEncrypted(data) {
    if (!data || typeof data !== 'string') {
      return false;
    }
    // 加密数据通常是base64格式，长度较长且符合base64特征
    // 简单检查：长度大于20且只包含base64字符
    const base64Pattern = /^[A-Za-z0-9+/=]+$/;
    return data.length > 20 && base64Pattern.test(data);
  }
}

