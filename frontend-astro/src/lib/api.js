// SSR 时从环境变量读取，开发模式用 localhost
const API_BASE = (typeof process !== 'undefined' && process.env?.API_BASE)
  || (typeof import.meta !== 'undefined' && import.meta.env?.API_BASE)
  || 'http://localhost:3000/api';

export async function fetchAPI(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

export async function getPosts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return fetchAPI(`/posts?${qs}`);
}

export async function getPost(slug) {
  return fetchAPI(`/posts/${slug}`);
}

export async function getComments(postId) {
  return fetchAPI(`/comments?postId=${postId}&status=approved&limit=50`);
}

export async function getCategories() {
  return fetchAPI('/categories');
}

export async function getCategory(slug) {
  return fetchAPI(`/categories/${slug}`);
}

export async function getTags() {
  return fetchAPI('/tags');
}

export async function getTag(slug) {
  return fetchAPI(`/tags/${slug}`);
}

export async function searchPosts(keyword, page = 1) {
  return getPosts({ search: keyword, page, limit: 10 });
}