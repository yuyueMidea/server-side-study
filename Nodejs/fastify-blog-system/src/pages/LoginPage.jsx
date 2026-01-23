import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-8 sm:pt-16">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-in">
        <Link to="/" className="inline-block mb-6">
          <div className="w-16 h-16 bg-ink-800 rounded-sm flex items-center justify-center mx-auto
                        hover:bg-ink-900 transition-colors">
            <span className="text-paper-50 font-display text-3xl">墨</span>
          </div>
        </Link>
        <h1 className="font-display text-3xl text-ink-900 mb-2">欢迎回来</h1>
        <p className="text-ink-600">登录你的账户继续创作</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 animate-slide-up">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-ink-700 mb-2">
            用户名
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
            placeholder="请输入用户名"
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-2">
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="请输入密码"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-paper-200 border-t-transparent 
                             rounded-full animate-spin" />
              登录中...
            </span>
          ) : (
            '登录'
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-ink-600 mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        还没有账户？{' '}
        <Link to="/register" className="text-accent-rust hover:text-accent-rust/80 font-medium">
          立即注册
        </Link>
      </p>
    </div>
  );
}
