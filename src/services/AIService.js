import { AI_CONFIG, getEnabledAIServices } from '../config/ai';
import { WEB_PROXY_CONFIG } from '../config/webProxy';
import { Platform } from 'react-native';

/**
 * AI服务类
 * 提供健康分析、用药建议等AI功能
 * 使用硅基流动 SiliconFlow API
 */
export class AIService {
  /**
   * 调用硅基流动 API（兼容OpenAI格式）
   */
  static async callSiliconFlow(messages, config = AI_CONFIG.SILICONFLOW) {
    try {
      const url = Platform.OS === 'web'
        ? `${WEB_PROXY_CONFIG.BASE_URL}/api/ai/siliconflow`
        : `${config.BASE_URL}/chat/completions`;

      const body = {
        model: config.MODEL,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: config.MAX_TOKENS,
        temperature: 0.7,
      };

      const headers = {
        'Content-Type': 'application/json',
      };

      // Web端通过代理，移动端直接调用
      if (Platform.OS === 'web') {
        body.apiKey = config.API_KEY;
      } else {
        headers['Authorization'] = `Bearer ${config.API_KEY}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'AI调用失败');
      }

      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      }

      throw new Error('AI返回格式异常');
    } catch (error) {
      console.error('硅基流动调用失败:', error);
      throw error;
    }
  }

  /**
   * 通用AI调用方法
   */
  static async callAI(messages, options = {}) {
    const enabledServices = getEnabledAIServices();
    
    if (enabledServices.length === 0) {
      throw new Error('未配置AI服务，请在config/ai.js中配置API密钥');
    }

    // 调用硅基流动
    const service = enabledServices[0];
    if (service === AI_CONFIG.SILICONFLOW) {
      return await this.callSiliconFlow(messages, service);
    }

    throw new Error('AI服务调用失败，请检查网络连接和API配置');
  }

  /**
   * 生成健康分析报告
   */
  static async generateHealthAnalysis(healthData) {
    const prompt = `你是一位专业的健康管理专家。请根据以下健康数据，生成一份详细的健康分析报告：

健康数据：
- 平均心率：${healthData.avgHeartRate} bpm
- 平均血糖：${healthData.avgBloodGlucose} mmol/L
- 平均睡眠：${healthData.avgSleep} 小时
- 健康评分：${healthData.healthScore}/100
- 管理药品数：${healthData.medicineCount}

请从以下方面进行分析：
1. 整体健康状况评估
2. 各项指标是否正常
3. 潜在的健康风险
4. 具体的改善建议
5. 生活方式建议

请用中文回答，语言要专业但易懂，建议要具体可操作。`;

    const messages = [
      {
        role: 'system',
        content: '你是一位专业的健康管理专家，擅长分析健康数据并提供个性化的健康建议。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    return await this.callAI(messages);
  }

  /**
   * 生成用药建议
   */
  static async generateMedicineAdvice(medicineInfo, adherenceStats) {
    const prompt = `你是一位专业的临床药师。请根据以下药品信息和服药依从性数据，提供专业的用药建议：

药品信息：
- 药品名称：${medicineInfo.name}
- 服用剂量：${medicineInfo.dosage}
- 服用频率：${medicineInfo.frequency}
${medicineInfo.indication ? `- 适应症：${medicineInfo.indication}` : ''}
${medicineInfo.contraindication ? `- 禁忌：${medicineInfo.contraindication}` : ''}

服药依从性：
- 计划次数：${adherenceStats.scheduled}
- 已服次数：${adherenceStats.taken}
- 漏服次数：${adherenceStats.missed}
- 依从率：${Math.round(adherenceStats.adherenceRate * 100)}%

请从以下方面提供建议：
1. 服药依从性评估
2. 漏服的影响和应对措施
3. 用药注意事项
4. 与其他药品可能的相互作用（如果有）
5. 改善依从性的具体建议

请用中文回答，语言要专业但易懂，建议要具体可操作。`;

    const messages = [
      {
        role: 'system',
        content: '你是一位专业的临床药师，擅长提供用药指导和依从性建议。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    return await this.callAI(messages);
  }

  /**
   * 检测药物相互作用
   */
  static async checkDrugInteractions(medicines) {
    const medicineList = medicines.map(m => `- ${m.name}（${m.dosage}，${m.frequency}）`).join('\n');

    const prompt = `你是一位专业的临床药师。请分析以下药品组合是否存在药物相互作用：

药品列表：
${medicineList}

请检查：
1. 是否存在已知的药物相互作用
2. 相互作用的严重程度
3. 可能的不良反应
4. 建议的处理措施

如果不存在明显的相互作用，请说明。请用中文回答，语言要专业但易懂。`;

    const messages = [
      {
        role: 'system',
        content: '你是一位专业的临床药师，擅长分析药物相互作用。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    return await this.callAI(messages);
  }

  /**
   * 生成个性化健康建议
   */
  static async generatePersonalizedAdvice(userData) {
    const prompt = `你是一位专业的健康管理专家。请根据用户的健康数据，生成个性化的健康建议：

用户健康数据：
- 心率数据：${JSON.stringify(userData.heartRate || [])}
- 血糖数据：${JSON.stringify(userData.bloodGlucose || [])}
- 睡眠数据：${JSON.stringify(userData.sleep || [])}
- 管理药品：${JSON.stringify(userData.medicines || [])}
- 服药依从性：${JSON.stringify(userData.adherence || {})}

请提供：
1. 基于数据的健康趋势分析
2. 个性化的生活方式建议
3. 饮食建议
4. 运动建议
5. 用药管理建议

请用中文回答，建议要具体、可操作、个性化。`;

    const messages = [
      {
        role: 'system',
        content: '你是一位专业的健康管理专家，擅长根据个人健康数据提供个性化的健康建议。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    return await this.callAI(messages);
  }

  /**
   * AI健康问答
   */
  static async healthQnA(question, context = {}) {
    const contextInfo = context.medicines
      ? `当前管理的药品：${context.medicines.map(m => m.name).join('、')}`
      : '';

    const prompt = `你是一位专业的健康管理助手。用户提问：${question}

${contextInfo ? `上下文信息：${contextInfo}` : ''}

请用专业但易懂的中文回答，如果涉及用药，请提醒用户咨询医生。`;

    const messages = [
      {
        role: 'system',
        content: '你是一位专业的健康管理助手，擅长回答健康相关问题，但会提醒用户重要问题需咨询医生。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    return await this.callAI(messages);
  }

  /**
   * 生成“药品说明（摘要）”：适应症/用法用量/禁忌/注意事项/不良反应/相互作用/贮藏
   * - 用于第三方说明书接口缺失时的兜底
   * - 输出尽量结构化，方便 UI 展示
   */
  static async generateMedicineGuide({ name, dosage, frequency, ocrRawText } = {}) {
    const medicineName = String(name || '').trim();
    if (!medicineName) throw new Error('缺少药品名称');

    const prompt = `请你作为“临床药师”，为药品《${medicineName}》生成一份【简明说明（摘要）】。

已知信息（可能不完整）：
- 识别到的剂量：${dosage || '未知'}
- 识别到的频率：${frequency || '未知'}
- 包装/说明书 OCR 原文（可能有噪声）：${ocrRawText ? `\n"""${String(ocrRawText).slice(0, 2000)}"""\n` : '无'}

要求：
1) 只输出 JSON（不要 markdown，不要多余解释），字段固定为：
{
  "indication": "...",           // 适应症/用于治疗什么
  "usage": "...",                // 用法用量（结合已知剂量/频率，如不确定要说明“不确定”并建议遵医嘱/说明书）
  "contraindication": "...",     // 禁忌
  "precautions": "...",          // 注意事项（重点：孕哺、肝肾功能、儿童、驾驶、酒精、常见警示）
  "sideEffects": "...",          // 常见不良反应
  "interactions": "...",         // 常见相互作用提示
  "storage": "..."               // 贮藏
}
2) 内容使用中文，尽量客观；不确定的地方要明确“不确定/需核对说明书或咨询医生/药师”。
3) 不要编造具体禁忌/剂量细节；如果无法判断就写“需核对说明书/遵医嘱”。`;

    const messages = [
      { role: 'system', content: '你是一位严谨的临床药师，避免编造，不确定时明确说明需要核对说明书或咨询医生/药师。' },
      { role: 'user', content: prompt },
    ];

    const text = await this.callAI(messages);
    try {
      const json = JSON.parse(text);
      return {
        indication: String(json.indication || '').trim(),
        usage: String(json.usage || '').trim(),
        contraindication: String(json.contraindication || '').trim(),
        precautions: String(json.precautions || '').trim(),
        sideEffects: String(json.sideEffects || '').trim(),
        interactions: String(json.interactions || '').trim(),
        storage: String(json.storage || '').trim(),
      };
    } catch {
      // 兜底：若模型未严格输出 JSON，则把原文塞到 description 里，至少给用户看到“能治什么/注意什么”的文本
      return {
        indication: '',
        usage: '',
        contraindication: '',
        precautions: '',
        sideEffects: '',
        interactions: '',
        storage: '',
        description: String(text || '').trim(),
      };
    }
  }
}
