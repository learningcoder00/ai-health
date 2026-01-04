import { CURRENT_API, MEDICINE_DB_CONFIG } from '../config/medicineDB';
import { Platform } from 'react-native';
import { WEB_PROXY_CONFIG } from '../config/webProxy';
import { SecureStorage } from '../utils/secureStorage';

const MEDICINE_DB_CACHE_PREFIX = '@medicine_db_cache:';
const MEDICINE_DB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7天

// 用缓存做“离线兜底”：当外部接口不可用时，尝试用相近药名的缓存结果
const OFFLINE_FALLBACK_MAX_KEYS = 200;

function normalizeNameForMatch(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()\[\]（）【】]/g, '')
    .replace(/[·•，,。.;；:：/\\|]/g, '');
}

function simpleScore(a, b) {
  // 简单相似度：包含关系优先，其次按公共前缀长度
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return Math.min(60, i * 10);
}

/**
 * 药物数据库服务
 * 通过药品名称查询详细的药品信息（说明书、禁忌、适应症等）
 */
export class MedicineDBService {
  /**
   * 查询药品详细信息
   * @param {string} medicineName - 药品名称
   * @returns {Promise<Object>} 药品详细信息
   */
  static async searchMedicine(medicineName) {
    try {
      // 生成候选名称：提升 OCR 误差下的命中率
      const candidates = this.generateNameCandidates(medicineName);

      // 选择启用的数据源，按优先级依次尝试（自动降级）
      const sources = [
        MEDICINE_DB_CONFIG.JUHE_API,
        MEDICINE_DB_CONFIG.TIANAPI,
        MEDICINE_DB_CONFIG.WANWEI_API,
        MEDICINE_DB_CONFIG.JISU_API,
      ].filter((s) => s && s.ENABLED);

      if (sources.length === 0) {
        console.log('药物数据库API未启用，返回空结果');
        return this.getEmptyResult();
      }

      for (const name of candidates) {
        if (!name) continue;
        for (const api of sources) {
          const result = await this.searchByApi(api, name);
          if (result && result.hasDetails) {
            return result;
          }
        }
      }

      // 外部接口都失败：尝试离线兜底（从缓存里找相近名称）
      const offline = await this.tryOfflineFallback(candidates);
      if (offline && offline.hasDetails) return offline;

      return this.getEmptyResult();
    } catch (error) {
      console.error('查询药品信息失败:', error);
      return this.getEmptyResult();
    }
  }

  static async tryOfflineFallback(candidates) {
    try {
      const keys = await SecureStorage.getAllKeys();
      const cacheKeys = keys
        .filter((k) => typeof k === 'string' && k.startsWith(MEDICINE_DB_CACHE_PREFIX))
        .slice(0, OFFLINE_FALLBACK_MAX_KEYS);
      if (cacheKeys.length === 0) return null;

      const targetList = (candidates || []).map(normalizeNameForMatch).filter(Boolean);
      let best = { score: 0, key: null };
      for (const k of cacheKeys) {
        const cachedName = k.slice(MEDICINE_DB_CACHE_PREFIX.length);
        const cn = normalizeNameForMatch(cachedName);
        for (const t of targetList) {
          const s = simpleScore(cn, t);
          if (s > best.score) best = { score: s, key: k };
        }
      }

      if (!best.key || best.score < 60) return null;
      const cached = await SecureStorage.getItem(best.key);
      if (cached && cached.data && cached.data.hasDetails) {
        console.log('离线兜底命中缓存:', best.key, 'score=', best.score);
        return cached.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  static async searchByApi(api, medicineName) {
    // 根据配置的API调用不同的服务（不再依赖 CURRENT_API 单点）
    if (api === MEDICINE_DB_CONFIG.JUHE_API) {
      return await this.searchJuheAPI(medicineName, api);
    }
    if (api === MEDICINE_DB_CONFIG.TIANAPI) {
      return await this.searchTianAPI(medicineName, api);
    }
    if (api === MEDICINE_DB_CONFIG.WANWEI_API) {
      return await this.searchWanweiAPI(medicineName, api);
    }
    if (api === MEDICINE_DB_CONFIG.JISU_API) {
      return await this.searchJisuAPI(medicineName, api);
    }
    return this.getEmptyResult();
  }

  /**
   * 清理药品名称（移除剂型后缀，提取核心名称）
   */
  static cleanMedicineName(name) {
    if (!name) return '';
    
    // 移除常见的剂型后缀
    const suffixes = [
      '片', '胶囊', '颗粒', '丸', '散', '液', '膏', '贴', '栓',
      '注射剂', '注射液', '软胶囊', '肠溶片', '缓释片', '控释片',
      '咀嚼片', '泡腾片', '分散片', '薄膜衣片', '糖衣片'
    ];
    
    let cleanName = name.trim();
    for (const suffix of suffixes) {
      if (cleanName.endsWith(suffix)) {
        cleanName = cleanName.slice(0, -suffix.length);
        break;
      }
    }
    
    return cleanName.trim();
  }

  // 生成多个候选名称，用于提高查询命中率
  static generateNameCandidates(name) {
    const raw = (name || '').trim();
    if (!raw) return [];

    const cleaned = this.cleanMedicineName(raw);
    // 去掉常见符号/空白
    const normalized = raw
      .replace(/[()\[\]（）【】]/g, ' ')
      .replace(/[·•，,。.;；:：/\\|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const normalizedClean = this.cleanMedicineName(normalized);

    // 去掉“复方/滴丸/缓释/控释/肠溶”等修饰词（保守处理）
    const deDecorated = normalizedClean
      .replace(/^复方/, '')
      .replace(/(肠溶|缓释|控释|分散|泡腾|咀嚼|薄膜衣|糖衣)$/, '')
      .trim();

    const candidates = [cleaned, normalizedClean, deDecorated, raw]
      .filter(Boolean)
      .map((s) => s.trim())
      .filter(Boolean);

    // 去重，保持顺序
    const out = [];
    const seen = new Set();
    for (const c of candidates) {
      if (seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
    return out;
  }

  /**
   * 调用聚合数据药品查询API
   * 官网：https://www.juhe.cn/docs/api/id/77
   */
  static async searchJuheAPI(medicineName, api = CURRENT_API) {
    try {
      // 简单缓存：减少重复查询（对 Web/移动端都生效）
      const cacheKey = `${MEDICINE_DB_CACHE_PREFIX}${medicineName}`;
      try {
        const cached = await SecureStorage.getItem(cacheKey);
        if (cached && cached.data && cached.cachedAt && Date.now() - cached.cachedAt < MEDICINE_DB_CACHE_TTL_MS) {
          console.log('命中药品说明缓存:', medicineName);
          return cached.data;
        }
      } catch {
        // 缓存读取失败不影响主流程
      }

      // Web：走本地代理，避免 Mixed Content（https 页面请求 http）以及 CORS
      const url =
        Platform.OS === 'web'
          ? `${WEB_PROXY_CONFIG.BASE_URL}/api/medicine/juhe?drugname=${encodeURIComponent(medicineName)}`
          : `${api.BASE_URL}?key=${api.API_KEY}&drugname=${encodeURIComponent(medicineName)}`;
      
      console.log('查询聚合数据API:', url);
      const response = await fetch(url);
      const data = await response.json();

      console.log('聚合数据API返回:', data);

      // 聚合数据API返回格式：{ error_code: 0, reason: 'success', result: {...} }
      if (data.error_code === 0 && data.result) {
        const formatted = this.formatJuheResult(data.result);
        console.log('格式化后的药品信息:', formatted);
        try {
          await SecureStorage.setItem(cacheKey, { cachedAt: Date.now(), data: formatted });
        } catch {
          // ignore cache write errors
        }
        return formatted;
      }

      // 如果返回错误，记录日志
      if (data.error_code !== 0) {
        console.warn('聚合数据API返回错误:', data.reason || data.error_code, data);
      }

      return this.getEmptyResult();
    } catch (error) {
      console.error('聚合数据API调用失败:', error);
      return this.getEmptyResult();
    }
  }

  /**
   * 调用天聚数行药品说明书API
   * 官网：https://www.tianapi.com/apiview/134
   * 支持GET和POST两种方式
   */
  static async searchTianAPI(medicineName, api = CURRENT_API) {
    try {
      // 使用GET方式调用（更简单）
      const url =
        Platform.OS === 'web'
          ? `${WEB_PROXY_CONFIG.BASE_URL}/api/medicine/tianapi?word=${encodeURIComponent(medicineName)}`
          : `${api.BASE_URL}?key=${api.API_KEY}&word=${encodeURIComponent(medicineName)}`;
      
      const response = await fetch(url);
      const data = await response.json();

      // 天聚数行API返回格式：{ code: 200, msg: 'success', newslist: [...] }
      if (data.code === 200 && data.newslist && data.newslist.length > 0) {
        return this.formatTianAPIResult(data.newslist[0]);
      }

      // 如果返回错误，记录日志
      if (data.code !== 200) {
        console.warn('天聚数行API返回错误:', data.msg || data);
      }

      return this.getEmptyResult();
    } catch (error) {
      console.error('天聚数行API调用失败:', error);
      return this.getEmptyResult();
    }
  }

  /**
   * 调用万维易源药品查询API
   */
  static async searchWanweiAPI(medicineName, api = CURRENT_API) {
    try {
      const url =
        Platform.OS === 'web'
          ? `${WEB_PROXY_CONFIG.BASE_URL}/api/medicine/wanwei?name=${encodeURIComponent(medicineName)}`
          : `${api.BASE_URL}/medicine?name=${encodeURIComponent(medicineName)}`;
      
      const response =
        Platform.OS === 'web'
          ? await fetch(url)
          : await fetch(url, {
              headers: {
                Authorization: `APPCODE ${api.APP_CODE}`,
              },
            });

      const data = await response.json();

      if (data.showapi_res_code === 0 && data.showapi_res_body) {
        return this.formatWanweiResult(data.showapi_res_body);
      }

      return this.getEmptyResult();
    } catch (error) {
      console.error('万维易源API调用失败:', error);
      return this.getEmptyResult();
    }
  }

  /**
   * 调用极速数据药品查询API
   */
  static async searchJisuAPI(medicineName, api = CURRENT_API) {
    try {
      const url =
        Platform.OS === 'web'
          ? `${WEB_PROXY_CONFIG.BASE_URL}/api/medicine/jisu?name=${encodeURIComponent(medicineName)}`
          : `${api.BASE_URL}?appkey=${api.API_KEY}&name=${encodeURIComponent(medicineName)}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === '0' && data.result) {
        return this.formatJisuResult(data.result);
      }

      return this.getEmptyResult();
    } catch (error) {
      console.error('极速数据API调用失败:', error);
      return this.getEmptyResult();
    }
  }

  /**
   * 格式化聚合数据API结果
   */
  static formatJuheResult(result) {
    // 聚合数据API返回的字段可能是中文或英文，需要兼容处理
    return {
      name: result.name || result.药品名称 || result.drugname || '',
      specification: result.specification || result.规格 || result.guige || '',
      manufacturer: result.manufacturer || result.生产厂家 || result.changjia || '',
      approvalNumber: result.approvalNumber || result.批准文号 || result.pizhunwenhao || '',
      indication: result.indication || result.适应症 || result.shiyingzheng || '',
      contraindication: result.contraindication || result.禁忌 || result.jinji || '',
      usage: result.usage || result.用法用量 || result.yongfayongliang || '',
      dosage: result.dosage || result.剂量 || '',
      sideEffects: result.sideEffects || result.不良反应 || result.buliangfanying || '',
      precautions: result.precautions || result.注意事项 || result.zhuyishixiang || '',
      interactions: result.interactions || result.药物相互作用 || result.xianghuzuoyong || '',
      storage: result.storage || result.贮藏 || result.zhucang || '',
      description: result.description || result.说明书 || result.shuomingshu || result.药品说明 || '',
      hasDetails: true,
    };
  }

  /**
   * 格式化天聚数行API结果
   */
  static formatTianAPIResult(result) {
    return {
      name: result.name || result.药品名称 || '',
      specification: result.specification || result.规格 || '',
      manufacturer: result.manufacturer || result.生产厂家 || '',
      approvalNumber: result.approvalNumber || result.批准文号 || '',
      indication: result.indication || result.适应症 || '',
      contraindication: result.contraindication || result.禁忌 || '',
      usage: result.usage || result.用法用量 || '',
      dosage: result.dosage || '',
      sideEffects: result.sideEffects || result.不良反应 || '',
      precautions: result.precautions || result.注意事项 || '',
      interactions: result.interactions || result.药物相互作用 || '',
      storage: result.storage || result.贮藏 || '',
      description: result.description || result.说明书 || result.药品说明 || '',
      hasDetails: true,
    };
  }

  /**
   * 格式化万维易源API结果
   */
  static formatWanweiResult(result) {
    return {
      name: result.name || '',
      specification: result.specification || '',
      manufacturer: result.manufacturer || '',
      approvalNumber: result.approvalNumber || '',
      indication: result.indication || result.适应症 || '',
      contraindication: result.contraindication || result.禁忌症 || '',
      usage: result.usage || result.用法用量 || '',
      dosage: result.dosage || '',
      sideEffects: result.sideEffects || result.不良反应 || '',
      precautions: result.precautions || result.注意事项 || '',
      interactions: result.interactions || result.药物相互作用 || '',
      storage: result.storage || result.贮藏 || '',
      description: result.description || result.说明书 || '',
      hasDetails: true,
    };
  }

  /**
   * 格式化极速数据API结果
   */
  static formatJisuResult(result) {
    return {
      name: result.name || '',
      specification: result.specification || '',
      manufacturer: result.manufacturer || '',
      approvalNumber: result.approvalNumber || '',
      indication: result.indication || '',
      contraindication: result.contraindication || '',
      usage: result.usage || '',
      dosage: result.dosage || '',
      sideEffects: result.sideEffects || '',
      precautions: result.precautions || '',
      interactions: result.interactions || '',
      storage: result.storage || '',
      description: result.description || '',
      hasDetails: true,
    };
  }

  /**
   * 返回空结果
   */
  static getEmptyResult() {
    return {
      name: '',
      specification: '',
      manufacturer: '',
      approvalNumber: '',
      indication: '',
      contraindication: '',
      usage: '',
      dosage: '',
      sideEffects: '',
      precautions: '',
      interactions: '',
      storage: '',
      description: '',
      hasDetails: false,
    };
  }

  /**
   * 合并OCR识别结果和数据库查询结果
   * @param {Object} ocrResult - OCR识别结果
   * @param {Object} dbResult - 数据库查询结果
   * @returns {Object} 合并后的药品信息
   */
  static mergeResults(ocrResult, dbResult) {
    return {
      // OCR识别的信息（优先级高）
      name: ocrResult.name || dbResult.name,
      dosage: ocrResult.dosage || dbResult.dosage,
      frequency: ocrResult.frequency || '',
      
      // 数据库查询的详细信息
      specification: dbResult.specification,
      manufacturer: dbResult.manufacturer,
      approvalNumber: dbResult.approvalNumber,
      indication: dbResult.indication,
      contraindication: dbResult.contraindication,
      usage: dbResult.usage,
      sideEffects: dbResult.sideEffects,
      precautions: dbResult.precautions,
      interactions: dbResult.interactions,
      storage: dbResult.storage,
      description: dbResult.description,
      hasDetails: dbResult.hasDetails,
    };
  }
}

