import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import tracks from '../data/rank-training.json';

const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Training() {
  const { user } = useAuth();
  const [rank, setRank] = useState('GOLD');
  const [completed, setCompleted] = useState(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const track = useMemo(() => tracks.find(item => item.rank === rank) || tracks[0], [rank]);

  const loadProgress = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error: queryError } = await supabase.from('training_progress').select('lesson_id').eq('user_id', user.id);
    if (queryError) setError(queryError.message);
    else setCompleted(new Set((data ?? []).map(item => item.lesson_id)));
  }, [user?.id]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const toggleLesson = async (_lesson, index) => {
    if (!supabase || !user) return;
    const id = slug(rank) + '-' + (index + 1);
    setBusy(id); setError('');
    const result = completed.has(id)
      ? await supabase.from('training_progress').delete().eq('user_id', user.id).eq('lesson_id', id)
      : await supabase.from('training_progress').insert({ user_id: user.id, lesson_id: id, rank });
    if (result.error) setError(result.error.message);
    else setCompleted(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setBusy('');
  };

  const total = tracks.reduce((sum, item) => sum + item.lessons.length, 0);
  const finished = completed.size;
  return <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Rocket League improvement</p><h1 className="mt-2 text-3xl font-black">Training Academy</h1><p className="mt-2 text-slate-400">Rankine uygun antrenmanlar, net adımlar ve video aramaları. Tamamlanma durumun hesabınla senkronize edilir.</p>
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-semibold">Genel ilerleme</span><span className="text-sm text-slate-400">{finished}/{total} ders</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-indigo-400 transition-all" style={{width: (finished/total*100)+'%'}} /></div></div>
    <div className="mt-6 flex flex-wrap gap-2">{tracks.map(item=><button key={item.rank} onClick={()=>setRank(item.rank)} className={'rounded-xl border px-4 py-2 text-sm font-bold '+(rank===item.rank?'border-indigo-400 bg-indigo-500 text-white':'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500')}>{item.rank}</button>)}</div>
    <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-2xl font-black" style={{color:track.color}}>{track.rank}</h2><p className="mt-2 text-slate-300">{track.summary}</p><div className="mt-5 space-y-4">{track.lessons.map((lesson,index)=>{const id=slug(rank)+'-'+(index+1); const done=completed.has(id); return <article key={id} className="rounded-xl border border-slate-800 bg-slate-950 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ders {index+1} · {lesson.duration}</p><h3 className="mt-1 text-lg font-bold">{lesson.title}</h3><p className="mt-1 text-sm text-slate-400">{lesson.focus}</p></div><button disabled={busy===id} onClick={()=>toggleLesson(lesson,index)} className={'rounded-lg px-3 py-2 text-sm font-bold '+(done?'bg-emerald-500/15 text-emerald-200':'bg-indigo-500 text-white')}>{busy===id?'Kaydediliyor…':done?'✓ Tamamlandı':'Tamamlandı olarak işaretle'}</button></div><h4 className="mt-4 text-sm font-bold text-slate-200">Uygulama adımları</h4><ol className="mt-2 list-inside list-decimal space-y-1 text-sm leading-6 text-slate-300">{lesson.steps.map(step=><li key={step}>{step}</li>)}</ol><h4 className="mt-4 text-sm font-bold text-slate-200">Kaçınman gerekenler</h4><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-400">{lesson.mistakes.map(mistake=><li key={mistake}>{mistake}</li>)}</ul><a className="mt-4 inline-flex text-sm font-bold text-indigo-300 underline underline-offset-4 hover:text-indigo-200" href={'https://www.youtube.com/results?search_query='+encodeURIComponent(lesson.videoSearch)} target="_blank" rel="noreferrer">YouTube video araması ↗</a></article>})}</div></section>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
  </div></div>;
}

[executed on device: WIN-JS1MMJ6G3LN (47b38491-93fe-4329-b37c-d57703e8bb81)]