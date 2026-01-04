// 云端 API 配置
// 本地开发：先运行 `npm run cloud`，默认 http://localhost:4000

export const CLOUD_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_CLOUD_API_BASE_URL || 'http://localhost:4000',
};


