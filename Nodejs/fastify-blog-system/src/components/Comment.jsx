import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { Link } from 'react-router-dom';

export function CommentForm({ onSubmit, loading }) {
  const [content, setContent] = useState('');
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      await onSubmit(content);
      setContent('');
    } catch (err) {
      // Error handled by parent
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-ink-50/50 border border-ink-200/60 rounded-sm p-6 text-center">
        <p className="text-ink-600 mb-3">登录后参与评论</p>
        <Link to="/login" className="btn-primary inline-block">
          去登录
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写下你的想法..."
        className="input-field min-h-[120px] resize-y"
        required
      />
      <div className="flex justify-end">
        <button 
          type="submit" 
          className="btn-primary"
          disabled={loading || !content.trim()}
        >
          {loading ? '发送中...' : '发表评论'}
        </button>
      </div>
    </form>
  );
}

export function CommentItem({ comment, index = 0 }) {
  const animationDelay = `${index * 0.08}s`;

  return (
    <div 
      className="py-5 border-b border-ink-100 last:border-b-0 opacity-0 animate-fade-in"
      style={{ animationDelay, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 bg-accent-rust/15 rounded-full flex items-center justify-center shrink-0">
          <span className="text-accent-rust font-medium">
            {comment.author?.username?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-ink-800">
              {comment.author?.username || '匿名用户'}
            </span>
            <time className="text-sm text-ink-500" dateTime={comment.created_at}>
              {formatDate(comment.created_at)}
            </time>
          </div>
          <p className="text-ink-700 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CommentList({ comments, loading }) {
  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-6 h-6 border-2 border-ink-300 border-t-ink-600 
                      rounded-full animate-spin" />
        <p className="text-ink-500 mt-3">加载评论中...</p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="w-12 h-12 mx-auto text-ink-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-ink-500">暂无评论，来说点什么吧</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-ink-100">
      {comments.map((comment, index) => (
        <CommentItem key={comment.id} comment={comment} index={index} />
      ))}
    </div>
  );
}
