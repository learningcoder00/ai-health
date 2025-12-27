import { CURRENT_API, MEDICINE_DB_CONFIG } from '../config/medicineDB';

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
      // 如果API未启用，返回空结果
      if (!CURRENT_API.ENABLED) {
        console.log('药物数据库API未启用，返回空结果');
        return this.getEmptyResult();
      }

      // 清理药品名称（移除剂型等后缀，只保留核心名称）
      const cleanName = this.cleanMedicineName(medicineName);

      // 根据配置的API调用不同的服务
      if (CURRENT_API === MEDICINE_DB_CONFIG.JUHE_API) {
        return await this.searchJuheAPI(cleanName);
      } else if (CURRENT_API === MEDICINE_DB_CONFIG.TIANAPI) {
        return await this.searchTianAPI(cleanName);
      } else if (CURRENT_API === MEDICINE_DB_CONFIG.WANWEI_API) {
        return await this.searchWanweiAPI(cleanName);
      } else if (CURRENT_API === MEDICINE_DB_CONFIG.JISU_API) {
        return await this.searchJisuAPI(cleanName);
      }

      return this.getEmptyResult();
    } catch (error) {
      console.error('查询药品信息失败:', error);
      return this.getEmptyResult();
    }
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

  /**
   * 调用聚合数据药品查询API
   * 官网：https://www.juhe.cn/docs/api/id/77
   */
  static async searchJuheAPI(medicineName) {
    try {
      const url = `${CURRENT_API.BASE_URL}?key=${CURRENT_API.API_KEY}&drugname=${encodeURIComponent(medicineName)}`;
      
      console.log('查询聚合数据API:', url);
      const response = await fetch(url);
      const data = await response.json();

      console.log('聚合数据API返回:', data);

      // 聚合数据API返回格式：{ error_code: 0, reason: 'success', result: {...} }
      if (data.error_code === 0 && data.result) {
        const formatted = this.formatJuheResult(data.result);
        console.log('格式化后的药品信息:', formatted);
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
  static async searchTianAPI(medicineName) {
    try {
      // 使用GET方式调用（更简单）
      const url = `${CURRENT_API.BASE_URL}?key=${CURRENT_API.API_KEY}&word=${encodeURIComponent(medicineName)}`;
      
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
  static async searchWanweiAPI(medicineName) {
    try {
      const url = `${CURRENT_API.BASE_URL}/medicine?name=${encodeURIComponent(medicineName)}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `APPCODE ${CURRENT_API.APP_CODE}`,
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
  static async searchJisuAPI(medicineName) {
    try {
      const url = `${CURRENT_API.BASE_URL}?appkey=${CURRENT_API.API_KEY}&name=${encodeURIComponent(medicineName)}`;
      
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

