import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI } from '../lib/api';

const STATUS_OPTS = ['all', 'draft', 'published'];

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: '10' };
      if (status !== 'all') params.status = status;
      if (search.trim()) params.search = search.trim();
      const res = await postsAPI.list(params);
      setPosts(res.data || []);
      setPagination(res.pagination || { page: 1, total: 0, totalPages: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (id) => {
    try {
      await postsAPI.remove(id);
      setConfirmId(null);
      fetchPosts();
    } catch (e) {
      alert('删除失败: ' + e.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">📝 文章列表</h1>
        <Link to="/posts/new" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 shrink-0">
          ＋ 新建
        </Link>
      </div>

      {/* 搜索 & 筛选 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题/内容…"
            className="border rounded px-3 py-1.5 text-sm flex-1"
          />
          <button type="submit" className="bg-gray-100 px-3 py-1.5 rounded text-sm hover:bg-gray-200">
            搜索
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border rounded px-2 py-1.5 text-sm"
        >
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? '全部状态' : s}</option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">标题</th>
              <th className="px-4 py-2 font-medium hidden md:table-cell">状态</th>
              <th className="px-4 py-2 font-medium hidden md:table-cell">分类</th>
              <th className="px-4 py-2 font-medium hidden sm:table-cell">日期</th>
              <th className="px-4 py-2 font-medium w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">加载中…</td></tr>
            )}
            {!loading && posts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无文章</td></tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link to={`/posts/${p.id}/edit`} className="text-blue-700 hover:underline font-medium">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{p.category?.name || '-'}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs hidden sm:table-cell">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => setConfirmId(p.id)}
                    className="text-red-500 hover:underline text-xs"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-30"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-30"
          >
            下一页
          </button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <p className="font-medium mb-4">确定删除这篇文章？</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)} className="px-4 py-1.5 border rounded text-sm">取消</button>
              <button onClick={() => handleDelete(confirmId)} className="px-4 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}