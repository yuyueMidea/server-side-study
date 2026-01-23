import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { LoadingSpinner, EmptyState, ErrorMessage } from '../components/UI';

export default function HomePage() {
  const [page, setPage] = useState(1);
  const { posts, pagination, loading, error, refetch } = usePosts(page, 10);
  const { isAuthenticated } = useAuth();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 text-center border-b border-ink-200/60 mb-10">
        <div className="animate-stagger">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-ink-900 mb-4 leading-tight">
            思想的<span className="text-accent-rust">墨迹</span>
          </h1>
          <p className="text-ink-600 text-lg sm:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
            记录灵感的火花，分享知识的喜悦<br className="hidden sm:block" />
            让文字成为连接思想的桥梁
          </p>
          {isAuthenticated ? (
            <Link to="/write" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              开始创作
            </Link>
          ) : (
            <Link to="/register" className="btn-primary inline-flex items-center gap-2">
              加入我们
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          )}
        </div>
      </section>

      {/* Posts Section */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl text-ink-800">最新文章</h2>
          {pagination && (
            <span className="text-sm text-ink-500">
              共 {pagination.total} 篇
            </span>
          )}
        </div>

        {loading && <LoadingSpinner text="获取文章中..." />}
        
        {error && <ErrorMessage message={error} onRetry={refetch} />}
        
        {!loading && !error && posts.length === 0 && (
          <EmptyState
            title="还没有文章"
            description="成为第一个发表文章的人吧"
            action={
              isAuthenticated ? (
                <Link to="/write" className="btn-primary">
                  写第一篇文章
                </Link>
              ) : (
                <Link to="/register" className="btn-primary">
                  注册账号开始创作
                </Link>
              )
            }
          />
        )}

        {!loading && !error && posts.length > 0 && (
          <>
            <div className="space-y-6">
              {posts.map((post, index) => (
                <PostCard key={post.id} post={post} index={index} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← 上一页
                </button>
                <span className="text-ink-600 font-mono text-sm">
                  {page} / {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
                  disabled={page === pagination.total_pages}
                  className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页 →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
