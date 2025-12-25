// 百度OCR API配置
export const BAIDU_OCR_CONFIG = {
  // 从百度AI开放平台获取的凭证
  API_KEY: 'H77sTCVo3A1wSlCHfoZXYdQw',
  SECRET_KEY: 'HiYR64LBAi3DnbcQ7J906PwFe2uHPlNP',
  APP_ID: '7363263',
  
  // API端点
  TOKEN_URL: 'https://aip.baidubce.com/oauth/2.0/token',
  OCR_URL: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic',
  
  // Token缓存键
  TOKEN_CACHE_KEY: '@baidu_ocr_token',
  TOKEN_EXPIRE_TIME: 2592000, // 30天（秒）
};

