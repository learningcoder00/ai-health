import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const MEDICINES_KEY = '@medicines';
const NOTIFICATION_ID_PREFIX = 'medicine_reminder_';

export class MedicineService {
  static async getAllMedicines() {
    try {
      const data = await AsyncStorage.getItem(MEDICINES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取药品列表失败:', error);
      return [];
    }
  }

  static async saveMedicine(medicine) {
    try {
      const medicines = await this.getAllMedicines();
      medicines.push(medicine);
      await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
      return medicine;
    } catch (error) {
      console.error('保存药品失败:', error);
      throw error;
    }
  }

  static async deleteMedicine(id) {
    try {
      const medicines = await this.getAllMedicines();
      const filtered = medicines.filter((m) => m.id !== id);
      await AsyncStorage.setItem(MEDICINES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('删除药品失败:', error);
      throw error;
    }
  }

  static async recognizeMedicine(imageUri) {
    // 模拟OCR识别功能
    // 实际项目中应该调用OCR API（如百度OCR、腾讯OCR等）
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟识别结果
        const mockResults = [
          {
            name: '阿司匹林肠溶片',
            dosage: '每次1片',
            frequency: '每日2次',
          },
          {
            name: '布洛芬缓释胶囊',
            dosage: '每次1粒',
            frequency: '每日3次',
          },
          {
            name: '维生素C片',
            dosage: '每次2片',
            frequency: '每日1次',
          },
        ];
        const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
        resolve(randomResult);
      }, 1500);
    });
  }

  static async scheduleReminders(medicine) {
    try {
      // 解析频率，例如 "每日2次" -> 2次/天
      const frequencyMatch = medicine.frequency.match(/(\d+)/);
      const timesPerDay = frequencyMatch ? parseInt(frequencyMatch[1]) : 2;

      // 计算每次提醒的时间（假设均匀分布）
      const hoursBetween = 24 / timesPerDay;
      const now = new Date();
      
      // 为今天和未来7天设置提醒
      for (let day = 0; day < 7; day++) {
        for (let time = 0; time < timesPerDay; time++) {
          const reminderTime = new Date(now);
          reminderTime.setDate(reminderTime.getDate() + day);
          reminderTime.setHours(8 + time * hoursBetween, 0, 0, 0); // 从早上8点开始

          // 如果时间已过，设置为明天
          if (reminderTime < now && day === 0) {
            reminderTime.setDate(reminderTime.getDate() + 1);
          }

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: '💊 服药提醒',
              body: `该服用 ${medicine.name} 了，${medicine.dosage}`,
              sound: true,
              data: { medicineId: medicine.id },
            },
            trigger: reminderTime,
          });

          // 保存通知ID以便后续取消
          await this.saveNotificationId(medicine.id, notificationId);
        }
      }
    } catch (error) {
      console.error('设置提醒失败:', error);
    }
  }

  static async cancelReminders(medicineId) {
    try {
      const notificationIds = await this.getNotificationIds(medicineId);
      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      await this.deleteNotificationIds(medicineId);
    } catch (error) {
      console.error('取消提醒失败:', error);
    }
  }

  static async saveNotificationId(medicineId, notificationId) {
    try {
      const key = `${NOTIFICATION_ID_PREFIX}${medicineId}`;
      const ids = await this.getNotificationIds(medicineId);
      ids.push(notificationId);
      await AsyncStorage.setItem(key, JSON.stringify(ids));
    } catch (error) {
      console.error('保存通知ID失败:', error);
    }
  }

  static async getNotificationIds(medicineId) {
    try {
      const key = `${NOTIFICATION_ID_PREFIX}${medicineId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  static async deleteNotificationIds(medicineId) {
    try {
      const key = `${NOTIFICATION_ID_PREFIX}${medicineId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('删除通知ID失败:', error);
    }
  }
}

