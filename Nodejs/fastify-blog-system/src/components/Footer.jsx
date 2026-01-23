export default function Footer() {
  return (
    <footer className="border-t border-ink-200/60 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ink-800 rounded-sm flex items-center justify-center">
              <span className="text-paper-50 font-display text-sm">墨</span>
            </div>
            <span className="text-ink-600 text-sm">
              墨迹博客 · 思想的印记
            </span>
          </div>
          
          <div className="text-sm text-ink-500">
            使用 Fastify + React + SQLite 构建
          </div>
        </div>
      </div>
    </footer>
  );
}
