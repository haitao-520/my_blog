// 带内存缓存的站点设置读取（避免每次 SSR 都 fetch）
let cached = null;
let cachedAt = 0;
const TTL = 60_000; // 缓存 60 秒

export async function getSiteSettings() {
  const now = Date.now();
  if (cached && now - cachedAt < TTL) return cached;

  const defaults = {
    siteTitle: '水镜雪的博客',
    siteDesc: '记录技术与生活，思考与创造。',
    authorName: '水镜雪',
    adminUrl: 'http://localhost:5173',
  };

  try {
    const apiBase = (typeof process !== 'undefined' && process.env?.API_BASE)
      || (typeof import.meta !== 'undefined' && import.meta.env?.API_BASE)
      || 'http://localhost:3000';
    const res = await fetch(`${apiBase}/api/settings`);
    if (res.ok) {
      const data = await res.json();
      cached = { ...defaults, ...data };
      cachedAt = now;
      return cached;
    }
  } catch (e) {
    // 后端不可用时用缓存或默认值
  }
  return cached || defaults;
}