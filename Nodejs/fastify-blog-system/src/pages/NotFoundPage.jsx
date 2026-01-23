import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="animate-fade-in">
        {/* 404 Number */}
        <div className="relative mb-8">
          <span className="text-[12rem] sm:text-[16rem] font-display text-ink-100 leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-24 h-24 text-accent-rust" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h1 className="font-display text-3xl text-ink-800 mb-4">页面走丢了</h1>
        <p className="text-ink-600 mb-8 max-w-md mx-auto">
          你访问的页面不存在，可能已被删除或移动到其他位置。
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/" className="btn-primary">
            返回首页
          </Link>
          <button 
            onClick={() => window.history.back()} 
            className="btn-secondary"
          >
            返回上一页
          </button>
        </div>
      </div>
    </div>
  );
}
