// 通用校验工具（前端/业务层使用）

export function isValidEmail(email) {
  const e = String(email || '').trim();
  // 简单但有效的邮箱格式校验（避免过度复杂）
  // - 必须包含 1 个 @
  // - 域名部分必须包含 .
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function validatePassword(password) {
  const p = String(password || '');
  if (p.length < 6) return { ok: false, message: '密码至少 6 位' };
  if (p.length > 64) return { ok: false, message: '密码过长（最多 64 位）' };
  // 可选：要求至少包含字母或数字之一（避免全空格等）
  if (!/[A-Za-z0-9]/.test(p)) return { ok: false, message: '密码需包含字母或数字' };
  return { ok: true, message: '' };
}

export function validateName(name) {
  const n = String(name || '').trim();
  if (!n) return { ok: true, message: '' }; // 昵称可选
  if (n.length > 30) return { ok: false, message: '昵称过长（最多 30 字）' };
  return { ok: true, message: '' };
}

export function isValidISODate(dateStr) {
  const s = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  // 防止 2026-13-40 这种被 Date 自动进位
  const [y, m, da] = s.split('-').map((x) => Number(x));
  return d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === da;
}

export function validateDateRange(startDate, endDate) {
  const s = String(startDate || '').trim();
  const e = String(endDate || '').trim();
  if (s && !isValidISODate(s)) return { ok: false, message: '疗程开始日期格式应为 YYYY-MM-DD' };
  if (e && !isValidISODate(e)) return { ok: false, message: '疗程结束日期格式应为 YYYY-MM-DD' };
  if (s && e && s > e) return { ok: false, message: '疗程开始日期不能晚于结束日期' };
  return { ok: true, message: '' };
}

export function parseHHMM(str) {
  const m = String(str || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function validateTimesText(timesText) {
  const raw = String(timesText || '').trim();
  if (!raw) return { ok: false, message: '请至少填写 1 个提醒时间点（如 08:00,20:00）', times: [] };
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const times = [];
  for (const p of parts) {
    const t = parseHHMM(p);
    if (!t) return { ok: false, message: `时间格式错误：${p}（应为 HH:MM）`, times: [] };
    times.push(t);
  }
  // 去重 + 排序
  const uniq = Array.from(new Set(times)).sort();
  return { ok: true, message: '', times: uniq };
}

export function validateMedicineName(name) {
  const n = String(name || '').trim();
  if (!n) return { ok: false, message: '药品名称不能为空' };
  if (n.length > 40) return { ok: false, message: '药品名称过长（最多 40 字）' };
  return { ok: true, message: '' };
}


