import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function PostForm({ onCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!supabase || !user) return;
    const clean = content.trim();
    if (!clean || clean.length > 2000) {
      setError('Paylaşım 1–2000 karakter arasında olmalı.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: insertError } = await supabase.from('posts').insert({ user_id: user.id, content: clean });
    if (insertError) setError(insertError.message);
    else {
      setContent('');
      await onCreated?.();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <label htmlFor="post-content" className="mb-3 block text-sm font-semibold text-slate-200">Aklında ne var?</label>
      <textarea id="post-content" rows={4} maxLength={2000} value={content} onChange={e => setContent(e.target.value)} placeholder="GG, antrenman notları, takım duyurusu…" className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500" disabled={loading} />
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
      <div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">{content.length}/2000</span><button type="submit" disabled={loading || !content.trim()} className="rounded-xl bg-indigo-500 px-5 py-2.5 font-bold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Paylaşılıyor…' : 'Paylaş'}</button></div>
    </form>
  );
}
