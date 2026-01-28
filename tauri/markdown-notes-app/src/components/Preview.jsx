import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useStore from '../store/useStore';

const Preview = () => {
  const { currentContent, showPreview } = useStore();

  if (!showPreview) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-white border-l border-gray-200">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="markdown-preview">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              img({ node, ...props }) {
                return (
                  <img
                    {...props}
                    className="max-w-full h-auto rounded-lg shadow-md"
                    loading="lazy"
                  />
                );
              },
              a({ node, ...props }) {
                return (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  />
                );
              },
              table({ node, ...props }) {
                return (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200" {...props} />
                  </div>
                );
              },
              th({ node, ...props }) {
                return (
                  <th
                    className="px-4 py-2 bg-gray-100 text-left text-sm font-semibold text-gray-700"
                    {...props}
                  />
                );
              },
              td({ node, ...props }) {
                return (
                  <td
                    className="px-4 py-2 border-t border-gray-200 text-sm"
                    {...props}
                  />
                );
              },
              blockquote({ node, ...props }) {
                return (
                  <blockquote
                    className="border-l-4 border-primary-500 pl-4 italic text-gray-600 my-4"
                    {...props}
                  />
                );
              },
              ul({ node, ...props }) {
                return (
                  <ul className="list-disc list-inside my-3 space-y-1" {...props} />
                );
              },
              ol({ node, ...props }) {
                return (
                  <ol className="list-decimal list-inside my-3 space-y-1" {...props} />
                );
              },
            }}
          >
            {currentContent || '*预览区域*\n\n在左侧编辑器中输入 Markdown 内容...'}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default Preview;
