import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { postsAPI, categoriesAPI, tagsAPI, mediaAPI } from '../lib/api';

const lowlight = createLowlight(common);

const AUTOSAVE_KEY_PREFIX = 'draft_';

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || Date.now().toString(36);
}

export default function PostEditor({ editId = null }) {
  const navigate = useNavigate();

  // 表单状态
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [status, setStatus] = useState('draft');
  const [visibility, setVisibility] = useState('public');
  const [publishedAt, setPublishedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoSaveLabel, setAutoSaveLabel] = useState('');

  // 远程数据
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaList, setMediaList] = useState([]);

  const autosaveKey = useMemo(() => editId ? `${AUTOSAVE_KEY_PREFIX}${editId}` : `${AUTOSAVE_KEY_PREFIX}new`, [editId]);

  // Tiptap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Highlight,
      Placeholder.configure({ placeholder: '开始写作…' }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3' },
    },
  });

  // 加载分类 & 标签
  useEffect(() => {
    categoriesAPI.list().then(setCategories).catch(() => {});
    tagsAPI.list().then(setAllTags).catch(() => {});
  }, []);

  // 编辑模式：加载文章
  useEffect(() => {
    if (!editId || !editor) return;
    (async () => {
      try {
        const posts = await postsAPI.list({ status: 'all', limit: '100' });
        // API 没有 getById，遍历查找
        // 实际上用 slug 查不方便，这里改为直接用 fetch /api/posts 列表找
        // 简单方案：重新获取详情
        const res = await fetch(`/api/posts/${editId}`); // editId here is actually the slug/id
      } catch {}
    })();
  }, [editId, editor]);

  // 实际加载：用 fetch 直接查
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        // 尝试用 id 作为 slug 或直接查列表
        const all = await postsAPI.list({ status: 'all', limit: '500' });
        const found = all.data?.find((p) => p.id === editId);
        if (found) {
          setTitle(found.title);
          setSlug(found.slug);
          setExcerpt(found.excerpt || '');
          setCover(found.cover || '');
          setCategoryId(found.category?.id || '');
          setStatus(found.status);
          setVisibility(found.visibility);
          setPublishedAt(found.publishedAt ? new Date(found.publishedAt).toISOString().slice(0, 16) : '');
          setSelectedTags(found.tags || []);
          // 获取完整内容
          const detail = await postsAPI.get(found.slug);
          if (editor && detail.content) {
            editor.commands.setContent(detail.content);
          }
        }
      } catch (e) {
        console.error('加载文章失败', e);
      }
    })();
  }, [editId, editor]);

  // 自动保存草稿到 localStorage（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      if (!editor) return;
      const draft = {
        title,
        slug,
        excerpt,
        cover,
        categoryId,
        selectedTags,
        status,
        visibility,
        publishedAt,
        content: editor.getJSON(),
        savedAt: Date.now(),
      };
      localStorage.setItem(autosaveKey, JSON.stringify(draft));
      setAutoSaveLabel(`已自动保存 ${new Date().toLocaleTimeString()}`);
      setTimeout(() => setAutoSaveLabel(''), 2000);
    }, 30000);
    return () => clearInterval(interval);
  }, [editor, title, slug, excerpt, cover, categoryId, selectedTags, status, visibility, publishedAt, autosaveKey]);

  // 恢复草稿
  useEffect(() => {
    if (editId || !editor) return;
    const raw = localStorage.getItem(autosaveKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (confirm('检测到未保存的草稿，是否恢复？')) {
        setTitle(draft.title || '');
        setSlug(draft.slug || '');
        setExcerpt(draft.excerpt || '');
        setCover(draft.cover || '');
        setCategoryId(draft.categoryId || '');
        setSelectedTags(draft.selectedTags || []);
        setStatus(draft.status || 'draft');
        setVisibility(draft.visibility || 'public');
        setPublishedAt(draft.publishedAt || '');
        editor.commands.setContent(draft.content);
      } else {
        localStorage.removeItem(autosaveKey);
      }
    } catch {}
  }, []);

  // Slug 自动生成
  const handleTitleChange = (val) => {
    setTitle(val);
    if (!editId || !slug) setSlug(generateSlug(val));
  };

  // 标签自动补全
  const handleTagInput = (val) => {
    setTagInput(val);
    if (val.trim()) {
      const matched = allTags.filter((t) => t.name.includes(val) && !selectedTags.find((s) => s.id === t.id));
      // 如果没有精确匹配，追加一条"创建新标签"提示
      const exactMatch = allTags.find((t) => t.name === val.trim());
      if (!exactMatch) {
        matched.push({ id: '__new__', name: val.trim(), _isNew: true });
      }
      setTagSuggestions(matched);
    } else {
      setTagSuggestions([]);
    }
  };

  const addTag = (tag) => {
    if (tag._isNew) {
      // 乐观更新：先用临时对象加入列表
      const tempTag = { id: '__new__', name: tag.name, slug: '__new__' };
      setSelectedTags((prev) => [...prev, tempTag]);
      setTagInput('');
      setTagSuggestions([]);
      // 后端创建，成功后替换临时 ID
      tagsAPI.create({ name: tag.name }).then((created) => {
        setAllTags((prev) => [...prev, created]);
        setSelectedTags((prev) => prev.map((t) => t.id === '__new__' && t.name === created.name ? created : t));
      }).catch((e) => {
        alert('创建标签失败: ' + e.message);
        setSelectedTags((prev) => prev.filter((t) => t.id !== '__new__'));
      });
    } else if (!selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
      setTagInput('');
      setTagSuggestions([]);
    }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      // 优先匹配已有标签，否则创建新的
      const existing = allTags.find((t) => t.name === tagInput.trim() && !selectedTags.find((s) => s.id === t.id));
      if (existing) {
        addTag(existing);
      } else {
        addTag({ id: '__new__', name: tagInput.trim(), _isNew: true });
      }
    }
  };
  const removeTag = (id) => setSelectedTags(selectedTags.filter((t) => t.id !== id));

  // 媒体选择
  const openMediaPicker = async () => {
    setShowMediaPicker(true);
    try {
      const res = await mediaAPI.list({ limit: '50' });
      setMediaList(res.data || []);
    } catch {}
  };

  const selectCover = (media) => {
    setCover(media.url);
    setShowMediaPicker(false);
  };

  // 插入图片到编辑器
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const media = await mediaAPI.upload(file);
      editor?.chain().focus().setImage({ src: media.url, alt: media.alt || file.name }).run();
    } catch (err) {
      alert('上传失败: ' + err.message);
    }
    e.target.value = '';
  };

  // 保存
  const handleSave = async (publishStatus) => {
    if (!title.trim()) return alert('标题不能为空');
    if (!editor) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug || generateSlug(title),
      content: editor.getJSON(),
      excerpt: excerpt || null,
      cover: cover || null,
      categoryId: categoryId || null,
      tags: selectedTags.filter((t) => t.id !== '__new__').map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      status: publishStatus || status,
      visibility,
      publishedAt: publishStatus === 'published' ? new Date().toISOString() : publishedAt || null,
    };
    try {
      if (editId) {
        await postsAPI.update(editId, payload);
      } else {
        await postsAPI.create(payload);
      }
      localStorage.removeItem(autosaveKey);
      navigate('/posts');
    } catch (e) {
      alert('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* ===== 编辑区 ===== */}
      <div className="flex-1 min-w-0">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="文章标题"
          className="w-full text-2xl font-bold border-0 border-b px-4 py-3 focus:outline-none focus:border-blue-300 bg-transparent"
        />

        {/* 工具栏 */}
        {editor && (
          <div className="flex flex-wrap gap-1 px-4 py-2 border-b bg-gray-50">
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><i>I</i></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}><u>U</u></ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><s>S</s></ToolBtn>
            <span className="w-px bg-gray-300 mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolBtn>
            <span className="w-px bg-gray-300 mx-1" />
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>•</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1.</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>❝</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>&lt;/&gt;</ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')}>🖍</ToolBtn>
            <span className="w-px bg-gray-300 mx-1" />
            <label className="cursor-pointer text-xs px-2 py-1 rounded hover:bg-gray-200 transition-colors">
              🖼
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
        )}

        <EditorContent editor={editor} className="border rounded-b-lg bg-white" />
        {autoSaveLabel && <p className="text-xs text-green-600 mt-1 px-4">{autoSaveLabel}</p>}
      </div>

      {/* ===== 右侧设置面板 ===== */}
      <div className="lg:w-72 shrink-0 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-3 text-sm">
          <h3 className="font-medium border-b pb-2">发布设置</h3>

          {/* Slug */}
          <div>
            <label className="text-xs text-gray-500">Slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-0.5" />
          </div>

          {/* 分类 */}
          <div>
            <label className="text-xs text-gray-500">分类</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-0.5">
              <option value="">无分类</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* 标签 */}
          <div>
            <label className="text-xs text-gray-500">标签</label>
            <div className="flex flex-wrap gap-1 mt-0.5 mb-1">
              {selectedTags.map((t) => (
                <span key={t.id} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  {t.name}
                  <button onClick={() => removeTag(t.id)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                value={tagInput}
                onChange={(e) => handleTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="输入标签名，回车创建…"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              {tagSuggestions.length > 0 && (
                <div className="absolute z-10 bg-white border rounded shadow mt-0.5 w-full max-h-32 overflow-y-auto">
                  {tagSuggestions.map((t) => (
                    <button key={t.id} onClick={() => addTag(t)} className={`block w-full text-left px-2 py-1 text-sm ${t._isNew ? 'text-green-600 hover:bg-green-50' : 'hover:bg-blue-50'}`}>
                      {t._isNew ? `✨ 创建「${t.name}」` : t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 封面 */}
          <div>
            <label className="text-xs text-gray-500">封面</label>
            <div className="flex gap-1 mt-0.5">
              <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="URL 或选择" className="flex-1 border rounded px-2 py-1 text-sm" />
              <button onClick={openMediaPicker} className="bg-gray-100 px-2 py-1 rounded text-xs hover:bg-gray-200">📁</button>
            </div>
            {cover && <img src={cover} alt="" className="mt-1 w-full h-24 object-cover rounded" />}
          </div>

          {/* 摘要 */}
          <div>
            <label className="text-xs text-gray-500">摘要</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} className="w-full border rounded px-2 py-1 text-sm mt-0.5 resize-none" />
          </div>

          {/* 状态 */}
          <div>
            <label className="text-xs text-gray-500">状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-0.5">
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </div>

          {/* 可见性 */}
          <div>
            <label className="text-xs text-gray-500">可见性</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-0.5">
              <option value="public">公开</option>
              <option value="private">私有</option>
            </select>
          </div>

          {/* 发布时间 */}
          <div>
            <label className="text-xs text-gray-500">发布时间</label>
            <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className="w-full border rounded px-2 py-1 text-sm mt-0.5" />
          </div>

          {/* 按钮 */}
          <div className="flex gap-2 pt-2 border-t">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex-1 px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              存草稿
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中…' : '发布'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== 媒体选择弹窗 ===== */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="font-medium mb-3">选择封面</h3>
            <div className="grid grid-cols-3 gap-2">
              {mediaList.map((m) => (
                <button key={m.id} onClick={() => selectCover(m)} className="border rounded p-1 hover:border-blue-400">
                  <img src={m.url} alt={m.alt || m.filename} className="w-full h-20 object-cover rounded" />
                </button>
              ))}
            </div>
            {mediaList.length === 0 && <p className="text-gray-400 text-sm">暂无媒体文件</p>}
            <button onClick={() => setShowMediaPicker(false)} className="mt-3 px-4 py-1.5 border rounded text-sm w-full">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 工具栏按钮 */
function ToolBtn({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}