import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function Tournaments() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [registered, setRegistered] = useState(new Set());
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const [eventRes, participantRes] = await Promise.all([
      supabase.from('tournaments').select('*').neq('status','draft').order('starts_at', { ascending: true, nullsFirst: false }),
      supabase.from('tournament_participants').select('tournament_id').eq('user_id', user.id),
    ]);
    if (eventRes.error || participantRes.error) setError((eventRes.error || participantRes.error).message);
    setEvents(eventRes.data ?? []);
    setRegistered(new Set((participantRes.data ?? []).map(item=>item.tournament_id)));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const toggle = async event => {
    setBusyId(event.id); setError('');
    const result = registered.has(event.id)
      ? await supabase.from('tournament_participants').delete().eq('tournament_id',event.id).eq('user_id',user.id)
      : await supabase.from('tournament_participants').insert({tournament_id:event.id,user_id:user.id});
    if (result.error) setError(result.error.message);
    await load();
    setBusyId('');
  };

  const label = status => ({upcoming:'Yaklaşan',live:'Canlı',completed:'Tamamlandı',cancelled:'İptal'}[status] || status);
  return <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Competitive</p><h1 className="mt-2 text-3xl font-black">Turnuvalar</h1><p className="mt-2 text-slate-400">Etkinlikleri görüntüle ve yaklaşan turnuvalara kaydol.</p>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
    <div className="mt-6 grid gap-4 md:grid-cols-2">{events.map(event=><article key={event.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{event.name}</h2><span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-200">{label(event.status)}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">{event.description || 'Turnuva detayları yakında.'}</p><div className="mt-4 space-y-1 text-sm text-slate-400"><p>Başlangıç: {event.starts_at ? new Date(event.starts_at).toLocaleString() : 'Henüz belirlenmedi'}</p><p>Katılımcı limiti: {event.max_participants}</p></div>{event.status==='upcoming' && <button disabled={busyId===event.id} onClick={()=>toggle(event)} className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-400 disabled:opacity-50">{busyId===event.id?'İşleniyor…':registered.has(event.id)?'Kaydı iptal et':'Turnuvaya kaydol'}</button>}</article>)}</div>
    {!events.length && <p className="mt-8 rounded-xl border border-slate-800 p-8 text-center text-slate-400">Henüz turnuva yayınlanmadı. Yönetici Supabase panelinden turnuva ekleyebilir.</p>}
  </div></div>;
}
