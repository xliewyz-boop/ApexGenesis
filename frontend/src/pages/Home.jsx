import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';
import PostForm from '../components/PostForm.jsx';
import PostItem from '../components/PostItem.jsx';

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get('/api/posts', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setPosts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPosts();
    }
  }, [user]);

  // Listen for post creation event to refresh posts
  useEffect(() => {
    const handlePostCreated = () => {
      if (user) {
        setLoading(true);
        fetchPosts();
      }
    };
    window.addEventListener('postCreated', handlePostCreated);
    return () => window.removeEventListener('postCreated', handlePostCreated);
  }, [user]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center py-12">Please log in to see the feed.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Home Feed</h1>
        <PostForm />
        <div className="mt-6 space-y-4">
          {posts.length > 0 ? (
            posts.map(post => <PostItem key={post.id} post={post} />)
          ) : (
            <p className="text-center text-gray-500 py-8">No posts yet. Be the first to share!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;