const API_BASE = '/api';

// ===== 全局强制登出回调 =====
let onForceLogout = null;
export function setForceLogoutHandler(handler) {
  onForceLogout = handler;
}

function getToken() {
  try {
    const u = JSON.parse(localStorage.getItem('blog_admin_user') || '{}');
    return u.token || '';
  } catch { return ''; }
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    // token 失效：全局强制踢出
    if (res.status === 401 && (data.error?.includes('密码已变更') || data.error?.includes('请重新登录'))) {
      if (onForceLogout) onForceLogout();
    }
    throw new Error(data.error || `${res.status}`);
  }
  return data;
}

// Auth
export const authAPI = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
};

// Posts
export const postsAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts?${qs}`);
  },
  get: (slug) => request(`/posts/${slug}`),
  create: (data) => request('/posts', { method: 'POST', body: data }),
  update: (id, data) => request(`/posts/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
};

// Categories
export const categoriesAPI = {
  list: () => request('/categories'),
  create: (data) => request('/categories', { method: 'POST', body: data }),
  update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
};

// Tags
export const tagsAPI = {
  list: () => request('/tags'),
  create: (data) => request('/tags', { method: 'POST', body: data }),
  update: (id, data) => request(`/tags/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
};

// Media
export const mediaAPI = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/media?${qs}`);
  },
  upload: (file, alt) => {
    const fd = new FormData();
    fd.append('file', file);
    if (alt) fd.append('alt', alt);
    return request('/media', { method: 'POST', body: fd });
  },
  remove: (id) => request(`/media/${id}`, { method: 'DELETE' }),
};

// Comments
export const commentsAPI = {
  list: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/comments?${qs}`);
  },
  update: (id, data) => request(`/comments/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
};

// Stats
export const statsAPI = {
  get: () => request('/stats'),
};