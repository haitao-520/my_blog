import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EXPORT_TYPES = [
  { key: 'posts', label: '文章', icon: '📄' },
  { key: 'comments', label: '评论', icon: '💬' },
  { key: 'categories', label: '分类', icon: '📁' },
  { key: 'tags', label: '标签', icon: '🏷️' },
  { key: 'settings', label: '设置', icon: '⚙️' },
];

function getToken() {
  try {
    const u = JSON.parse(localStorage.getItem('blog_admin_user') || '{}');
    return u.token || '';
  } catch { return ''; }
}

// 通用的 fetch 封装，自动带 token
async function api(url, opts = {}) {
  const token = getToken();
  const headers = { ...opts.headers, 'Authorization': `Bearer ${token}` };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status}`);
  return data;
}

export default function Settings() {
  // ---- 站点信息 ----
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDesc, setSiteDesc] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载当前设置
  useEffect(() => {
    api('/api/settings')
      .then((data) => {
        setSiteTitle(data.siteTitle || '');
        setSiteDesc(data.siteDesc || '');
        setAuthorName(data.authorName || '水镜雪');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 保存设置 — 真正发送 PUT 请求
  const handleSaveSite = async () => {
    try {
      await api('/api/settings', {
        method: 'PUT',
        body: { siteTitle, siteDesc },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  };

  // ---- 导出 ----
  const [exportTypes, setExportTypes] = useState(['posts', 'comments', 'categories', 'tags', 'media']);
  const [exporting, setExporting] = useState(null); // 'json' | 'md' | null

  const toggleExportType = (key) => {
    setExportTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleExportJSON = async () => {
    if (exportTypes.length === 0) return alert('请至少选择一种类型');
    setExporting('json');
    try {
      const token = getToken();
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ types: exportTypes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status}`);
      }
      const blob = await res.blob();
      const now = new Date();
      const ts = `${now.toISOString().slice(0,10)}-${now.toISOString().slice(11,19).replace(/:/g,'-')}`;
      downloadBlob(blob, `blog-export-${ts}.zip`);
    } catch (e) { alert('导出失败: ' + e.message); }
    finally { setExporting(null); }
  };

  const handleExportMD = async () => {
    setExporting('md');
    try {
      const token = getToken();
      const res = await fetch('/api/export/markdown', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${res.status}`);
      }
      const blob = await res.blob();
      const now2 = new Date();
      const ts2 = `${now2.toISOString().slice(0,10)}-${now2.toISOString().slice(11,19).replace(/:/g,'-')}`;
      downloadBlob(blob, `blog-posts-${ts2}.zip`);
    } catch (e) { alert('导出失败: ' + e.message); }
    finally { setExporting(null); }
  };

  // ---- 导入 ----
  const fileRef = useRef(null);
  const [importStrategy, setImportStrategy] = useState('skip');
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportReport(null);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/import?strategy=${importStrategy}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${res.status}`);
      setImportReport(data.report || data);
    } catch (err) { alert('导入失败: ' + err.message); }
    finally { setImporting(false); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">⚙️ 设置</h1>

      {/* ========== 站点信息 ========== */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-sm mb-3">站点信息</h2>
        {loading ? (
          <p className="text-xs text-gray-400">加载中…</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">站点标题</label>
              <input
                value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)}
                placeholder="My Blog"
                className="w-full border rounded px-3 py-1.5 text-sm mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">站点描述</label>
              <textarea
                value={siteDesc} onChange={(e) => setSiteDesc(e.target.value)}
                placeholder="一个个人博客" rows={2}
                className="w-full border rounded px-3 py-1.5 text-sm mt-0.5 resize-none"
              />
            </div>
            <button
              onClick={handleSaveSite}
              disabled={saved}
              className={`px-4 py-1.5 rounded text-sm text-white transition-colors ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saved ? '已保存 ✓' : '保存设置'}
            </button>
          </div>
        )}
      </div>

      {/* ========== 一键改名 ========== */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
<h2 class="font-medium text-sm mb-1">👤 作者名</h2>
        <p class="text-xs text-gray-400 mb-3">当前作者名：<strong>{authorName || '未设置'}</strong>。修改后会自动替换所有页面中的作者名。</p>
          <RenameSection authorName={authorName} onDone={() => {
            // 改名后重新加载设置
            api('/api/settings').then(data => {
              setAuthorName(data.authorName || '');
            }).catch(() => {});
          }} />
      </div>

      {/* ========== 导出数据 ========== */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-sm mb-1">📤 导出数据</h2>
        <p className="text-xs text-gray-400 mb-3">选择数据类型后点击按钮下载</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {EXPORT_TYPES.map((t) => (
            <label
              key={t.key}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors select-none ${
                exportTypes.includes(t.key)
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox" checked={exportTypes.includes(t.key)}
                onChange={() => toggleExportType(t.key)}
                className="sr-only"
              />
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportJSON}
            disabled={exporting !== null}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {exporting === 'json' ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                导出中…
              </>
            ) : '📦 导出 JSON'}
          </button>
          <button
            onClick={handleExportMD}
            disabled={exporting !== null}
            className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {exporting === 'md' ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                打包中…
              </>
            ) : '📝 导出 Markdown'}
          </button>
        </div>
      </div>

      {/* ========== 导入数据 ========== */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-sm mb-1">📥 导入数据</h2>
        <p className="text-xs text-gray-400 mb-3">选择之前导出的 .json 文件恢复数据</p>

        {/* 冲突策略 */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-gray-500">同名文章：</span>
          <label className={`text-xs px-3 py-1 rounded cursor-pointer border transition-colors ${
            importStrategy === 'skip'
              ? 'bg-amber-50 border-amber-400 text-amber-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <input type="radio" name="strategy" value="skip" checked={importStrategy === 'skip'}
              onChange={() => setImportStrategy('skip')} className="sr-only" />
            跳过 (skip)
          </label>
          <label className={`text-xs px-3 py-1 rounded cursor-pointer border transition-colors ${
            importStrategy === 'overwrite'
              ? 'bg-red-50 border-red-400 text-red-700'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <input type="radio" name="strategy" value="overwrite" checked={importStrategy === 'overwrite'}
              onChange={() => setImportStrategy('overwrite')} className="sr-only" />
            覆盖 (overwrite)
          </label>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {importing ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                导入中…
              </>
            ) : '📁 选择 JSON 文件'}
          </button>
          <input ref={fileRef} type="file" accept=".json,.zip" onChange={handleImport} className="hidden" />
        </div>

        {/* 导入报告 */}
        {importReport && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <h3 className="text-sm font-medium mb-2">
              {importReport.errors?.length ? '⚠️' : '✅'} 导入报告（{importStrategy === 'skip' ? '跳过模式' : '覆盖模式'}）
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <ReportCard label="文章" imported={importReport.imported?.posts} skipped={importReport.skipped?.posts} />
              <ReportCard label="分类" imported={importReport.imported?.categories} skipped={importReport.skipped?.categories} />
              <ReportCard label="标签" imported={importReport.imported?.tags} skipped={importReport.skipped?.tags} />
              <ReportCard label="评论" imported={importReport.imported?.comments} skipped={importReport.skipped?.comments} />
            </div>
            {importReport.errors?.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-red-600 font-medium">查看 {importReport.errors.length} 条错误</summary>
                <ul className="mt-2 pl-4 space-y-0.5 text-gray-600 list-disc">
                  {importReport.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ========== 修改密码 ========== */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="font-medium text-sm mb-3">🔒 修改密码</h2>
        <ChangePasswordSection />
      </div>
    </div>
  );
}

/* ==================== 小工具 ==================== */

function RenameSection({ authorName, onDone }) {
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameResult, setRenameResult] = useState(null);
  const oldName = authorName || '水镜雪';


  const handleRename = async () => {
    if (!newName.trim()) return alert('请输入新名称');
    setRenaming(true);
    setRenameResult(null);
    try {
      const data = await api('/api/settings/rename', {
        method: 'PUT',
        body: { name: newName.trim() },
      });
      setRenameResult(data);
      setNewName('');
      if (onDone) onDone();
    } catch (e) {
      alert('改名失败: ' + e.message);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="输入新名称，如「清风的技术栈」"
          className="flex-1 border rounded px-3 py-1.5 text-sm"
        />
        <button
          onClick={handleRename}
          disabled={renaming}
          className="px-4 py-1.5 rounded text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
        >
          {renaming ? '替换中…' : '一键改名'}
        </button>
      </div>
      {renameResult && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          ✅ 已将作者名修改为「{renameResult.newName}」
        </div>
      )}
    </div>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReportCard({ label, imported = 0, skipped = 0 }) {
  return (
    <div className="bg-white rounded border px-3 py-2 text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="flex justify-center gap-2 text-xs mt-0.5">
        <span className="text-green-600 font-medium">+{imported}</span>
        {skipped > 0 && <span className="text-amber-500 font-medium">{skipped} 跳过</span>}
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ oldPw: '', newPw: '', confirmPw: '' });
  const [status, setStatus] = useState(null);

  const handleSubmit = async () => {
    setStatus(null);
    const { oldPw, newPw, confirmPw } = form;
    if (!oldPw || !newPw || !confirmPw) return setStatus({ type: 'error', msg: '请填写所有字段' });
    if (newPw.length < 6) return setStatus({ type: 'error', msg: '新密码至少6位' });
    if (newPw !== confirmPw) return setStatus({ type: 'error', msg: '两次新密码输入不一致' });

    try {
      await api('/api/auth/password', {
        method: 'PUT',
        body: { oldPassword: oldPw, newPassword: newPw },
      });
      setStatus({ type: 'success', msg: '密码修改成功，即将退出…' });
      setTimeout(() => { logout(); navigate('/login'); }, 1000);
    } catch (e) {
      setStatus({ type: 'error', msg: e.message });
    }
  };

  const update = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-3 max-w-sm">
      <input type="password" value={form.oldPw} onChange={update('oldPw')} placeholder="旧密码"
        autoComplete="current-password" className="w-full border rounded px-3 py-1.5 text-sm" />
      <input type="password" value={form.newPw} onChange={update('newPw')} placeholder="新密码（至少6位）"
        autoComplete="new-password" className="w-full border rounded px-3 py-1.5 text-sm" />
      <input type="password" value={form.confirmPw} onChange={update('confirmPw')} placeholder="确认新密码"
        autoComplete="new-password" className="w-full border rounded px-3 py-1.5 text-sm" />
      <button onClick={handleSubmit}
        className="px-4 py-1.5 rounded text-sm text-white bg-blue-600 hover:bg-blue-700">
        修改密码
      </button>
      {status && (
        <p className={`text-xs ${status.type === 'success' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-100'} border rounded px-3 py-2`}>
          {status.msg}
        </p>
      )}
    </div>
  );
}