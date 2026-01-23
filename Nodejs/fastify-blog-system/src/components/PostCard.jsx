import { Link } from 'react-router-dom';
import { formatDate, truncateText } from '../utils/helpers';

export default function PostCard({ post, index = 0 }) {
  const animationDelay = `${index * 0.1}s`;

  return (
    <article 
      className="card p-6 opacity-0 animate-slide-up"
      style={{ animationDelay, animationFillMode: 'forwards' }}
    >
      <Link to={`/posts/${post.id}`} className="block group">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="font-display text-xl sm:text-2xl text-ink-900 
                       group-hover:text-accent-rust transition-colors duration-200
                       leading-tight">
            {post.title}
          </h2>
          <span className="shrink-0 text-sm text-ink-500 font-mono">
            #{post.id}
          </span>
        </div>

        {/* Content Preview */}
        <p className="text-ink-600 leading-relaxed mb-4">
          {truncateText(post.content, 180)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-ink-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-teal/15 rounded-full flex items-center justify-center">
              <span className="text-accent-teal font-medium text-sm">
                {post.author?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-sm text-ink-600">
              {post.author?.username || '匿名'}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-ink-500">
            <time dateTime={post.created_at}>
              {formatDate(post.created_at)}
            </time>
            {post.comment_count > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {post.comment_count}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
