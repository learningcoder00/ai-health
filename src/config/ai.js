// AI服务配置 - 硅基流动 SiliconFlow
// 官网：https://www.siliconflow.cn/
//
// Key 来源优先级：
// 1) EXPO_PUBLIC_SILICONFLOW_API_KEY（推荐：通过 .env 或运行环境注入）
// 2) app.json -> expo.extra.SILICONFLOW_API_KEY（当无法/不方便使用 .env 时的兜底）

import appConfig from '../../app.json';

const extraKey = appConfig?.expo?.extra?.SILICONFLOW_API_KEY || '';
const envKey = process.env.EXPO_PUBLIC_SILICONFLOW_API_KEY || '';
const siliconFlowKey = envKey || extraKey;

export const AI_CONFIG = {
  SILICONFLOW: {
    BASE_URL: 'https://api.siliconflow.cn/v1',
    API_KEY: siliconFlowKey,
    MODEL: 'Qwen/Qwen2.5-7B-Instruct', // 推荐模型，也可使用其他模型如 'deepseek-ai/DeepSeek-V2.5', 'meta-llama/Llama-3.1-8B-Instruct' 等
    ENABLED: true,
    MAX_TOKENS: 1000,
  },
};

// 当前启用的AI服务
export const getEnabledAIServices = () => {
  return [AI_CONFIG.SILICONFLOW].filter(service => service.ENABLED && service.API_KEY);
};

// 默认使用的AI服务
export const DEFAULT_AI_SERVICE = getEnabledAIServices()[0] || null;
