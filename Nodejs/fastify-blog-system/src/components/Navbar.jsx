import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-paper-50/95 backdrop-blur-sm border-b border-ink-200/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-ink-800 rounded-sm flex items-center justify-center
                          group-hover:bg-ink-900 transition-colors duration-200">
              <span className="text-paper-50 font-display text-xl">墨</span>
            </div>
            <span className="font-display text-xl text-ink-800 hidden sm:block">
              墨迹博客
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-sm transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-ink-100 text-ink-900' 
                  : 'text-ink-600 hover:text-ink-800 hover:bg-ink-50'
              }`}
            >
              首页
            </Link>
            
            {isAuthenticated && (
              <Link
                to="/write"
                className={`px-4 py-2 rounded-sm transition-all duration-200 ${
                  isActive('/write') 
                    ? 'bg-ink-100 text-ink-900' 
                    : 'text-ink-600 hover:text-ink-800 hover:bg-ink-50'
                }`}
              >
                写文章
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link 
                  to="/profile"
                  className="flex items-center gap-2 text-ink-700 hover:text-ink-900 transition-colors"
                >
                  <div className="w-8 h-8 bg-accent-teal/20 rounded-full flex items-center justify-center">
                    <span className="text-accent-teal font-medium text-sm">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium">{user?.username}</span>
                </Link>
                <button onClick={handleLogout} className="btn-ghost text-sm">
                  退出
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  登录
                </Link>
                <Link to="/register" className="btn-primary">
                  注册
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-ink-600 hover:text-ink-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-ink-200/60 animate-slide-up">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-ink-700 hover:bg-ink-50 rounded-sm"
              >
                首页
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link
                    to="/write"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-ink-700 hover:bg-ink-50 rounded-sm"
                  >
                    写文章
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-ink-700 hover:bg-ink-50 rounded-sm"
                  >
                    个人中心
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 text-left text-ink-700 hover:bg-ink-50 rounded-sm"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-ink-700 hover:bg-ink-50 rounded-sm"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 text-ink-700 hover:bg-ink-50 rounded-sm"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
