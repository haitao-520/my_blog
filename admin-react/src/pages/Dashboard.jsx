import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { statsAPI } from '../lib/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    statsAPI.get()
      .then(setStats)
      .catch((e) => {
        if (e.message.includes('401') || e.message.includes('密码已变更') || e.message.includes('请重新登录')) {
          logout();
          navigate('/login');
          return;
        }
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const num = (key) => loading ? '...' : (stats ? stats[key] : '-');

  return (
    <div>
      <h1 className="text-2xl font-bold">📊 仪表盘</h1>
      <p className="text-gray-500 mt-2">欢迎回来，{user?.username || 'admin'}</p>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          ⚠️ 加载失败: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
        {/* 文章 */}
 <div className="bg-blue-100 rounded-xl p-4 text-center">
 <p className="text-3xl font-bold text-blue-600">{num('posts')}</p>
 <p className="text-xs text-gray-500 mt-1">📝 文章</p>
 </div>
 {/* 分类 */}
 <div className="bg-emerald-100 rounded-xl p-4 text-center">
 <p className="text-3xl font-bold text-emerald-600">{num('categories')}</p>
 <p className="text-xs text-gray-500 mt-1">📁 分类</p>
 </div>
 {/* 标签 */}
 <div className="bg-purple-100 rounded-xl p-4 text-center">
 <p className="text-3xl font-bold text-purple-600">{num('tags')}</p>
 <p className="text-xs text-gray-500 mt-1">🏷️ 标签</p>
 </div>
 {/* 评论 */}
 <div className="bg-orange-100 rounded-xl p-4 text-center">
 <p className="text-3xl font-bold text-orange-600">{num('comments')}</p>
 <p className="text-xs text-gray-500 mt-1">💬 评论</p>
 </div>
 {/* 媒体 */}
 <div className="bg-pink-100 rounded-xl p-4 text-center">
 <p className="text-3xl font-bold text-pink-600">{num('media')}</p>
 <p className="text-xs text-gray-500 mt-1">🖼️ 媒体</p>
 </div>
      </div>
    </div>
  );
}