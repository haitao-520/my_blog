<template>
  <button
    @click="handleLike"
    class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all duration-200 select-none active:scale-95"
    :class="liked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-400'"
  >
    <span class="text-lg" :class="{ 'animate-ping-once': animating }">{{ liked ? '❤️' : '🤍' }}</span>
    <span class="font-medium tabular-nums">{{ count }}</span>
  </button>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  postId: { type: String, required: true },
  initialLikes: { type: Number, default: 0 },
});

const count = ref(props.initialLikes);
const liked = ref(false);
const animating = ref(false);

function getAnonId() {
  let id = localStorage.getItem('blog_anon_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('blog_anon_id', id);
  }
  return id;
}

onMounted(() => {
  // 检查本地记录是否已赞
  const key = `blog_liked_${props.postId}`;
  liked.value = localStorage.getItem(key) === '1';
});

async function handleLike() {
  const anonId = getAnonId();
  const key = `blog_liked_${props.postId}`;

  try {
    const res = await fetch(`/api/posts/${props.postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonId }),
    });
    if (res.ok) {
      const data = await res.json();
      count.value = data.likes;
      liked.value = data.liked;
      animating.value = true;
      setTimeout(() => (animating.value = false), 400);
      // 本地记录
      if (data.liked) {
        localStorage.setItem(key, '1');
      } else {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // 静默失败
  }
}
</script>

<style scoped>
@keyframes ping-once {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}
.animate-ping-once {
  animation: ping-once 0.4s ease;
}
</style>
