import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsApi } from '../utils/api';
import { formatDate } from '../utils/helpers';
import { LoadingSpinner, EmptyState } from '../components/UI';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        const response = await postsApi.getAll(1, 100);
        // Filter posts by current user
        const userPosts = response.data.filter(post => post.user_id === user?.id);
        setPosts(userPosts);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserPosts();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <h2 className="font-display text-2xl text-ink-800 mb-4">请先登录</h2>
        <Link to="/login" className="btn-primary">去登录</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-ink-800 to-ink-900 rounded-sm p-8 sm:p-12 mb-8 
                    text-paper-50 animate-fade-in relative overflow-hidden">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-accent-rust/30 rounded-full flex items-center justify-center
                        border-4 border-paper-50/20">
            <span className="text-4xl font-display">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="text-center sm:text-left">
            <h1 className="font-display text-3xl mb-2">{user.username}</h1>
            <p className="text-paper-200 mb-1">{user.email}</p>
            <p className="text-paper-300 text-sm">
              加入于 {formatDate(user.created_at)}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="sm:ml-auto mt-4 sm:mt-0 px-4 py-2 bg-paper-50/10 hover:bg-paper-50/20 
                     rounded-sm transition-colors text-sm"
          >
            退出登录
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-6 text-center">
          <span className="block text-3xl font-display text-ink-900 mb-1">
            {posts.length}
          </span>
          <span className="text-sm text-ink-600">文章</span>
        </div>
        <div className="card p-6 text-center">
          <span className="block text-3xl font-display text-ink-900 mb-1">
            {posts.reduce((acc, post) => acc + (post.comment_count || 0), 0)}
          </span>
          <span className="text-sm text-ink-600">评论</span>
        </div>
        <div className="card p-6 text-center">
          <span className="block text-3xl font-display text-ink-900 mb-1">
            {posts.reduce((acc, post) => acc + post.content.length, 0)}
          </span>
          <span className="text-sm text-ink-600">字数</span>
        </div>
      </div>

      {/* User Posts */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-ink-800">我的文章</h2>
          <Link to="/write" className="btn-primary text-sm">
            写新文章
          </Link>
        </div>

        {loading && <LoadingSpinner text="加载文章中..." />}

        {error && (
          <div className="text-center py-8 text-red-600">{error}</div>
        )}

        {!loading && !error && posts.length === 0 && (
          <EmptyState
            title="还没有文章"
            description="开始写下你的第一篇文章吧"
            action={
              <Link to="/write" className="btn-primary">
                创建第一篇
              </Link>
            }
          />
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post, index) => (
              <div 
                key={post.id}
                className="card p-5 flex items-center justify-between gap-4 opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'forwards' }}
              >
                <div className="min-w-0">
                  <Link 
                    to={`/posts/${post.id}`}
                    className="font-display text-lg text-ink-800 hover:text-accent-rust 
                             transition-colors block truncate"
                  >
                    {post.title}
                  </Link>
                  <div className="flex items-center gap-4 mt-1 text-sm text-ink-500">
                    <time>{formatDate(post.created_at)}</time>
                    {post.comment_count > 0 && (
                      <span>{post.comment_count} 评论</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Link 
                    to={`/edit/${post.id}`}
                    className="p-2 text-ink-500 hover:text-ink-700 hover:bg-ink-100 
                             rounded-sm transition-colors"
                    title="编辑"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <Link 
                    to={`/posts/${post.id}`}
                    className="p-2 text-ink-500 hover:text-ink-700 hover:bg-ink-100 
                             rounded-sm transition-colors"
                    title="查看"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
