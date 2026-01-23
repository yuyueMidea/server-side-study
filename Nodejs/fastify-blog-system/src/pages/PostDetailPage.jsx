import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePost, useComments, usePostMutations } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import { CommentForm, CommentList } from '../components/Comment';
import { LoadingSpinner, ErrorMessage } from '../components/UI';
import { formatFullDate } from '../utils/helpers';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { post, loading, error, refetch } = usePost(id);
  const { comments, loading: commentsLoading, addComment } = useComments(id);
  const { deletePost, loading: deleteLoading } = usePostMutations();
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAuthor = user && post && user.id === post.user_id;

  const handleCommentSubmit = async (content) => {
    setCommentSubmitting(true);
    try {
      await addComment(content);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(id);
      navigate('/');
    } catch (err) {
      // Error handled
    }
  };

  if (loading) {
    return <LoadingSpinner text="加载文章中..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  if (!post) {
    return (
      <div className="text-center py-16">
        <h2 className="font-display text-2xl text-ink-800 mb-4">文章不存在</h2>
        <Link to="/" className="btn-primary">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-700 
                   transition-colors mb-8 group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </Link>

      {/* Article */}
      <article className="animate-fade-in">
        {/* Header */}
        <header className="mb-8 pb-8 border-b border-ink-200/60">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink-900 
                       leading-tight mb-6">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-ink-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-teal/15 rounded-full 
                            flex items-center justify-center">
                <span className="text-accent-teal font-medium">
                  {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <span className="font-medium text-ink-800 block">
                  {post.author?.username || '匿名'}
                </span>
                <time className="text-sm" dateTime={post.created_at}>
                  {formatFullDate(post.created_at)}
                </time>
              </div>
            </div>

            {isAuthor && (
              <div className="flex items-center gap-2 ml-auto">
                <Link
                  to={`/edit/${post.id}`}
                  className="btn-ghost text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-ghost text-sm text-red-600 hover:text-red-700 
                           hover:bg-red-50 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="prose-content text-lg leading-relaxed mb-12 whitespace-pre-wrap">
          {post.content}
        </div>

        {/* Comments Section */}
        <section className="border-t border-ink-200/60 pt-8">
          <h2 className="font-display text-2xl text-ink-800 mb-6 flex items-center gap-3">
            评论
            {comments.length > 0 && (
              <span className="text-base font-body text-ink-500">
                ({comments.length})
              </span>
            )}
          </h2>

          <div className="mb-8">
            <CommentForm 
              onSubmit={handleCommentSubmit} 
              loading={commentSubmitting} 
            />
          </div>

          <CommentList comments={comments} loading={commentsLoading} />
        </section>
      </article>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-paper-50 rounded-sm p-6 max-w-md w-full animate-slide-up shadow-xl">
            <h3 className="font-display text-xl text-ink-900 mb-3">确认删除</h3>
            <p className="text-ink-600 mb-6">
              确定要删除这篇文章吗？此操作无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-6 py-2.5 bg-red-600 text-white rounded-sm 
                         hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
