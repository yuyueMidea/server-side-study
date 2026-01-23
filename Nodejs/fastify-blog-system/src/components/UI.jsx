export function LoadingSpinner({ size = 'md', text = '加载中...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-2',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div 
        className={`${sizeClasses[size]} border-ink-300 border-t-ink-600 
                   rounded-full animate-spin`} 
      />
      {text && <p className="text-ink-500 mt-4">{text}</p>}
    </div>
  );
}

export function EmptyState({ 
  title = '暂无内容', 
  description = '', 
  icon,
  action 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon || (
        <svg className="w-16 h-16 text-ink-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )}
      <h3 className="text-xl font-display text-ink-700 mb-2">{title}</h3>
      {description && (
        <p className="text-ink-500 max-w-md mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-display text-ink-800 mb-2">出错了</h3>
      <p className="text-ink-600 mb-6">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          重试
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="mb-8 sm:mb-12">
      <h1 className="font-display text-3xl sm:text-4xl text-ink-900 mb-2 animate-fade-in">
        {title}
      </h1>
      {subtitle && (
        <p className="text-ink-600 text-lg animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {subtitle}
        </p>
      )}
      {children && (
        <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {children}
        </div>
      )}
    </header>
  );
}
