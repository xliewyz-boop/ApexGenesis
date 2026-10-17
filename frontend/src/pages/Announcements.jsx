import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setError('Supabase bağlantısı yapılandırılmamış.'); setLoading(false); return; }
      const { data, error: queryError } = await supabase.from('announcements')
        .select('id,title,body,image_url,is_pinned,created_at')
        .eq('is_published',true).order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(50);
      if (!active) return;
      if (queryError) setError(queryError.message); else setItems(data ?? []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);
  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-4xl">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Apex Genesis</p><h1 className="mt-2 text-3xl font-black">Duyurular ve güncellemeler</h1><p className="mt-2 text-slate-400">Topluluk haberleri ve yönetici güncellemeleri.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-950 p-3 text-red-200">{error}</p>}
    <div className="mt-6 grid gap-4">{items.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">{item.image_url&&/^https?:\/\//i.test(item.image_url)&&<img src={item.image_url} alt="" loading="lazy" decoding="async" className="max-h-80 w-full object-cover"/>}<div className="p-5">{item.is_pinned&&<p className="text-xs font-bold uppercase text-amber-300">Sabitlenmiş</p>}<h2 className="mt-1 text-xl font-bold">{item.title}</h2><time className="mt-1 block text-xs text-slate-500">{new Date(item.created_at).toLocaleString('tr-TR')}</time><p className="mt-4 whitespace-pre-wrap leading-7 text-slate-300">{item.body}</p></div></article>)}{loading&&<p className="rounded-xl border border-slate-800 p-8 text-center text-slate-400">Duyurular yükleniyor…</p>}{!loading&&!items.length&&!error&&<p className="rounded-xl border border-slate-800 p-8 text-center text-slate-400">Şimdilik duyuru yok.</p>}</div>
  </div></main>;
}
