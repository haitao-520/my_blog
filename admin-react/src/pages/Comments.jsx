import { useState, useEffect, useCallback } from 'react';
import { commentsAPI, postsAPI } from '../lib/api';

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postId, setPostId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: '20' };
      if (postId) params.postId = postId;
      if (statusFilter) params.status = statusFilter;
      const res = await commentsAPI.list(params);
      setComments(res.data || []);
      setTotalPages(res.pagination?.totalPages || 0);
    } catch { setComments([]); }
    finally { setLoading(false); }
  }, [page, postId, statusFilter]);

  useEffect(() => { fetchComments(); }, [fetchComments]);
  useEffect(() => { postsAPI.list({ status: 'all', limit: '500' }).then(r => setPosts(r.data || [])).catch(() => {}); }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'delete') await commentsAPI.remove(id);
      else await commentsAPI.update(id, { status: action });
      fetchComments();
    } catch (e) { alert('操作失败: ' + e.message); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">💬 评论管理</h1>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={postId} onChange={e => { setPostId(e.target.value); setPage(1); }} className="border rounded px-2 py-1.5 text-sm">
          <option value="">全部文章</option>
          {posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded px-2 py-1.5 text-sm">
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="spam">垃圾</option>
        </select>
      </div>

      {loading && <p className="text-gray-400 text-center py-4">加载中…</p>}

      <div className="space-y-3">
        {!loading && comments.length === 0 && <p className="text-gray-400 text-center py-4">暂无评论</p>}
        {comments.map(c => (
          <div key={c.id} className={`bg-white rounded-lg shadow-sm p-3 sm:p-4 border-l-4 ${c.status === 'pending' ? 'border-l-yellow-400' : c.status === 'approved' ? 'border-l-green-400' : 'border-l-red-400'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium truncate">{c.authorName}</span>
                  <span className="text-gray-400 text-xs truncate">{c.email}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : c.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                </div>
                {c.post && <p className="text-xs text-gray-400 mt-0.5 truncate">文章：{c.post.title}</p>}
                <p className="text-sm mt-1.5 text-gray-700 break-words">{c.content}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(c.createdAt).toLocaleString('zh-CN')}</p>
              </div>
              <div className="flex gap-1 shrink-0 self-end sm:self-start">
                {c.status !== 'approved' && (
                  <button onClick={() => handleAction(c.id, 'approved')} className="text-xs px-2 py-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 whitespace-nowrap">通过</button>
                )}
                {c.status !== 'spam' && (
                  <button onClick={() => handleAction(c.id, 'spam')} className="text-xs px-2 py-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 whitespace-nowrap">垃圾</button>
                )}
                <button onClick={() => handleAction(c.id, 'delete')} className="text-xs px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 whitespace-nowrap">删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">上一页</button>
          <span className="text-sm text-gray-500 self-center">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-30">下一页</button>
        </div>
      )}
    </div>
  );
}