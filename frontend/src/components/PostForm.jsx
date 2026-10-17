import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';

const PostForm = () => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/posts', { content }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setContent('');
      // In a real app, we would refresh the posts list via context or state
      // For simplicity, we'll rely on the parent component to refetch
      window.dispatchEvent(new Event('postCreated'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="post-content" className="block text-sm font-medium text-gray-700">
          What's happening?
        </label>
        <textarea
          id="post-content"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={loading}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            loading ? 'opacity-50' : ''
          }`}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
};

export default PostForm;