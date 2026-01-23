import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { usePost, usePostMutations } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, ErrorMessage } from '../components/UI';

export default function WritePostPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { post, loading: postLoading, error: postError } = usePost(id);
  const { createPost, updatePost, loading, error } = usePostMutations();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (isEditing && post) {
      // Check if user is the author
      if (user && post.user_id !== user.id) {
        navigate('/');
        return;
      }
      setTitle(post.title);
      setContent(post.content);
    }
  }, [isEditing, post, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      setFormError('请输入文章内容');
      return;
    }

    try {
      if (isEditing) {
        await updatePost(id, { title, content });
        navigate(`/posts/${id}`);
      } else {
        const response = await createPost({ title, content });
        navigate(`/posts/${response.data.id}`);
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  if (isEditing && postLoading) {
    return <LoadingSpinner text="加载文章中..." />;
  }

  if (isEditing && postError) {
    return <ErrorMessage message={postError} />;
  }

  if (isEditing && post && user && post.user_id !== user.id) {
    return (
      <div className="text-center py-16">
        <h2 className="font-display text-2xl text-ink-800 mb-4">无权编辑</h2>
        <p className="text-ink-600 mb-6">你只能编辑自己的文章</p>
        <Link to="/" className="btn-primary">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link 
          to={isEditing ? `/posts/${id}` : '/'} 
          className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-700 
                     transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          取消
        </Link>
        
        <h1 className="font-display text-2xl text-ink-800">
          {isEditing ? '编辑文章' : '撰写新文章'}
        </h1>
        
        <div className="w-16" /> {/* Spacer for centering */}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
        {/* Error Message */}
        {(formError || error) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-sm text-red-700">
            {formError || error}
          </div>
        )}

        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="w-full px-0 py-4 bg-transparent border-0 border-b-2 border-ink-200
                     text-3xl font-display text-ink-900 placeholder:text-ink-300
                     focus:outline-none focus:border-ink-500 transition-colors"
            autoFocus
          />
        </div>

        {/* Content */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="开始写作..."
            className="w-full min-h-[400px] px-0 py-4 bg-transparent border-0 resize-y
                     text-lg text-ink-700 placeholder:text-ink-300 leading-relaxed
                     focus:outline-none"
          />
        </div>

        {/* Character Count & Submit */}
        <div className="flex items-center justify-between pt-6 border-t border-ink-200/60">
          <span className="text-sm text-ink-500">
            {content.length} 字
          </span>
          
          <div className="flex items-center gap-4">
            <Link 
              to={isEditing ? `/posts/${id}` : '/'} 
              className="btn-ghost"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading || !title.trim() || !content.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-paper-200 border-t-transparent 
                                 rounded-full animate-spin" />
                  {isEditing ? '保存中...' : '发布中...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {isEditing ? '保存修改' : '发布文章'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Writing Tips */}
      <div className="mt-12 p-6 bg-ink-50/50 border border-ink-200/60 rounded-sm">
        <h3 className="font-display text-lg text-ink-800 mb-3">写作小贴士</h3>
        <ul className="text-sm text-ink-600 space-y-2">
          <li>• 一个好的标题能吸引更多读者</li>
          <li>• 段落不宜过长，适当分段让文章更易读</li>
          <li>• 表达清晰，言之有物</li>
        </ul>
      </div>
    </div>
  );
}
