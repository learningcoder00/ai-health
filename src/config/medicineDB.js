// 药物数据库API配置
// 注意：以下为示例配置，实际使用时需要申请对应的API密钥

export const MEDICINE_DB_CONFIG = {
  // 方案一：聚合数据药品查询API（已配置）
  // 官网：https://www.juhe.cn/docs/api/id/77
  // 注意：该API可能处于维护状态，如不可用请切换其他API
  JUHE_API: {
    BASE_URL: 'http://apis.juhe.cn/drug/query',
    API_KEY: '4cf1a2001a4c972985cef0dbb4cd5db4', // 已配置
    ENABLED: true, // 已启用
  },

  // 方案二：天聚数行药品说明书API（备用）
  // 官网：https://www.tianapi.com/apiview/134
  // 提供近2万种中西药说明书数据
  TIANAPI: {
    BASE_URL: 'https://apis.tianapi.com/yaopin/index',
    API_KEY: 'YOUR_TIANAPI_KEY', // 需要申请，访问 https://www.tianapi.com
    ENABLED: false, // 设置为true启用
  },

  // 方案三：万维易源药品信息查询API（阿里云市场）
  // 官网：https://market.aliyun.com/products/57124001/cmapi00043217.html
  WANWEI_API: {
    BASE_URL: 'https://ali-medicine.showapi.com',
    APP_CODE: 'YOUR_APP_CODE', // 需要申请
    ENABLED: false, // 设置为true启用
  },

  // 方案四：极速数据药品信息API
  // 官网：https://www.jisuapi.com/api/medicine/
  JISU_API: {
    BASE_URL: 'https://api.jisuapi.com/drug/query',
    API_KEY: 'YOUR_JISU_API_KEY', // 需要申请
    ENABLED: false, // 设置为true启用
  },
};

// 当前使用的API配置（已配置为聚合数据API）
export const CURRENT_API = MEDICINE_DB_CONFIG.JUHE_API;

