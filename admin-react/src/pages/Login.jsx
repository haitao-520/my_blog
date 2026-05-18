import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      setCaptchaToken(data.token);
      setCaptchaSvg(data.svg);
      setCaptchaAnswer('');
    } catch {
      setError('验证码加载失败');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => { fetchCaptcha(); }, [fetchCaptcha]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, captchaToken, captchaAnswer);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-md p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">🔐 后台登录</h1>
        {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
        <input
          className="w-full border rounded px-3 py-2 mb-3 text-sm"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2 mb-3 text-sm"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex items-center gap-2 mb-3">
          {captchaLoading ? (
            <span className="text-xs text-gray-400">加载中…</span>
          ) : captchaSvg ? (
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaSvg)}`}
              alt="验证码"
              className="h-10 border rounded cursor-pointer"
              onClick={fetchCaptcha}
            />
          ) : null}
          <input
            className="w-28 border rounded px-3 py-2 text-sm"
            placeholder="输入图中字符"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
          />
          <button
            type="button"
            onClick={fetchCaptcha}
            className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
          >
            🔄 换一张
          </button>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '登录中…' : '登 录'}
        </button>
        <p className="text-xs text-gray-400 mt-3 text-center">
          默认管理员: admin / admin123
        </p>
      </form>
    </div>
  );
}