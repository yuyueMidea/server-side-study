import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    if (username.length < 3) {
      setError('用户名至少需要3个字符');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }
    if (password.length < 6) {
      setError('密码至少需要6个字符');
      return false;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      await register({ username, email, password });
      navigate('/');
    } catch (err) {
      setError(err.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-8 sm:pt-12">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-in">
        <Link to="/" className="inline-block mb-6">
          <div className="w-16 h-16 bg-ink-800 rounded-sm flex items-center justify-center mx-auto
                        hover:bg-ink-900 transition-colors">
            <span className="text-paper-50 font-display text-3xl">墨</span>
          </div>
        </Link>
        <h1 className="font-display text-3xl text-ink-900 mb-2">创建账户</h1>
        <p className="text-ink-600">加入我们，开始你的写作之旅</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">
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
            placeholder="3-20个字符"
            required
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-2">
            邮箱
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="your@email.com"
            required
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
            placeholder="至少6个字符"
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-700 mb-2">
            确认密码
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="再次输入密码"
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
              注册中...
            </span>
          ) : (
            '创建账户'
          )}
        </button>

        <p className="text-xs text-ink-500 text-center">
          注册即表示您同意我们的服务条款和隐私政策
        </p>
      </form>

      {/* Footer */}
      <p className="text-center text-ink-600 mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        已有账户？{' '}
        <Link to="/login" className="text-accent-rust hover:text-accent-rust/80 font-medium">
          立即登录
        </Link>
      </p>
    </div>
  );
}
