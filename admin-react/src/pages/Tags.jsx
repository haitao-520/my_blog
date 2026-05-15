import { useState, useEffect } from 'react';
import { tagsAPI } from '../lib/api';

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [mergeFrom, setMergeFrom] = useState('');
  const [mergeTo, setMergeTo] = useState('');

  const fetch = async () => {
    setLoading(true);
    try { setTags(await tagsAPI.list()); }
    catch { setTags([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try { await tagsAPI.create({ name: newName.trim() }); setNewName(''); fetch(); }
    catch (e) { alert('创建失败: ' + e.message); }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try { await tagsAPI.update(id, { name: editName.trim() }); setEditing(null); fetch(); }
    catch (e) { alert('更新失败: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此标签？')) return;
    try { await tagsAPI.remove(id); fetch(); }
    catch (e) { alert('删除失败: ' + e.message); }
  };

  const handleMerge = async () => {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) return alert('请选择不同的标签');
    if (!confirm('合并标签：来源标签将被删除（实际合并需后端支持批量更新关联）')) return;
    try { await tagsAPI.remove(mergeFrom); setMergeFrom(''); setMergeTo(''); fetch(); }
    catch (e) { alert('操作失败: ' + e.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🏷️ 标签管理</h1>
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="新标签名" className="border rounded px-3 py-1.5 text-sm flex-1" />
        <button onClick={handleCreate} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shrink-0">添加</button>
      </div>
      {loading && <p className="text-gray-400 text-center py-4">加载中…</p>}
      <div className="space-y-2">
        {tags.map(t => (
          <div key={t.id} className="bg-white rounded-lg shadow-sm p-3 flex items-center gap-2">
            {editing === t.id ? (
              <div className="flex gap-1 flex-1">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 border rounded px-2 py-0.5 text-sm" />
                <button onClick={() => handleUpdate(t.id)} className="px-3 py-0.5 bg-green-600 text-white rounded text-xs">保存</button>
                <button onClick={() => setEditing(null)} className="px-3 py-0.5 border rounded text-xs">取消</button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm">{t.name}</span>
                <span className="text-xs text-gray-400">{t._count?.posts ?? 0} 篇</span>
                <button onClick={() => { setEditing(t.id); setEditName(t.name); }} className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50">编辑</button>
                <button onClick={() => handleDelete(t.id)} className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded hover:bg-red-100">删除</button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 p-4 bg-white rounded-lg shadow-sm">
        <h3 className="font-medium text-sm mb-3">合并标签</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={mergeFrom} onChange={e => setMergeFrom(e.target.value)} className="border rounded px-2 py-1.5 text-sm"><option value="">来源标签</option>{tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <span className="text-gray-400">→</span>
          <select value={mergeTo} onChange={e => setMergeTo(e.target.value)} className="border rounded px-2 py-1.5 text-sm"><option value="">目标标签</option>{tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <button onClick={handleMerge} className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">合并</button>
        </div>
        <p className="text-xs text-gray-400 mt-2">合并后来源标签将被删除，实际合并需后端支持</p>
      </div>
    </div>
  );
}