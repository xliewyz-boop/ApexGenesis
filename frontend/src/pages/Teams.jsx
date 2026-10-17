import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function Teams() {
  const { user, isAdmin } = useAuth();
  const [teams, setTeams] = useState([]);
  const [memberships, setMemberships] = useState(new Set());
  const [form, setForm] = useState({ name: '', tag: '', description: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const [teamRes, memberRes] = await Promise.all([
      supabase.from('teams').select('id,name,tag,description,owner_id,created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('team_members').select('team_id').eq('user_id', user.id),
    ]);
    if (teamRes.error || memberRes.error) setError((teamRes.error || memberRes.error).message);
    setTeams(teamRes.data ?? []);
    setMemberships(new Set((memberRes.data ?? []).map(item => item.team_id)));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const createTeam = async event => {
    event.preventDefault();
    if (!isAdmin || !supabase || !user || busy) return;
    setBusy(true); setError('');
    try {
      const { error: createError } = await supabase.from('teams').insert({
        name: form.name.trim(), tag: form.tag.trim().toUpperCase(), description: form.description.trim(), owner_id: user.id,
      });
      if (createError) throw createError;
      setForm({ name: '', tag: '', description: '' });
      await load();
    } catch (e) { setError(e.message || 'Takım oluşturulamadı.'); }
    finally { setBusy(false); }
  };

  const toggleMembership = async team => {
    if (!supabase || !user || busy) return;
    setBusy(true); setError('');
    try {
      const result = memberships.has(team.id)
        ? await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', user.id)
        : await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id });
      if (result.error) throw result.error;
      await load();
    } catch (e) { setError(e.message || 'Takım üyeliği güncellenemedi.'); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Squads & Esports</p>
    <h1 className="mt-2 text-3xl font-black">Takımlar</h1>
    <p className="mt-2 text-slate-400">Topluluğun takımlarını keşfet ve katıl. Takım oluşturma yetkisi yalnızca Admin ve Owner rollerindedir.</p>
    {isAdmin && <form onSubmit={createTeam} className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-3">
      <input required minLength={2} maxLength={50} placeholder="Takım adı" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="rounded-lg border border-slate-700 bg-slate-950 p-3"/>
      <input maxLength={8} placeholder="Etiket (örn. APX)" value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})} className="rounded-lg border border-slate-700 bg-slate-950 p-3"/>
      <button disabled={busy} className="rounded-lg bg-indigo-500 p-3 font-bold hover:bg-indigo-400 disabled:opacity-50">{busy?'Kaydediliyor…':'Takım oluştur'}</button>
      <textarea maxLength={1000} placeholder="Takım açıklaması (isteğe bağlı)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="rounded-lg border border-slate-700 bg-slate-950 p-3 md:col-span-3"/>
    </form>}
    {!isAdmin && <p className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">Üye hesabıyla takımlara katılabilir veya ayrılabilirsin. Yeni takım oluşturmak için Admin ya da Owner yetkisi gerekir.</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
    <div className="mt-6 grid gap-4 md:grid-cols-2">{teams.map(team=><article key={team.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-indigo-300">{team.tag || 'TEAM'}</p><h2 className="mt-1 text-xl font-bold">{team.name}</h2></div><span className="rounded-full bg-slate-800 px-3 py-1 text-xs">{team.owner_id===user.id?'Sahibisin':memberships.has(team.id)?'Üyesin':'Açık takım'}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-400">{team.description || 'Açıklama eklenmemiş.'}</p>{team.owner_id!==user.id && <button disabled={busy} onClick={()=>toggleMembership(team)} className="mt-4 rounded-lg border border-indigo-400 px-4 py-2 text-sm font-semibold hover:bg-indigo-500/20 disabled:opacity-50">{memberships.has(team.id)?'Takımdan ayrıl':'Takıma katıl'}</button>}</article>)}</div>
    {!teams.length && !error && <p className="mt-8 text-center text-slate-400">Henüz takım yok.</p>}
  </div></main>;
}
