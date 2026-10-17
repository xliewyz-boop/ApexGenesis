import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import PostItem from '../components/PostItem.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [form, setForm] = useState({ username: '', display_name: '', bio: '', rocket_league_rank: 'Unranked' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !user) { setLoading(false); return; }
      const [profileRes, postsRes, followersRes, followingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('posts').select('id,user_id,content,created_at,profiles(username,display_name,avatar_url)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      ]);
      if (!active) return;
      if (profileRes.data) {
        setProfile(profileRes.data);
        setForm({ username: profileRes.data.username || '', display_name: profileRes.data.display_name || '', bio: profileRes.data.bio || '', rocket_league_rank: profileRes.data.rocket_league_rank || 'Unranked' });
      }
      setPosts(postsRes.data ?? []);
      setFollowers(followersRes.count ?? 0);
      setFollowing(followingRes.count ?? 0);
      const firstError = profileRes.error || postsRes.error || followersRes.error || followingRes.error;
      if (firstError) setMessage(firstError.message);
      setLoading(false);
    }
    load().catch(err => { setMessage(err.message); setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!supabase || !user) return;
    setSaving(true); setMessage('');
    const { data, error } = await supabase.from('profiles').update({
      username: form.username.trim().toLowerCase(),
      display_name: form.display_name.trim(),
      bio: form.bio.trim(),
      rocket_league_rank: form.rocket_league_rank,
    }).eq('id', user.id).select().single();
    if (error) setMessage(error.message);
    else { setProfile(data); setMessage('Profil kaydedildi.'); }
    setSaving(false);
  };

  if (loading) return <p className="p-10 text-center text-slate-300">Profil yükleniyor…</p>;
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Oyuncu profili</p>
          <h1 className="mt-2 text-3xl font-black">{profile?.display_name || profile?.username || user?.email}</h1>
          <div className="mt-4 flex gap-6 text-sm text-slate-400"><span><b className="text-white">{followers}</b> takipçi</span><span><b className="text-white">{following}</b> takip</span><span><b className="text-white">{posts.length}</b> paylaşım</span></div>
          <form onSubmit={saveProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">Kullanıcı adı<input required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]+" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" /></label>
            <label className="text-sm text-slate-300">Görünen ad<input maxLength={60} value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" /></label>
            <label className="text-sm text-slate-300 sm:col-span-2">Hakkında<textarea rows={3} maxLength={280} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" /></label>
            <label className="text-sm text-slate-300 sm:col-span-2">Rocket League rank<select value={form.rocket_league_rank} onChange={e => setForm({ ...form, rocket_league_rank: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white">{['Unranked','Bronze','Silver','Gold','Platinum','Diamond','Champion','Grand Champion','SSL'].map(rank => <option key={rank}>{rank}</option>)}</select></label>
            <button disabled={saving} className="rounded-xl bg-indigo-500 px-5 py-3 font-bold hover:bg-indigo-400 disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Profili kaydet'}</button>
          </form>
          {message && <p role="status" className="mt-3 text-sm text-indigo-200">{message}</p>}
        </div>
        <h2 className="mb-4 mt-8 text-xl font-bold">Paylaşımlarım</h2>
        <div className="space-y-4">{posts.length ? posts.map(post => <PostItem key={post.id} post={post} />) : <p className="rounded-xl border border-slate-800 p-6 text-slate-400">Henüz paylaşım yapmadın.</p>}</div>
      </div>
    </div>
  );
}

[executed on device: WIN-JS1MMJ6G3LN (47b38491-93fe-4329-b37c-d57703e8bb81)]