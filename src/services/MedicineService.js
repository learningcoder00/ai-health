import * as Notifications from 'expo-notifications';
import { OCRService } from './OCRService';
import { SecureStorage } from '../utils/secureStorage';

const MEDICINES_KEY = '@medicines';
const NOTIFICATION_ID_PREFIX = 'medicine_reminder_';

export class MedicineService {
  static async getAllMedicines() {
    try {
      const data = await SecureStorage.getItem(MEDICINES_KEY);
      return data || [];
    } catch (error) {
      console.error('获取药品列表失败:', error);
      return [];
    }
  }

  static async saveMedicine(medicine) {
    try {
      const medicines = await this.getAllMedicines();
      medicines.push(medicine);
      await SecureStorage.setItem(MEDICINES_KEY, medicines);
      return medicine;
    } catch (error) {
      console.error('保存药品失败:', error);
      throw error;
    }
  }

  static async updateMedicine(id, updatedMedicine) {
    try {
      const medicines = await this.getAllMedicines();
      const index = medicines.findIndex((m) => m.id === id);
      
      if (index === -1) {
        throw new Error('药品不存在');
      }

      // 保留原有ID和创建时间
      const existingMedicine = medicines[index];
      const updated = {
        ...updatedMedicine,
        id: existingMedicine.id,
        createdAt: existingMedicine.createdAt,
        updatedAt: new Date().toISOString(),
      };

      medicines[index] = updated;
      await SecureStorage.setItem(MEDICINES_KEY, medicines);

      // 取消旧提醒并设置新提醒
      await this.cancelReminders(id);
      await this.scheduleReminders(updated);

      return updated;
    } catch (error) {
      console.error('更新药品失败:', error);
      throw error;
    }
  }

  static async deleteMedicine(id) {
    try {
      const medicines = await this.getAllMedicines();
      const filtered = medicines.filter((m) => m.id !== id);
      await SecureStorage.setItem(MEDICINES_KEY, filtered);
    } catch (error) {
      console.error('删除药品失败:', error);
      throw error;
    }
  }

  static async recognizeMedicine(imageUri) {
    try {
      // 调用真实的百度OCR API进行识别
      const result = await OCRService.recognizeMedicine(imageUri);
      return result;
    } catch (error) {
      console.error('药品识别失败:', error);
      // 传递更详细的错误信息
      const errorMessage = error.message || '未知错误';
      // 如果错误信息已经比较详细，直接使用；否则使用通用提示
      if (errorMessage.includes('Token') || errorMessage.includes('网络') || errorMessage.includes('连接')) {
        throw new Error(errorMessage);
      } else if (errorMessage.includes('图片处理')) {
        throw new Error(errorMessage);
      } else {
        throw new Error(`识别失败: ${errorMessage}。请检查网络连接或重试`);
      }
    }
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
      await SecureStorage.setItem(key, ids);
    } catch (error) {
      console.error('保存通知ID失败:', error);
    }
  }

  static async getNotificationIds(medicineId) {
    try {
      const key = `${NOTIFICATION_ID_PREFIX}${medicineId}`;
      const data = await SecureStorage.getItem(key);
      return data || [];
    } catch (error) {
      return [];
    }
  }

  static async deleteNotificationIds(medicineId) {
    try {
      const key = `${NOTIFICATION_ID_PREFIX}${medicineId}`;
      await SecureStorage.removeItem(key);
    } catch (error) {
      console.error('删除通知ID失败:', error);
    }
  }
}

