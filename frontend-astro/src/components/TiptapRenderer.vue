<template>
  <div class="tiptap-content">
    <EditorContent :editor="editor" />
  </div>
</template>

<script setup>
import { onMounted, shallowRef } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const props = defineProps({
  content: { type: [Object, Array, String], default: null },
});

const editor = shallowRef(null);
const lowlight = createLowlight(common);

onMounted(() => {
  // 解析 content
  let json = props.content;
  if (typeof json === 'string') {
    try { json = JSON.parse(json); } catch { json = { type: 'doc', content: [] }; }
  }
  if (!json || !json.type) {
    json = { type: 'doc', content: [] };
  }

  editor.value = new Editor({
    content: json,
    editable: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: true }),
      Image,
      Highlight,
      CodeBlockLowlight.configure({ lowlight }),
    ],
  });
});
</script>

<style>
.tiptap-content :deep(.ProseMirror) {
  outline: none;
  line-height: 1.75;
}
.tiptap-content :deep(.ProseMirror h1) { font-size: 2rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
.tiptap-content :deep(.ProseMirror h2) { font-size: 1.5rem; font-weight: 600; margin: 1.2rem 0 0.4rem; }
.tiptap-content :deep(.ProseMirror h3) { font-size: 1.2rem; font-weight: 600; margin: 1rem 0 0.3rem; }
.tiptap-content :deep(.ProseMirror p) { margin: 0.5rem 0; }
.tiptap-content :deep(.ProseMirror ul),
.tiptap-content :deep(.ProseMirror ol) { padding-left: 1.5rem; margin: 0.5rem 0; }
.tiptap-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid #e5e7eb;
  padding-left: 1rem;
  color: #6b7280;
  margin: 0.75rem 0;
}
.tiptap-content :deep(.ProseMirror pre) {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-size: 0.875rem;
  margin: 0.75rem 0;
}
.tiptap-content :deep(.ProseMirror code) {
  background: #f1f5f9;
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}
.tiptap-content :deep(.ProseMirror pre code) { background: none; padding: 0; }
.tiptap-content :deep(.ProseMirror img) { max-width: 100%; border-radius: 0.5rem; margin: 0.75rem 0; }
.tiptap-content :deep(.ProseMirror a) { color: #2563eb; text-decoration: underline; }
.tiptap-content :deep(.ProseMirror mark) { background: #fef08a; padding: 0 0.2rem; }
</style>