<template>
  <div class="mt-12 border-t pt-8">
    <h3 class="text-lg font-bold mb-6">💬 评论（{{ comments.length }}）</h3>

    <!-- 已审核评论列表 -->
    <div v-if="comments.length > 0" class="space-y-4 mb-8">
      <div
        v-for="c in comments"
        :key="c.id"
        class="bg-gray-50 rounded-lg p-4 text-sm"
      >
        <div class="flex items-center gap-2 mb-1.5">
          <span class="font-medium text-gray-800">{{ c.authorName }}</span>
          <span class="text-xs text-gray-400">{{ formatDate(c.createdAt) }}</span>
        </div>
        <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">{{ c.content }}</p>
      </div>
    </div>
    <p v-else class="text-sm text-gray-400 mb-8">暂无评论，来说两句吧</p>

    <!-- 提交表单 -->
    <div v-if="submitted" class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
      ✅ 评论已提交，审核后将显示
    </div>

    <div v-else class="bg-white border rounded-lg p-5">
      <h4 class="text-sm font-medium mb-4">发表评论</h4>
      <form @submit.prevent="handleSubmit" class="space-y-3">
        <div class="flex gap-3 flex-col sm:flex-row">
          <input
            v-model="form.authorName"
            type="text"
            placeholder="昵称 *"
            required
            class="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            v-model="form.email"
            type="email"
            placeholder="邮箱（不会公开）"
            class="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <textarea
          v-model="form.content"
          placeholder="写下你的想法… *"
          rows="3"
          required
          class="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
        ></textarea>
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-400">评论需审核后方可显示</span>
          <button
            type="submit"
            :disabled="submitting"
            class="px-5 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <span v-if="submitting" class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ submitting ? '提交中…' : '提交评论' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  postId: { type: String, required: true },
  comments: { type: Array, default: () => [] },
});

const comments = ref(props.comments || []);
const submitted = ref(false);
const submitting = ref(false);
const form = ref({ authorName: '', email: '', content: '' });

const API = (typeof window !== 'undefined' ? window.location.origin.replace(':4321', ':3000') : 'http://localhost:3000') + '/api';

onMounted(async () => {
  try {
    const res = await fetch(`${API}/comments?postId=${props.postId}&status=approved&limit=50`);
    const data = await res.json();
    comments.value = data.data || [];
  } catch (e) {
    console.error('加载评论失败', e);
  }
});

async function handleSubmit() {
  if (submitting.value) return;
  if (!form.value.authorName.trim() || !form.value.content.trim()) return;
  submitting.value = true;
  try {
    const res = await fetch(`${API}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId: props.postId,
        authorName: form.value.authorName.trim(),
        email: form.value.email.trim(),
        content: form.value.content.trim(),
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error || `${res.status}`);
    submitted.value = true;
  } catch (e) {
    alert('提交失败: ' + e.message);
  } finally {
    submitting.value = false;
  }
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>