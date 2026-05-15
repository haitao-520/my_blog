<template>
  <div>
    <div class="relative">
      <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      <input
        v-model="query"
        type="text"
        placeholder="输入关键词搜索文章…"
        class="w-full pl-11 pr-4 py-3.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent shadow-sm transition-all"
        autofocus
      />
    </div>

    <div v-if="loading" class="mt-6 text-center text-gray-400 text-sm">
      <span class="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2 align-middle"></span>
      搜索中…
    </div>

    <div v-if="!loading && results.length > 0" class="mt-6">
      <p class="text-sm text-gray-400 mb-4">找到 {{ pagination.total }} 篇文章</p>
      <div class="space-y-3">
        <a
          v-for="post in results"
          :key="post.id"
          :href="`/posts/${post.slug}`"
          class="group block bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-blue-100 transition-all duration-300"
        >
          <h3 class="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors mb-1">{{ post.title }}</h3>
          <p v-if="post.excerpt" class="text-gray-500 text-sm line-clamp-2 mb-2">{{ post.excerpt }}</p>
          <p class="text-xs text-gray-400">{{ formatDate(post.publishedAt) }} · ❤️ {{ post.likes ?? 0 }}</p>
        </a>
      </div>
    </div>

    <div v-if="!loading && searched && results.length === 0" class="mt-10 text-center py-16">
      <div class="text-5xl mb-3">🔎</div>
      <p class="text-gray-400">未找到匹配的文章</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

// 自适应 API 地址：SSR 时用 localhost，客户端用当前域名:3000
const API = (typeof window !== 'undefined' ? window.location.origin.replace(':4321', ':3000') : 'http://localhost:3000') + '/api/posts';

const query = ref('');
const results = ref([]);
const pagination = ref({ total: 0 });
const loading = ref(false);
const searched = ref(false);

let timer = null;

watch(query, (val) => {
  clearTimeout(timer);
  if (!val.trim()) {
    results.value = [];
    searched.value = false;
    return;
  }
  timer = setTimeout(() => search(val.trim()), 350);
});

async function search(keyword) {
  loading.value = true;
  searched.value = true;
  try {
    const qs = new URLSearchParams({ search: keyword, limit: '20' });
    const res = await fetch(`${API}?${qs}`);
    const json = await res.json();
    results.value = json.data || [];
    pagination.value = json.pagination || { total: 0 };
  } catch {
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '';
}
</script>