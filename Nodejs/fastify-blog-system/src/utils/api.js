const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error', 0);
  }
}

// Auth API
export const authApi = {
  register: (userData) => request('/auth/register', {
    method: 'POST',
    body: userData,
  }),
  
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: credentials,
  }),
  
  getProfile: () => request('/profile'),
};

// Posts API
export const postsApi = {
  getAll: (page = 1, limit = 10) => 
    request(`/posts?page=${page}&limit=${limit}`),
  
  getById: (id) => request(`/posts/${id}`),
  
  create: (postData) => request('/posts', {
    method: 'POST',
    body: postData,
  }),
  
  update: (id, postData) => request(`/posts/${id}`, {
    method: 'PUT',
    body: postData,
  }),
  
  delete: (id) => request(`/posts/${id}`, {
    method: 'DELETE',
  }),
};

// Comments API
export const commentsApi = {
  getByPost: (postId) => request(`/comments/post/${postId}`),
  
  create: (postId, content) => request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content },
  }),
};

// Health check
export const healthCheck = () => fetch('/health').then(res => res.json());

export { ApiError };
