import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';
import PostItem from '../components/PostItem.jsx';

const Profile = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user's posts
        const postsRes = await axios.get(`/api/posts/user/${user.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setPosts(postsRes.data);

        // Fetch follower count
        const followersRes = await axios.get(`/api/users/${user.id}/followers`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setFollowerCount(followersRes.data.length);

        // Fetch following count
        const followingRes = await axios.get(`/api/users/${user.id}/following`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setFollowingCount(followingRes.data.length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center py-12">Please log in to view your profile.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">{user.username}'s Profile</h1>
        <div className="flex items-center space-x-6 mb-6">
          <div className="flex-1">
            <p className="text-gray-600">Email: {user.email}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{followerCount}</p>
            <p className="text-gray-600 text-sm">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-semibold">{followingCount}</p>
            <p className="text-gray-600 text-sm">Following</p>
          </div>
        </div>
        <h2 className="text-xl font-bold mb-2">Your Posts</h2>
        {posts.length > 0 ? (
          posts.map(post => <PostItem key={post.id} post={{ ...post, username: user.username }} />)
        ) : (
          <p className="text-center text-gray-500 py-8">You haven't posted anything yet.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;