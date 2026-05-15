import { useState, useEffect } from 'react';
import { categoriesAPI } from '../lib/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState('');
  const [editName, setEditName] = useState('');
  const [parentId, setParentId] = useState('');

  const fetch = async () => {
    setLoading(true);
    try { setCategories(await categoriesAPI.list()); }
    catch { setCategories([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try { await categoriesAPI.create({ name: newName.trim(), parentId: parentId || undefined }); setNewName(''); setParentId(''); fetch(); }
    catch (e) { alert('创建失败: ' + e.message); }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try { await categoriesAPI.update(id, { name: editName.trim() }); setEditing(null); fetch(); }
    catch (e) { alert('更新失败: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此分类？')) return;
    try { await categoriesAPI.remove(id); fetch(); }
    catch (e) { alert('删除失败: ' + e.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📁 分类管理</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="新分类名" className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]" />
        <select value={parentId} onChange={e => setParentId(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="">无父级</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={handleCreate} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shrink-0">添加</button>
      </div>
      {loading && <p className="text-gray-400 text-center py-4">加载中…</p>}
      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.id} className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-2">
            {editing === c.id ? (
              <div className="flex gap-1 flex-1">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 border rounded px-2 py-0.5 text-sm" />
                <button onClick={() => handleUpdate(c.id)} className="px-3 py-0.5 bg-green-600 text-white rounded text-xs">保存</button>
                <button onClick={() => setEditing(null)} className="px-3 py-0.5 border rounded text-xs">取消</button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm">{c.name}</span>
                <span className="text-xs text-gray-400">{c._count?.posts ?? 0} 篇</span>
                <button onClick={() => { setEditing(c.id); setEditName(c.name); }} className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50">编辑</button>
                <button onClick={() => handleDelete(c.id)} className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded hover:bg-red-100">删除</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}