import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function PostItem({ post, onChanged }) {
  const { user } = useAuth();
  const profile = post.profiles ?? {};
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadFollowState() {
      if (!supabase || !post.user_id) return;
      const [countResult, followResult] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', post.user_id),
        user && user.id !== post.user_id
          ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', post.user_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!active) return;
      setFollowers(countResult.count ?? 0);
      setFollowing(Boolean(followResult.data));
    }
    loadFollowState().catch(err => setError(err.message));
    return () => { active = false; };
  }, [user?.id, post.user_id]);

  const toggleFollow = async () => {
    if (!supabase || !user || user.id === post.user_id) return;
    setBusy(true); setError('');
    const result = following
      ? await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', post.user_id)
      : await supabase.from('follows').insert({ follower_id: user.id, following_id: post.user_id });
    if (result.error) setError(result.error.message);
    else {
      setFollowing(!following);
      setFollowers(value => Math.max(0, value + (following ? -1 : 1)));
      onChanged?.();
    }
    setBusy(false);
  };

  const deletePost = async () => {
    if (!supabase || !user || user.id !== post.user_id || !window.confirm('Bu paylaşım silinsin mi?')) return;
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', user.id);
    if (deleteError) setError(deleteError.message);
    else onChanged?.();
  };

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/20 font-black text-indigo-200">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile.display_name || profile.username || 'P').slice(0,1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="font-bold text-white">{profile.display_name || profile.username || 'Oyuncu'}</span><span className="text-sm text-slate-500">@{profile.username || 'player'}</span><time className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</time></div>
          <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-200">{post.content}</p>
          <div className="mt-4 flex items-center gap-3">
            {user?.id !== post.user_id && <button disabled={busy} onClick={toggleFollow} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:border-indigo-400 disabled:opacity-50">{following ? 'Takibi bırak' : 'Takip et'}</button>}
            <span className="text-sm text-slate-500">{followers} takipçi</span>
            {user?.id === post.user_id && <button onClick={deletePost} className="ml-auto text-sm text-red-300 hover:text-red-200">Sil</button>}
          </div>
          {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </article>
  );
}

[executed on device: WIN-JS1MMJ6G3LN (47b38491-93fe-4329-b37c-d57703e8bb81)]