import { useState, useEffect, useRef } from 'react';
import { mediaAPI } from '../lib/api';

export default function Media() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const fileRef = useRef(null);

  const fetchFiles = async (p = 1) => {
    setLoading(true);
    try {
      const res = await mediaAPI.list({ page: p, limit: '20' });
      setFiles(res.data || []);
      setTotalPages(res.pagination?.totalPages || 0);
    } catch { setFiles([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFiles(page); }, [page]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await mediaAPI.upload(file);
      fetchFiles(page);
    } catch (err) { alert('上传失败: ' + err.message); }
    finally { setUploading(false); }
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await mediaAPI.upload(file); fetchFiles(page); }
    catch (err) { alert('上传失败: ' + err.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除此文件？')) return;
    try {
      await mediaAPI.remove(id);
      fetchFiles(page);
    } catch (err) { alert('删除失败: ' + err.message); }
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(window.location.origin + url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🖼️ 媒体库</h1>

      {/* 上传区 */}
      <div
        className="border-2 border-dashed rounded-lg p-8 mb-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {uploading ? (
          <p className="text-gray-400">上传中…</p>
        ) : (
          <p className="text-gray-400">点击或拖拽文件上传 <span className="text-xs">(jpg/png/gif/webp, ≤10MB)</span></p>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>

      {/* 网格 */}
      {loading && <p className="text-gray-400 text-center py-8">加载中…</p>}
      {!loading && files.length === 0 && <p className="text-gray-400 text-center py-8">暂无文件</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {files.map((f) => (
          <div key={f.id} className="border rounded-lg overflow-hidden group relative">
            <img src={f.url} alt={f.alt || f.filename} className="w-full h-28 object-cover" />
            <div className="p-2">
              <p className="text-xs truncate text-gray-500">{f.filename}</p>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => copyUrl(f.url, f.id)}
                  className={`text-xs px-2 py-0.5 rounded ${copiedId === f.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {copiedId === f.id ? '已复制' : '复制URL'}
                </button>
                <button onClick={() => handleDelete(f.id)} className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded hover:bg-red-100">
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500 self-center">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}