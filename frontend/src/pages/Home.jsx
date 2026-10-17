import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import PostForm from '../components/PostForm.jsx';
import PostItem from '../components/PostItem.jsx';

export default function Home() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async () => {
    if (!supabase) return;
    setError('');
    const { data, error: queryError } = await supabase
      .from('posts')
      .select('id,user_id,content,created_at,profiles(username,display_name,avatar_url)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (queryError) setError(queryError.message);
    else setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => {
    if (!supabase) return undefined;
    const channel = supabase.channel('public-posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  if (!user) return <p className="p-8 text-center">Lütfen giriş yap.</p>;
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[.25em] text-indigo-300">Apex Genesis Community</p>
          <h1 className="mt-2 text-3xl font-black">Topluluk akışı</h1>
          <p className="mt-2 text-slate-400">Takım arkadaşlarınla paylaş, oyuncuları takip et ve toplulukla bağlantıda kal.</p>
        </header>
        <PostForm onCreated={fetchPosts} />
        {error && <p role="alert" className="my-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">Veriler yüklenemedi: {error}. Migration dosyasının Supabase SQL Editor'da çalıştırıldığını kontrol et.</p>}
        <div className="mt-6 space-y-4">
          {loading ? <p className="py-8 text-center text-slate-400">Akış yükleniyor…</p>
            : posts.length ? posts.map(post => <PostItem key={post.id} post={post} onChanged={fetchPosts} />)
            : <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"><h2 className="text-xl font-bold">Henüz paylaşım yok</h2><p className="mt-2 text-slate-400">İlk paylaşımı sen yap.</p></div>}
        </div>
      </div>
    </div>
  );
}
