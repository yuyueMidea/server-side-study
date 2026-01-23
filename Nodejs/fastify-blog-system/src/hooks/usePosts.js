import { useState, useEffect, useCallback } from 'react';
import { postsApi, commentsApi } from '../utils/api';

export function usePosts(page = 1, limit = 10) {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await postsApi.getAll(page, limit);
      setPosts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, pagination, loading, error, refetch: fetchPosts };
}

export function usePost(id) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await postsApi.getById(id);
      setPost(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return { post, loading, error, refetch: fetchPost };
}

export function useComments(postId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await commentsApi.getByPost(postId);
      setComments(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (content) => {
    const response = await commentsApi.create(postId, content);
    setComments(prev => [response.data, ...prev]);
    return response;
  };

  return { comments, loading, error, refetch: fetchComments, addComment };
}

export function usePostMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPost = async (postData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await postsApi.create(postData);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePost = async (id, postData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await postsApi.update(id, postData);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await postsApi.delete(id);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createPost, updatePost, deletePost, loading, error };
}
