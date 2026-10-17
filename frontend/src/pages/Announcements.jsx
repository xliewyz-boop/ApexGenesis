import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error: queryError } = await supabase.from('announcements').select('id,title,body,is_pinned,created_at').eq('is_published',true).order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(50);
      if (!active) return;
      if (queryError) setError(queryError.message); else setItems(data ?? []);
    }
    if (supabase) load();
    return () => { active = false; };
  }, []);
  return <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Apex Genesis</p><h1 className="mt-2 text-3xl font-black">Duyurular</h1>{error && <p className="mt-4 text-red-300">{error}</p>}<div className="mt-6 space-y-4">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">{item.is_pinned && <p className="text-xs font-bold uppercase text-amber-300">Sabitlenmiş</p>}<h2 className="mt-1 text-xl font-bold">{item.title}</h2><time className="mt-1 block text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time><p className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">{item.body}</p></article>)}{!items.length&&!error&&<p className="rounded-xl border border-slate-800 p-8 text-center text-slate-400">Şimdilik duyuru yok.</p>}</div></div></div>;
}
