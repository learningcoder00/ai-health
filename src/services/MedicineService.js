import * as Notifications from 'expo-notifications';
import { OCRService } from './OCRService';
import { SecureStorage } from '../utils/secureStorage';
import { Platform } from 'react-native';

const MEDICINES_KEY = '@medicines';
const NOTIFICATION_ID_PREFIX = 'medicine_reminder_';
const REMINDERS_KEY = '@medicine_reminders'; // { [medicineId]: Reminder[] }
const INTAKE_LOGS_KEY = '@medicine_intake_logs'; // IntakeLog[]

// 通知分类与动作（用于“已服/稍后”闭环）
export const MEDICINE_REMINDER_CATEGORY = 'MEDICINE_REMINDER';
export const MEDICINE_ACTION_TAKEN = 'MEDICINE_ACTION_TAKEN';
export const MEDICINE_ACTION_SNOOZE_5M = 'MEDICINE_ACTION_SNOOZE_5M';
export const MEDICINE_ACTION_SNOOZE_15M = 'MEDICINE_ACTION_SNOOZE_15M';
export const MEDICINE_ACTION_SNOOZE_30M = 'MEDICINE_ACTION_SNOOZE_30M';

const OVERDUE_GRACE_MINUTES = 60;
const DEFAULT_WINDOW_START = '08:00';
const DEFAULT_WINDOW_END = '20:00';
const SCHEDULE_HORIZON_DAYS = 30;

function parseHHMM(str) {
  const m = String(str || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm, minutes: hh * 60 + mm };
}

function toISODate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function makeDateAt(isoDate, minutes) {
  const [y, m, d] = isoDate.split('-').map((n) => Number(n));
  const dt = new Date();
  dt.setFullYear(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  dt.setMinutes(minutes);
  return dt;
}

function normalizeReminderConfig(medicine) {
  const cfg = medicine?.reminderConfig || {};
  const enabled = cfg.enabled !== false;
  const paused = cfg.paused === true;
  const startDate = cfg.startDate || toISODate(new Date());
  const endDate = cfg.endDate || null; // YYYY-MM-DD
  const windowStart = cfg.windowStart || DEFAULT_WINDOW_START;
  const windowEnd = cfg.windowEnd || DEFAULT_WINDOW_END;
  const times = Array.isArray(cfg.times) ? cfg.times : null; // ["08:00","14:00"]
  return { enabled, paused, startDate, endDate, windowStart, windowEnd, times };
}

function isValidISODate(dateStr) {
  const s = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, da] = s.split('-').map((x) => Number(x));
  return d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === da;
}

function validateReminderConfigPatch(patch) {
  if (!patch || typeof patch !== 'object') return;
  if (patch.startDate && !isValidISODate(patch.startDate)) {
    throw new Error('疗程开始日期格式应为 YYYY-MM-DD');
  }
  if (patch.endDate && !isValidISODate(patch.endDate)) {
    throw new Error('疗程结束日期格式应为 YYYY-MM-DD');
  }
  if (patch.startDate && patch.endDate && String(patch.startDate) > String(patch.endDate)) {
    throw new Error('疗程开始日期不能晚于结束日期');
  }
  if (patch.times) {
    if (!Array.isArray(patch.times) || patch.times.length === 0) {
      throw new Error('请至少提供 1 个提醒时间点');
    }
    for (const t of patch.times) {
      if (!parseHHMM(t)) {
        throw new Error(`时间格式错误：${t}（应为 HH:MM）`);
      }
    }
  }
}

function deriveTimesFromFrequency(medicine, windowStart, windowEnd) {
  const frequencyMatch = String(medicine?.frequency || '').match(/(\d+)/);
  const timesPerDay = frequencyMatch ? parseInt(frequencyMatch[1]) : 2;
  const ws = parseHHMM(windowStart) || parseHHMM(DEFAULT_WINDOW_START);
  const we = parseHHMM(windowEnd) || parseHHMM(DEFAULT_WINDOW_END);
  const startMin = ws.minutes;
  const endMin = we.minutes;
  if (timesPerDay <= 1) return [startMin];
  if (endMin <= startMin) return [startMin];
  const span = endMin - startMin;
  const out = [];
  for (let i = 0; i < timesPerDay; i++) {
    const t = startMin + Math.round((span * i) / (timesPerDay - 1));
    out.push(t);
  }
  return out;
}

function getDailyTimesMinutes(medicine, cfg) {
  if (cfg.times && cfg.times.length > 0) {
    const mins = cfg.times
      .map(parseHHMM)
      .filter(Boolean)
      .map((x) => x.minutes)
      .sort((a, b) => a - b);
    if (mins.length > 0) return mins;
  }
  return deriveTimesFromFrequency(medicine, cfg.windowStart, cfg.windowEnd);
}

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
      const cfg = normalizeReminderConfig(medicine);
      if (!cfg.enabled || cfg.paused) return;

      const now = new Date();
      const today = toISODate(now);
      const start = cfg.startDate > today ? cfg.startDate : today;
      const end = cfg.endDate && cfg.endDate < addDays(start, SCHEDULE_HORIZON_DAYS).toISOString().slice(0, 10)
        ? cfg.endDate
        : addDays(start, SCHEDULE_HORIZON_DAYS).toISOString().slice(0, 10);

      const dailyTimes = getDailyTimesMinutes(medicine, cfg);

      // 读取已有提醒（以防未清理干净），并准备写回
      const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
      const currentList = Array.isArray(remindersByMedicine[medicine.id])
        ? remindersByMedicine[medicine.id]
        : [];
      
      // 为未来一段时间创建提醒（支持疗程 endDate）
      for (let day = 0; ; day++) {
        const date = addDays(start, day);
        const isoDate = toISODate(date);
        if (isoDate > end) break;
        for (const minutes of dailyTimes) {
          const reminderTime = makeDateAt(isoDate, minutes);
          if (reminderTime < now) continue;

          const reminderId = `${medicine.id}_${reminderTime.toISOString()}`;
          let notificationId = null;

          if (Platform.OS !== 'web') {
            notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: '💊 服药提醒',
                body: `该服用 ${medicine.name} 了，${medicine.dosage}`,
                sound: true,
                categoryIdentifier: MEDICINE_REMINDER_CATEGORY,
                data: {
                  medicineId: medicine.id,
                  reminderId,
                  scheduledAt: reminderTime.toISOString(),
                  screen: '药品',
                },
              },
              trigger: reminderTime,
            });
          }

          if (notificationId) await this.saveNotificationId(medicine.id, notificationId);

          currentList.push({
            id: reminderId,
            medicineId: medicine.id,
            scheduledAt: reminderTime.toISOString(),
            notificationId,
            status: 'scheduled', // scheduled | taken | missed | snoozed | paused
            createdAt: new Date().toISOString(),
            snoozeCount: 0,
          });
        }
      }

      // 去重（防止重复写入）
      const deduped = [];
      const seen = new Set();
      for (const r of currentList) {
        if (!r || !r.id) continue;
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        deduped.push(r);
      }
      remindersByMedicine[medicine.id] = deduped;
      await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);
    } catch (error) {
      console.error('设置提醒失败:', error);
    }
  }

  static async updateReminderConfig(medicineId, configPatch) {
    validateReminderConfigPatch(configPatch);
    const medicines = await this.getAllMedicines();
    const idx = medicines.findIndex((m) => m.id === medicineId);
    if (idx === -1) throw new Error('药品不存在');
    const current = medicines[idx];
    const next = {
      ...current,
      reminderConfig: {
        ...(current.reminderConfig || {}),
        ...(configPatch || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    medicines[idx] = next;
    await SecureStorage.setItem(MEDICINES_KEY, medicines);

    // 先取消系统通知（不删除日志）
    await this.cancelScheduledNotificationsOnly(medicineId);

    const cfg = normalizeReminderConfig(next);
    if (cfg.enabled && !cfg.paused) {
      // 重建未来提醒：先清空提醒条目，再重新生成
      const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
      remindersByMedicine[medicineId] = [];
      await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);
      await this.scheduleReminders(next);
    } else {
      // 标记未来提醒为 paused（保留历史）
      const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
      const list = Array.isArray(remindersByMedicine[medicineId]) ? remindersByMedicine[medicineId] : [];
      const now = Date.now();
      remindersByMedicine[medicineId] = list.map((r) => {
        const t = new Date(r.scheduledAt).getTime();
        if (t > now && (r.status === 'scheduled' || r.status === 'snoozed')) {
          return { ...r, status: 'paused', notificationId: null, updatedAt: new Date().toISOString() };
        }
        return r;
      });
      await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);
    }

    return next;
  }

  static async cancelScheduledNotificationsOnly(medicineId) {
    if (Platform.OS === 'web') return;
    try {
      const notificationIds = await this.getNotificationIds(medicineId);
      for (const id of notificationIds) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          // ignore
        }
      }
      await this.deleteNotificationIds(medicineId);
    } catch {
      // ignore
    }
  }

  static async cancelReminders(medicineId) {
    try {
      // 先取消所有已安排的系统通知
      const notificationIds = await this.getNotificationIds(medicineId);
      for (const id of notificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      await this.deleteNotificationIds(medicineId);

      // 删除提醒条目（保留历史打卡日志）
      const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
      delete remindersByMedicine[medicineId];
      await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);
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

  // ====== 用药提醒闭环：查询/打卡/漏服/稍后 ======

  static async getRemindersForMedicine(medicineId) {
    const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
    const list = remindersByMedicine[medicineId];
    return Array.isArray(list) ? list : [];
  }

  static async getTodayReminders(medicineId) {
    await this.updateOverdueReminders(medicineId);
    const list = await this.getRemindersForMedicine(medicineId);
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return list
      .filter((r) => {
        const t = new Date(r.scheduledAt);
        return t >= start && t <= end;
      })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }

  static async markReminderTaken({ medicineId, reminderId, source = 'app' }) {
    const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
    const list = Array.isArray(remindersByMedicine[medicineId]) ? remindersByMedicine[medicineId] : [];
    const idx = list.findIndex((r) => r.id === reminderId);
    if (idx === -1) return false;

    const reminder = list[idx];
    // 取消对应通知（如果还在计划中）
    if (reminder.notificationId && Platform.OS !== 'web') {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch {
        // ignore
      }
    }

    list[idx] = {
      ...reminder,
      status: 'taken',
      takenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      takenSource: source,
    };
    remindersByMedicine[medicineId] = list;
    await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);
    await this.appendIntakeLog({
      medicineId,
      reminderId,
      action: 'taken',
      at: new Date().toISOString(),
      scheduledAt: reminder.scheduledAt,
      source,
    });
    return true;
  }

  static async snoozeReminderMinutes({ medicineId, reminderId, minutes = 10, source = 'app' }) {
    if (Platform.OS === 'web') return false;

    const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
    const list = Array.isArray(remindersByMedicine[medicineId]) ? remindersByMedicine[medicineId] : [];
    const idx = list.findIndex((r) => r.id === reminderId);
    if (idx === -1) return false;

    const reminder = list[idx];
    const newTime = new Date(Date.now() + minutes * 60 * 1000);

    // 取消旧通知
    if (reminder.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch {
        // ignore
      }
    }

    // 获取药品信息用于通知内容
    const medicines = await this.getAllMedicines();
    const med = medicines.find((m) => m.id === medicineId);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `💊 服药提醒（稍后${minutes}分钟）`,
        body: med ? `该服用 ${med.name} 了，${med.dosage}` : '该服药了',
        sound: true,
        categoryIdentifier: MEDICINE_REMINDER_CATEGORY,
        data: {
          medicineId,
          reminderId,
          scheduledAt: newTime.toISOString(),
          screen: '药品',
        },
      },
      trigger: newTime,
    });

    list[idx] = {
      ...reminder,
      status: 'snoozed',
      scheduledAt: newTime.toISOString(),
      notificationId,
      snoozeCount: (reminder.snoozeCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    remindersByMedicine[medicineId] = list;
    await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);

    // 通知ID列表也追加，便于 cancelReminders 兜底
    await this.saveNotificationId(medicineId, notificationId);

    await this.appendIntakeLog({
      medicineId,
      reminderId,
      action: 'snoozed',
      at: new Date().toISOString(),
      scheduledAt: newTime.toISOString(),
      source,
      snoozeMinutes: minutes,
    });
    return true;
  }

  static async updateOverdueReminders(medicineId) {
    const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
    const list = Array.isArray(remindersByMedicine[medicineId]) ? remindersByMedicine[medicineId] : [];
    if (list.length === 0) return;

    const now = Date.now();
    const graceMs = OVERDUE_GRACE_MINUTES * 60 * 1000;
    let changed = false;

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || !r.scheduledAt) continue;
      if (r.status === 'taken' || r.status === 'missed') continue;
      const t = new Date(r.scheduledAt).getTime();
      if (t + graceMs < now) {
        list[i] = { ...r, status: 'missed', missedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        changed = true;
        await this.appendIntakeLog({
          medicineId,
          reminderId: r.id,
          action: 'missed',
          at: new Date().toISOString(),
          scheduledAt: r.scheduledAt,
          source: 'system',
        });
      }
    }

    if (changed) {
      remindersByMedicine[medicineId] = list;
      await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);
    }
  }

  static async appendIntakeLog(entry) {
    try {
      const logs = (await SecureStorage.getItem(INTAKE_LOGS_KEY)) || [];
      const arr = Array.isArray(logs) ? logs : [];
      arr.push({
        id: `${entry.medicineId}_${entry.reminderId}_${entry.action}_${entry.at}`,
        ...entry,
      });
      // 只保留最近 2000 条，防止无限增长
      const trimmed = arr.length > 2000 ? arr.slice(arr.length - 2000) : arr;
      await SecureStorage.setItem(INTAKE_LOGS_KEY, trimmed);
    } catch (e) {
      console.warn('写入服药日志失败:', e);
    }
  }

  // 给通知监听用：根据 action 写入闭环
  static async handleNotificationAction({ medicineId, reminderId, actionIdentifier }) {
    if (!medicineId || !reminderId) return;
    if (actionIdentifier === MEDICINE_ACTION_TAKEN) {
      await this.markReminderTaken({ medicineId, reminderId, source: 'notification' });
    } else if (actionIdentifier === MEDICINE_ACTION_SNOOZE_5M) {
      await this.snoozeReminderMinutes({ medicineId, reminderId, minutes: 5, source: 'notification' });
    } else if (actionIdentifier === MEDICINE_ACTION_SNOOZE_15M) {
      await this.snoozeReminderMinutes({ medicineId, reminderId, minutes: 15, source: 'notification' });
    } else if (actionIdentifier === MEDICINE_ACTION_SNOOZE_30M) {
      await this.snoozeReminderMinutes({ medicineId, reminderId, minutes: 30, source: 'notification' });
    }
  }

  static async getIntakeLogs(medicineId = null) {
    const logs = (await SecureStorage.getItem(INTAKE_LOGS_KEY)) || [];
    const arr = Array.isArray(logs) ? logs : [];
    return medicineId ? arr.filter((l) => l.medicineId === medicineId) : arr;
  }

  static async getAdherenceStats(medicineId, days = 7) {
    // 更新漏服（覆盖范围内）
    await this.updateOverdueRemindersRange(medicineId, days);
    const list = await this.getRemindersForMedicine(medicineId);
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const inRange = list.filter((r) => {
      const t = new Date(r.scheduledAt);
      return t >= start && t <= end;
    });

    const scheduledCount = inRange.length;
    const takenCount = inRange.filter((r) => r.status === 'taken').length;
    const missedCount = inRange.filter((r) => r.status === 'missed').length;
    const snoozedCount = inRange.filter((r) => r.status === 'snoozed').length;

    // daily series
    const daily = [];
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      const iso = toISODate(d);
      const dayItems = inRange.filter((r) => r.scheduledAt.slice(0, 10) === iso);
      daily.push({
        date: iso,
        scheduled: dayItems.length,
        taken: dayItems.filter((r) => r.status === 'taken').length,
        missed: dayItems.filter((r) => r.status === 'missed').length,
      });
    }

    return {
      days,
      scheduled: scheduledCount,
      taken: takenCount,
      missed: missedCount,
      snoozed: snoozedCount,
      adherenceRate: scheduledCount ? Number((takenCount / scheduledCount).toFixed(3)) : 0,
      daily,
    };
  }

  static async updateOverdueRemindersRange(medicineId, days = 30) {
    const remindersByMedicine = (await SecureStorage.getItem(REMINDERS_KEY)) || {};
    const list = Array.isArray(remindersByMedicine[medicineId]) ? remindersByMedicine[medicineId] : [];
    if (list.length === 0) return;

    const now = Date.now();
    const graceMs = OVERDUE_GRACE_MINUTES * 60 * 1000;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    let changed = false;

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r || !r.scheduledAt) continue;
      const t = new Date(r.scheduledAt).getTime();
      if (t < startMs) continue;
      if (r.status === 'taken' || r.status === 'missed') continue;
      if (t + graceMs < now) {
        list[i] = { ...r, status: 'missed', missedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        changed = true;
        await this.appendIntakeLog({
          medicineId,
          reminderId: r.id,
          action: 'missed',
          at: new Date().toISOString(),
          scheduledAt: r.scheduledAt,
          source: 'system',
        });
      }
    }

    if (changed) {
      remindersByMedicine[medicineId] = list;
      await SecureStorage.setItem(REMINDERS_KEY, remindersByMedicine);
    }
  }
}

