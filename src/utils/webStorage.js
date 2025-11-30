// Web平台存储适配器
import { Platform } from 'react-native';

let storage;

if (Platform.OS === 'web') {
  // Web平台使用localStorage
  storage = {
    getItem: async (key) => {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error('读取存储失败:', error);
        return null;
      }
    },
    setItem: async (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('保存存储失败:', error);
        return false;
      }
    },
    removeItem: async (key) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('删除存储失败:', error);
        return false;
      }
    },
  };
} else {
  // 移动端使用AsyncStorage
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
}

export default storage;

