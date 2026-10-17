import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import axios from 'axios';

const PostItem = ({ post }) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [followerCount, setFollowerCount] = React.useState(0);

  React.useEffect(() => {
    const fetchFollowerCount = async () => {
      try {
        const res = await axios.get(`/api/posts/user/${post.user_id}/followers`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setFollowerCount(res.data.length);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) {
      fetchFollowerCount();
    }
  }, [user, post.user_id]);

  React.useEffect(() => {
    const checkIfFollowing = async () => {
      if (!user) return;
      try {
        const res = await axios.get(`/api/users/${post.user_id}/following`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const isFollowing = res.data.some(follower => follower.id === user.id);
        setIsFollowing(isFollowing);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) {
      checkIfFollowing();
    }
  }, [user, post.user_id]);

  const handleFollow = async () => {
    if (!user) return;
    try {
      await axios.post(`/api/follow/${post.user_id}`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setIsFollowing(true);
      // Update follower count optimistically
      setFollowerCount(followerCount + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnfollow = async () => {
    if (!user) return;
    try {
      await axios.delete(`/api/follow/${post.user_id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setIsFollowing(false);
      setFollowerCount(followerCount - 1);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <img
            src="https://via.placeholder.com/40"
            alt=""
            className="h-10 w-10 rounded-full"
          />
        </div>
        <div>
          <div className="flex items-baseline space-x-2 mb-1">
            <span className="font-medium text-gray-900">{post.username}</span>
            <span className="text-sm text-gray-500">
              {new Date(post.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-gray-700">{post.content}</p>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            <button
              onClick={isFollowing ? handleUnfollow : handleFollow}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                isFollowing
                  ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                  : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            <span>Followers: {followerCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostItem;