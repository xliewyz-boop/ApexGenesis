import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-500';
export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title:'', body:'', name:'', description:'', starts_at:'', max_participants:16, price:0, item_type:'cosmetic' });
  const [wallet, setWallet] = useState({ email:'', amount:100, reason:'Community reward' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    const [a,t,s] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at',{ascending:false}),
      supabase.from('tournaments').select('*').order('created_at',{ascending:false}),
      supabase.from('shop_items').select('*').order('created_at',{ascending:false}),
    ]);
    const e = a.error || t.error || s.error;
    if (e) setError(e.message);
    setAnnouncements(a.data ?? []); setTournaments(t.data ?? []); setItems(s.data ?? []);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-200"><h1 className="text-2xl font-black">Yönetici erişimi gerekli</h1><p className="mx-auto mt-3 max-w-xl text-slate-400">Bu hesapta sunucu tarafında yönetici rolü bulunamadı. Rolü yalnızca Supabase SQL Editor üzerinden güvenilir hesaplara ver.</p></div>;

  const run = async action => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); await load(); }
    catch (e) { setError(e.message || 'İşlem başarısız.'); }
    finally { setBusy(false); }
  };

  const saveAnnouncement = e => {
    e.preventDefault();
    run(async () => {
      const { error: e } = await supabase.from('announcements').insert({ title:form.title.trim(), body:form.body.trim(), is_published:true, created_by:user.id });
      if (e) throw e;
      setForm(v=>({...v,title:'',body:''})); setMessage('Duyuru yayınlandı.');
    });
  };
  const saveTournament = e => {
    e.preventDefault();
    run(async () => {
      const { error:e } = await supabase.from('tournaments').insert({ name:form.name.trim(), description:form.description.trim(), starts_at:form.starts_at ? new Date(form.starts_at).toISOString() : null, max_participants:Number(form.max_participants), status:'upcoming', created_by:user.id });
      if (e) throw e;
      setForm(v=>({...v,name:'',description:'',starts_at:''})); setMessage('Turnuva oluşturuldu.');
    });
  };
  const saveItem = e => {
    e.preventDefault();
    run(async () => {
      const { error:e } = await supabase.from('shop_items').insert({ name:form.name.trim(), description:form.description.trim(), price:Number(form.price), item_type:form.item_type, is_active:true });
      if (e) throw e;
      setForm(v=>({...v,name:'',description:'',price:0})); setMessage('Mağaza ürünü oluşturuldu.');
    });
  };
  const toggleAnnouncement = item => run(async()=>{
    const { error:e } = await supabase.from('announcements').update({is_published:!item.is_published}).eq('id',item.id);
    if(e) throw e; setMessage('Duyuru durumu güncellendi.');
  });
  const toggleItem = item => run(async()=>{
    const { error:e } = await supabase.from('shop_items').update({is_active:!item.is_active}).eq('id',item.id);
    if(e) throw e; setMessage('Ürün durumu güncellendi.');
  });
  const awardWallet = e => {
    e.preventDefault();
    run(async()=>{
      const { data:profile, error:lookupError } = await supabase.from('profiles').select('id,username').eq('username',wallet.email.trim().toLowerCase()).maybeSingle();
      if(lookupError) throw lookupError;
      if(!profile) throw new Error('Bu kullanıcı adına ait profil bulunamadı.');
      const { error:awardError } = await supabase.rpc('admin_adjust_wallet',{p_user_id:profile.id,p_amount:Number(wallet.amount),p_reason:wallet.reason.trim()});
      if(awardError) throw awardError;
      setMessage('Genesis Coin işlemi tamamlandı: @'+profile.username);
    });
  };

  const tabs=[['announcements','Duyurular'],['tournaments','Turnuvalar'],['shop','Mağaza'],['wallet','Coin işlemi']];
  return <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">Restricted / Server role verified</p><h1 className="mt-2 text-3xl font-black">Yönetim merkezi</h1><p className="mt-2 text-slate-400">İşlemler Supabase Row Level Security ve yönetici rolüyle doğrulanır.</p>
    <div className="mt-6 flex flex-wrap gap-2">{tabs.map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={'rounded-lg px-4 py-2 font-semibold '+(tab===key?'bg-indigo-500 text-white':'border border-slate-700 bg-slate-900 text-slate-300')}>{label}</button>)}</div>
    {error&&<p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}{message&&<p role="status" className="mt-4 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{message}</p>}
    {tab==='announcements'&&<section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Duyuru yayınla</h2><form onSubmit={saveAnnouncement} className="mt-4 grid gap-3"><input required maxLength={160} placeholder="Duyuru başlığı" className={fieldClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><textarea required maxLength={10000} rows={5} placeholder="Duyuru metni" className={fieldClass} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/><button disabled={busy} className="w-fit rounded-lg bg-indigo-500 px-4 py-2 font-bold disabled:opacity-50">{busy?'İşleniyor…':'Yayınla'}</button></form><div className="mt-6 space-y-3">{announcements.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-slate-400">{item.is_published?'Yayında':'Taslak / gizli'}</p></div><button disabled={busy} onClick={()=>toggleAnnouncement(item)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{item.is_published?'Gizle':'Yayınla'}</button></div>)}</div></section>}
    {tab==='tournaments'&&<section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Turnuva oluştur</h2><form onSubmit={saveTournament} className="mt-4 grid gap-3 md:grid-cols-2"><input required minLength={3} maxLength={100} placeholder="Turnuva adı" className={fieldClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input type="datetime-local" className={fieldClass} value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/><textarea maxLength={3000} placeholder="Açıklama" className={fieldClass+' md:col-span-2'} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><label className="text-sm text-slate-400">Maksimum katılımcı<input type="number" min="2" max="512" required className={fieldClass+' mt-1'} value={form.max_participants} onChange={e=>setForm({...form,max_participants:e.target.value})}/></label><button disabled={busy} className="self-end rounded-lg bg-indigo-500 px-4 py-3 font-bold disabled:opacity-50">Turnuva oluştur</button></form><div className="mt-6 space-y-3">{tournaments.map(item=><div key={item.id} className="rounded-xl border border-slate-800 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{item.name}</h3><select aria-label="Turnuva durumu" value={item.status} onChange={e=>run(async()=>{const {error}=await supabase.from('tournaments').update({status:e.target.value}).eq('id',item.id);if(error)throw error;})} className="rounded-lg border border-slate-700 bg-slate-950 p-2">{['draft','upcoming','live','completed','cancelled'].map(s=><option key={s}>{s}</option>)}</select></div></div>)}</div></section>}
    {tab==='shop'&&<section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Mağaza ürünü ekle</h2><form onSubmit={saveItem} className="mt-4 grid gap-3 md:grid-cols-2"><input required minLength={2} maxLength={100} placeholder="Ürün adı" className={fieldClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><select value={form.item_type} onChange={e=>setForm({...form,item_type:e.target.value})} className={fieldClass}>{['cosmetic','badge','title','avatar','other'].map(t=><option key={t}>{t}</option>)}</select><input required type="number" min="0" placeholder="Fiyat (GC)" className={fieldClass} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><textarea maxLength={1000} placeholder="Açıklama" className={fieldClass} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><button disabled={busy} className="w-fit rounded-lg bg-indigo-500 px-4 py-2 font-bold">Ürünü ekle</button></form><div className="mt-6 space-y-3">{items.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"><div><h3 className="font-bold">{item.name}</h3><p className="text-sm text-slate-400">{item.price} GC · {item.is_active?'Aktif':'Gizli'}</p></div><button disabled={busy} onClick={()=>toggleItem(item)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{item.is_active?'Gizle':'Aktifleştir'}</button></div>)}</div></section>}
    {tab==='wallet'&&<section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Genesis Coin defteri</h2><p className="mt-2 text-sm text-slate-400">Kullanıcı adı, pozitif ödül veya negatif düzeltme ve denetlenebilir işlem nedeni gir.</p><form onSubmit={awardWallet} className="mt-4 grid gap-3 md:grid-cols-2"><input required placeholder="Kullanıcı adı" className={fieldClass} value={wallet.email} onChange={e=>setWallet({...wallet,email:e.target.value})}/><input required type="number" min="-100000" max="100000" step="1" value={wallet.amount} className={fieldClass} onChange={e=>setWallet({...wallet,amount:e.target.value})}/><input required minLength={2} maxLength={120} placeholder="İşlem nedeni" className={fieldClass+' md:col-span-2'} value={wallet.reason} onChange={e=>setWallet({...wallet,reason:e.target.value})}/><button disabled={busy||Number(wallet.amount)===0} className="w-fit rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950">İşlemi kaydet</button></form></section>}
  </div></div>;
}
