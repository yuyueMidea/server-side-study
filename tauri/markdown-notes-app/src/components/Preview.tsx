import React from 'react';
import { markdownToHtml } from '../utils/helpers';
import { useAppStore } from '../store/useAppStore';

interface PreviewProps {
  content: string;
}

export const Preview: React.FC<PreviewProps> = ({ content }) => {
  const { viewMode } = useAppStore();
  const [html, setHtml] = React.useState('');

  React.useEffect(() => {
    const convertedHtml = markdownToHtml(content);
    setHtml(convertedHtml);
  }, [content]);

  if (viewMode === 'edit') {
    return null;
  }

  return (
    <div className="h-full overflow-auto">
      <div
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
