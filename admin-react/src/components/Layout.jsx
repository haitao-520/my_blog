import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setForceLogoutHandler } from '../lib/api';

const NAV_ITEMS = [
  { to: '/', label: '仪表盘', icon: '📊' },
  { to: '/posts', label: '文章', icon: '📝' },
  { to: '/media', label: '媒体', icon: '🖼️' },
  { to: '/comments', label: '评论', icon: '💬' },
  { to: '/categories', label: '分类', icon: '📁' },
  { to: '/tags', label: '标签', icon: '🏷️' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // 全局 token 失效拦截：任何 API 返回 401（密码已变更）立刻踢出
  useEffect(() => {
    setForceLogoutHandler(() => {
      logout();
      navigate('/login');
    });
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const frontendUrl = isLocal ? 'http://localhost:4321' : '/';

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ===== 桌面端左侧菜单 ===== */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:min-h-screen bg-white border-r">
        <div className="h-14 flex items-center px-4 font-bold text-lg border-b">
          🏠 后台管理
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4 text-sm text-gray-500">
          <p className="truncate">👤 {user?.username || 'admin'}</p>
          <button onClick={handleLogout} className="text-red-500 hover:underline mt-1">
            退出登录
          </button>
          <a href={frontendUrl} className="block text-blue-500 hover:underline mt-1">
            🌐 前往首页
          </a>
        </div>
      </aside>

      {/* ===== 移动端顶部栏 ===== */}
      <header className="md:hidden flex items-center justify-between h-12 px-3 bg-white border-b">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-xl p-1"
          aria-label="菜单"
        >
          ☰
        </button>
        <span className="font-bold text-sm">后台管理</span>
        <div className="flex items-center gap-2">
          <a href={frontendUrl} className="text-xs text-blue-500">
            🌐 首页
          </a>
          <button onClick={handleLogout} className="text-xs text-red-500">
            退出
          </button>
        </div>
      </header>

      {/* ===== 移动端汉堡菜单下拉 ===== */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-b shadow-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm ${
                  isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* ===== 主内容 ===== */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
        <Outlet />
      </main>

      {/* ===== 移动端底部导航 ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-1 z-40">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center text-[10px] px-1 py-1 rounded ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}