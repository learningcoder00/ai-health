import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { BAIDU_OCR_CONFIG } from '../config/baiduOCR';
import { SecureStorage } from '../utils/secureStorage';
import { MedicineDBService } from './MedicineDBService';

/**
 * 百度OCR服务
 * 负责处理图片识别、Token管理等
 */
export class OCRService {
  /**
   * 获取Access Token
   * 百度OCR需要先获取token才能调用API
   */
  static async getAccessToken() {
    try {
      // 先检查缓存的token
      const cachedToken = await this.getCachedToken();
      if (cachedToken) {
        return cachedToken;
      }

      // 如果没有缓存或已过期，重新获取
      const url = `${BAIDU_OCR_CONFIG.TOKEN_URL}?grant_type=client_credentials&client_id=${BAIDU_OCR_CONFIG.API_KEY}&client_secret=${BAIDU_OCR_CONFIG.SECRET_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`获取Token失败: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`获取Token失败: ${data.error_description || data.error}`);
      }

      const token = data.access_token;
      const expiresIn = data.expires_in || BAIDU_OCR_CONFIG.TOKEN_EXPIRE_TIME;

      // 缓存token
      await this.cacheToken(token, expiresIn);

      return token;
    } catch (error) {
      console.error('获取Access Token失败:', error);
      throw error;
    }
  }

  /**
   * 缓存Token
   */
  static async cacheToken(token, expiresIn) {
    try {
      const expireTime = Date.now() + (expiresIn - 300) * 1000; // 提前5分钟过期
      await SecureStorage.setItem(
        BAIDU_OCR_CONFIG.TOKEN_CACHE_KEY,
        {
          token,
          expireTime,
        }
      );
    } catch (error) {
      console.error('缓存Token失败:', error);
    }
  }

  /**
   * 获取缓存的Token
   */
  static async getCachedToken() {
    try {
      const cached = await SecureStorage.getItem(BAIDU_OCR_CONFIG.TOKEN_CACHE_KEY);
      if (!cached) {
        return null;
      }

      const { token, expireTime } = cached;
      
      // 检查是否过期
      if (Date.now() >= expireTime) {
        await SecureStorage.removeItem(BAIDU_OCR_CONFIG.TOKEN_CACHE_KEY);
        return null;
      }

      return token;
    } catch (error) {
      console.error('获取缓存Token失败:', error);
      return null;
    }
  }

  /**
   * 将图片URI转换为base64
   */
  static async imageToBase64(imageUri) {
    try {
      // Web平台使用fetch读取
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1]; // 移除data:image/...;base64,前缀
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // 移动端使用FileSystem读取
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return base64;
    } catch (error) {
      console.error('图片转base64失败:', error);
      throw new Error('图片处理失败，请重试');
    }
  }

  /**
   * 调用百度OCR API识别文字
   */
  static async recognizeText(imageUri) {
    try {
      // 1. 获取Access Token
      const accessToken = await this.getAccessToken();

      // 2. 将图片转换为base64
      const base64Image = await this.imageToBase64(imageUri);

      // 3. 调用OCR API
      const url = `${BAIDU_OCR_CONFIG.OCR_URL}?access_token=${accessToken}`;
      
      const formData = new URLSearchParams();
      formData.append('image', base64Image);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`OCR识别失败: ${response.status}`);
      }

      const result = await response.json();

      // 检查是否有错误
      if (result.error_code) {
        throw new Error(`OCR识别失败: ${result.error_msg || '未知错误'}`);
      }

      return result;
    } catch (error) {
      console.error('OCR识别错误:', error);
      throw error;
    }
  }

  /**
   * 从OCR结果中提取药品信息
   * 使用正则表达式和关键词匹配来提取药品名称、剂量、频率等信息
   */
  static extractMedicineInfo(ocrResult) {
    try {
      if (!ocrResult.words_result || ocrResult.words_result.length === 0) {
        return {
          name: '',
          dosage: '',
          frequency: '',
          rawText: '',
        };
      }

      // 合并所有识别的文字
      const allText = ocrResult.words_result
        .map(item => item.words)
        .join('\n');

      // 提取药品名称（通常在开头，包含"片"、"胶囊"、"颗粒"等）
      const namePatterns = [
        /([\u4e00-\u9fa5]+(?:片|胶囊|颗粒|丸|散|液|膏|贴|栓|注射剂|注射液))/,
        /([\u4e00-\u9fa5]{2,10}(?:片|胶囊|颗粒))/,
        /([\u4e00-\u9fa5]{3,15})/,
      ];

      let medicineName = '';
      for (const pattern of namePatterns) {
        const match = allText.match(pattern);
        if (match && match[1]) {
          medicineName = match[1].trim();
          break;
        }
      }

      // 提取剂量（包含"每次"、"一次"、"1片"、"2粒"等）
      const dosagePatterns = [
        /每次\s*(\d+)\s*(?:片|粒|粒|毫升|ml|mg|g)/i,
        /一次\s*(\d+)\s*(?:片|粒|粒|毫升|ml|mg|g)/i,
        /(\d+)\s*(?:片|粒|粒|毫升|ml|mg|g)\s*\/\s*次/i,
        /(\d+)\s*(?:片|粒|粒|毫升|ml|mg|g)/,
      ];

      let dosage = '';
      for (const pattern of dosagePatterns) {
        const match = allText.match(pattern);
        if (match) {
          const unit = match[0].match(/(片|粒|毫升|ml|mg|g)/i)?.[0] || '片';
          dosage = `每次${match[1]}${unit}`;
          break;
        }
      }

      // 提取频率（包含"每日"、"每天"、"一日"、"每"等）
      const frequencyPatterns = [
        /(?:每日|每天|一日)\s*(\d+)\s*次/i,
        /每\s*(\d+)\s*小时\s*(\d+)\s*次/i,
        /(\d+)\s*次\s*\/\s*(?:日|天)/i,
        /(\d+)\s*次\s*\/\s*日/i,
      ];

      let frequency = '';
      for (const pattern of frequencyPatterns) {
        const match = allText.match(pattern);
        if (match) {
          const times = match[1] || match[2] || '2';
          frequency = `每日${times}次`;
          break;
        }
      }

      // 如果没有找到频率，尝试查找其他模式
      if (!frequency) {
        const simplePattern = /(\d+)\s*次/i;
        const match = allText.match(simplePattern);
        if (match) {
          frequency = `每日${match[1]}次`;
        } else {
          frequency = '每日2次'; // 默认值
        }
      }

      // 如果没有找到剂量，设置默认值
      if (!dosage) {
        dosage = '每次1片';
      }

      return {
        name: medicineName,
        dosage: dosage,
        frequency: frequency,
        rawText: allText,
      };
    } catch (error) {
      console.error('提取药品信息失败:', error);
      return {
        name: '',
        dosage: '',
        frequency: '',
        rawText: '',
      };
    }
  }

  /**
   * 识别药品信息（完整流程）
   * 包括OCR识别和药物数据库查询
   */
  static async recognizeMedicine(imageUri) {
    try {
      // 1. 调用OCR API识别文字
      const ocrResult = await this.recognizeText(imageUri);

      // 2. 从识别结果中提取药品信息
      const ocrMedicineInfo = this.extractMedicineInfo(ocrResult);

      // 3. 如果识别到药品名称，查询药物数据库获取详细信息
      let dbMedicineInfo = null;
      if (ocrMedicineInfo.name) {
        try {
          dbMedicineInfo = await MedicineDBService.searchMedicine(ocrMedicineInfo.name);
        } catch (error) {
          console.warn('查询药物数据库失败，仅使用OCR结果:', error);
        }
      }

      // 4. 合并OCR结果和数据库查询结果
      if (dbMedicineInfo && dbMedicineInfo.hasDetails) {
        return MedicineDBService.mergeResults(ocrMedicineInfo, dbMedicineInfo);
      }

      // 如果数据库查询失败或未启用，仅返回OCR结果
      return ocrMedicineInfo;
    } catch (error) {
      console.error('识别药品信息失败:', error);
      throw error;
    }
  }
}

