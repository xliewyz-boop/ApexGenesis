import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

const fieldClass = 'w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-500';
const ranks = ['Unranked','Bronze','Silver','Gold','Platinum','Diamond','Champion','Grand Champion','SSL'];
const roles = ['admin','owner'];
const stamp = value => value ? new Date(value).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}) : '';

export default function Admin() {
  const { user, isAdmin, isOwner, role } = useAuth();
  const [tab, setTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [staffRoles, setStaffRoles] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ticketReply, setTicketReply] = useState('');
  const [roleUsername, setRoleUsername] = useState('');
  const [roleChoice, setRoleChoice] = useState('admin');
  const [form, setForm] = useState({ title:'', body:'', image_url:'', name:'', description:'', starts_at:'', max_participants:16, price:0, item_type:'cosmetic' });
  const [wallet, setWallet] = useState({ username:'', amount:100, reason:'Community reward' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !isAdmin) return;
    const [a,t,s,p,q,r] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('tournaments').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('shop_items').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('profiles').select('id,username,display_name,rocket_league_rank,created_at').order('username').limit(500),
      supabase.from('support_tickets').select('id,user_id,subject,category,status,priority,assigned_to,created_at,updated_at').order('updated_at',{ascending:false}).limit(100),
      supabase.from('user_roles').select('user_id,role,created_at').order('created_at',{ascending:false}).limit(100),
    ]);
    const e = a.error || t.error || s.error || p.error || q.error || r.error;
    if (e) setError(e.message);
    setAnnouncements(a.data ?? []); setTournaments(t.data ?? []); setItems(s.data ?? []);
    setProfiles(p.data ?? []); setTickets(q.data ?? []); setStaffRoles(r.data ?? []);
    if (activeTicket) setActiveTicket((q.data ?? []).find(item=>item.id===activeTicket.id) ?? null);
  }, [isAdmin, activeTicket?.id]);

  const loadMessages = useCallback(async () => {
    if (!activeTicket || !supabase) { setMessages([]); return; }
    const { data, error:e } = await supabase.from('support_messages').select('id,ticket_id,sender_id,body,is_staff,created_at').eq('ticket_id',activeTicket.id).order('created_at').limit(300);
    if (e) setError(e.message); else setMessages(data ?? []);
  }, [activeTicket?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (!supabase || !isAdmin) return undefined;
    const channel = supabase.channel('apex-staff-console')
      .on('postgres_changes',{event:'*',schema:'public',table:'support_tickets'},()=>load())
      .on('postgres_changes',{event:'*',schema:'public',table:'support_messages'},payload=>{load();if(!activeTicket||payload.new?.ticket_id===activeTicket.id)loadMessages();})
      .subscribe();
    const fallback=setInterval(()=>{load();if(activeTicket)loadMessages();},15000);
    return ()=>{clearInterval(fallback);supabase.removeChannel(channel);};
  },[isAdmin,activeTicket?.id,load,loadMessages]);

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <main className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-200"><h1 className="text-2xl font-black">Yönetici erişimi gerekli</h1><p className="mx-auto mt-3 max-w-xl text-slate-400">Bu hesapta sunucu tarafında yönetici rolü bulunamadı.</p></main>;

  const run = async action => {
    setBusy(true); setError(''); setMessage('');
    try { await action(); await load(); }
    catch (e) { setError(e.message || 'İşlem başarısız.'); }
    finally { setBusy(false); }
  };
  const saveAnnouncement = e => { e.preventDefault(); run(async()=>{const {error:e}=await supabase.from('announcements').insert({title:form.title.trim(),body:form.body.trim(),image_url:form.image_url.trim()||null,is_published:true,created_by:user.id});if(e)throw e;setForm(v=>({...v,title:'',body:'',image_url:''}));setMessage('Duyuru yayınlandı.');}); };
  const saveTournament = e => { e.preventDefault(); run(async()=>{const {error:e}=await supabase.from('tournaments').insert({name:form.name.trim(),description:form.description.trim(),starts_at:form.starts_at?new Date(form.starts_at).toISOString():null,max_participants:Number(form.max_participants),status:'upcoming',created_by:user.id});if(e)throw e;setForm(v=>({...v,name:'',description:'',starts_at:''}));setMessage('Turnuva oluşturuldu.');}); };
  const saveItem = e => { e.preventDefault(); run(async()=>{const {error:e}=await supabase.from('shop_items').insert({name:form.name.trim(),description:form.description.trim(),price:Number(form.price),item_type:form.item_type,is_active:true});if(e)throw e;setForm(v=>({...v,name:'',description:'',price:0}));setMessage('Mağaza ürünü oluşturuldu.');}); };
  const toggleAnnouncement = item => run(async()=>{const {error:e}=await supabase.from('announcements').update({is_published:!item.is_published}).eq('id',item.id);if(e)throw e;setMessage('Duyuru durumu güncellendi.');});
  const toggleItem = item => run(async()=>{const {error:e}=await supabase.from('shop_items').update({is_active:!item.is_active}).eq('id',item.id);if(e)throw e;setMessage('Ürün durumu güncellendi.');});
  const awardWallet = e => { e.preventDefault(); run(async()=>{const {data:p,error:e}=await supabase.from('profiles').select('id,username').eq('username',wallet.username.trim().toLowerCase()).maybeSingle();if(e)throw e;if(!p)throw new Error('Bu kullanıcı adı bulunamadı.');const {error:a}=await supabase.rpc('admin_adjust_wallet',{p_user_id:p.id,p_amount:Number(wallet.amount),p_reason:wallet.reason.trim()});if(a)throw a;setMessage('Coin işlemi tamamlandı: @'+p.username);}); };
  const saveRank = (profile, rank) => run(async()=>{const {error:e}=await supabase.from('profiles').update({rocket_league_rank:rank}).eq('id',profile.id);if(e)throw e;setMessage('@'+profile.username+' rank doğrulandı: '+rank);});
  const assignRole = e => { e.preventDefault(); if(!isOwner)return; run(async()=>{const profile=profiles.find(p=>p.username.toLowerCase()===roleUsername.trim().toLowerCase());if(!profile)throw new Error('Kullanıcı adı bulunamadı.');if(profile.id===user.id&&roleChoice!=='owner')throw new Error('Kendi Owner rolünü bu formdan düşürme.');const {error:e}=await supabase.from('user_roles').upsert({user_id:profile.id,role:roleChoice},{onConflict:'user_id,role'});if(e)throw e;setMessage('@'+profile.username+' hesabına '+roleChoice+' rolü verildi.');setRoleUsername('');}); };
  const revokeRole = (entry) => { if(!isOwner)return; run(async()=>{if(entry.user_id===user.id&&entry.role==='owner')throw new Error('Kendi Owner rolünü buradan kaldıramazsın.');const {error:e}=await supabase.from('user_roles').delete().eq('user_id',entry.user_id).eq('role',entry.role);if(e)throw e;setMessage('Personel rolü kaldırıldı.');}); };
  const changeTicketStatus = (ticket,status) => run(async()=>{const {error:e}=await supabase.from('support_tickets').update({status,assigned_to:user.id}).eq('id',ticket.id);if(e)throw e;setMessage('Ticket durumu güncellendi.');});
  const sendTicketReply = e => { e.preventDefault();if(!activeTicket||!ticketReply.trim())return;run(async()=>{const {error:e}=await supabase.from('support_messages').insert({ticket_id:activeTicket.id,sender_id:user.id,body:ticketReply.trim(),is_staff:true});if(e)throw e;setTicketReply('');setMessage('Yanıt gönderildi.');}); };

  const tabs=[['announcements','Duyurular'],['tournaments','Turnuvalar'],['shop','Mağaza'],['wallet','Coin işlemi'],['support','Canlı destek'],['ranks','Rank doğrulama'],...(isOwner?[['roles','Personel rolleri']]:[])];
  const panel='mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5';
  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-amber-300">{isOwner?'OWNER / FULL CONTROL':'ADMIN / COMMUNITY SUPPORT'}</p><h1 className="mt-2 text-3xl font-black">{isOwner?'Owner Kontrol Merkezi':'Yönetim ve Destek Merkezi'}</h1><p className="mt-2 text-slate-400">Oturum rolü: <strong className="text-white">{role}</strong>. Sunucu RLS politikaları bütün işlemleri ayrıca doğrular.</p>
    <div className="mt-6 flex flex-wrap gap-2">{tabs.map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={'rounded-lg px-4 py-2 font-semibold '+(tab===key?'bg-indigo-500 text-white':'border border-slate-700 bg-slate-900 text-slate-300')}>{label}</button>)}</div>
    {error&&<p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}{message&&<p role="status" className="mt-4 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{message}</p>}
    {tab==='announcements'&&<section className={panel}><h2 className="text-xl font-bold">Çevrim içi duyuru yayınla</h2><form onSubmit={saveAnnouncement} className="mt-4 grid gap-3"><input required maxLength={160} placeholder="Duyuru başlığı" className={fieldClass} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><textarea required maxLength={10000} rows={5} placeholder="Duyuru metni" className={fieldClass} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/><input type="url" placeholder="Görsel URL (isteğe bağlı)" className={fieldClass} value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})}/><button disabled={busy} className="w-fit rounded-lg bg-indigo-500 px-4 py-2 font-bold disabled:opacity-50">Yayınla</button></form><div className="mt-6 space-y-3">{announcements.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"><div><h3 className="font-bold">{item.title}</h3><p className="mt-1 text-xs text-slate-400">{item.is_published?'Yayında':'Gizli'}</p></div><button disabled={busy} onClick={()=>toggleAnnouncement(item)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{item.is_published?'Gizle':'Yayınla'}</button></div>)}</div></section>}
    {tab==='tournaments'&&<section className={panel}><h2 className="text-xl font-bold">Turnuva oluştur</h2><form onSubmit={saveTournament} className="mt-4 grid gap-3 md:grid-cols-2"><input required minLength={3} maxLength={100} placeholder="Turnuva adı" className={fieldClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input type="datetime-local" className={fieldClass} value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/><textarea maxLength={3000} placeholder="Açıklama" className={fieldClass+' md:col-span-2'} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><label className="text-sm text-slate-400">Maksimum katılımcı<input type="number" min="2" max="512" required className={fieldClass+' mt-1'} value={form.max_participants} onChange={e=>setForm({...form,max_participants:e.target.value})}/></label><button disabled={busy} className="self-end rounded-lg bg-indigo-500 px-4 py-3 font-bold">Turnuva oluştur</button></form><div className="mt-5 space-y-2">{tournaments.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-3"><strong>{item.name}</strong><select value={item.status} onChange={e=>run(async()=>{const {error}=await supabase.from('tournaments').update({status:e.target.value}).eq('id',item.id);if(error)throw error;})} className={fieldClass+' max-w-48'}>{['draft','upcoming','live','completed','cancelled'].map(s=><option key={s}>{s}</option>)}</select></div>)}</div></section>}
    {tab==='shop'&&<section className={panel}><h2 className="text-xl font-bold">Mağaza ürünleri</h2><form onSubmit={saveItem} className="mt-4 grid gap-3 md:grid-cols-2"><input required minLength={2} maxLength={100} placeholder="Ürün adı" className={fieldClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><select value={form.item_type} onChange={e=>setForm({...form,item_type:e.target.value})} className={fieldClass}>{['cosmetic','badge','title','avatar','other'].map(t=><option key={t}>{t}</option>)}</select><input required type="number" min="0" placeholder="Fiyat (GC)" className={fieldClass} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><textarea maxLength={1000} placeholder="Açıklama" className={fieldClass} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><button disabled={busy} className="rounded-lg bg-indigo-500 px-4 py-3 font-bold">Ürün ekle</button></form><div className="mt-5 space-y-2">{items.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 p-3"><div><strong>{item.name}</strong><p className="text-xs text-slate-400">{item.price} GC · {item.is_active?'Aktif':'Gizli'}</p></div><button onClick={()=>toggleItem(item)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{item.is_active?'Gizle':'Etkinleştir'}</button></div>)}</div></section>}
    {tab==='wallet'&&<section className={panel}><h2 className="text-xl font-bold">Genesis Coin ayarla</h2><form onSubmit={awardWallet} className="mt-4 grid gap-3 md:grid-cols-3"><input required placeholder="Oyuncu adı" className={fieldClass} value={wallet.username} onChange={e=>setWallet({...wallet,username:e.target.value})}/><input required type="number" min="-100000" max="100000" value={wallet.amount} className={fieldClass} onChange={e=>setWallet({...wallet,amount:e.target.value})}/><input required minLength={2} maxLength={120} value={wallet.reason} className={fieldClass} onChange={e=>setWallet({...wallet,reason:e.target.value})}/><button disabled={busy} className="rounded-lg bg-indigo-500 p-3 font-bold md:col-span-3">İşlemi uygula</button></form></section>}
    {tab==='support'&&<section className={panel}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Canlı destek kuyruğu</h2><button onClick={()=>load()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Yenile</button></div><div className="mt-4 grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><div className="grid content-start gap-2">{tickets.map(ticket=><button key={ticket.id} onClick={()=>setActiveTicket(ticket)} className={'rounded-xl border p-3 text-left '+(activeTicket?.id===ticket.id?'border-indigo-400 bg-indigo-950/50':'border-slate-800 bg-slate-950')}><strong>{ticket.subject}</strong><p className="mt-1 text-xs text-slate-400">{profiles.find(p=>p.id===ticket.user_id)?.username||ticket.user_id.slice(0,8)} · {ticket.category.replace('_',' ')} · {ticket.status}</p></button>)}{!tickets.length&&<p className="text-sm text-slate-400">Şu anda ticket yok.</p>}</div><div className="min-w-0 rounded-xl border border-slate-800 p-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{activeTicket?.subject||'Bir ticket seç'}</h3>{activeTicket&&<select value={activeTicket.status} onChange={e=>changeTicketStatus(activeTicket,e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-2">{['open','in_progress','waiting_user','resolved','closed'].map(s=><option key={s}>{s}</option>)}</select>}</div><div className="mt-3 grid max-h-80 gap-2 overflow-y-auto">{messages.map(m=><article key={m.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="flex justify-between gap-2 text-xs text-slate-500"><strong>{m.is_staff?'Staff':m.sender_id===user.id?'Sen':profiles.find(p=>p.id===m.sender_id)?.username||'Üye'}</strong><time>{stamp(m.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p></article>)}</div><form onSubmit={sendTicketReply} className="mt-3 flex gap-2"><textarea disabled={!activeTicket} required value={ticketReply} onChange={e=>setTicketReply(e.target.value)} rows={2} className={fieldClass} placeholder="Üyeye yanıt yaz…"/><button disabled={!activeTicket||busy} className="rounded-lg bg-indigo-500 px-4 font-bold">Gönder</button></form></div></div></section>}
    {tab==='ranks'&&<section className={panel}><h2 className="text-xl font-bold">Rank doğrulama</h2><p className="mt-2 text-sm text-slate-400">Yalnızca staff profildeki doğrulanmış rank değerini değiştirebilir. Kanıtı destek ticket'ında kontrol et.</p><div className="mt-4 grid gap-2">{profiles.map(profile=><div key={profile.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-3"><div><strong>@{profile.username}</strong><p className="text-xs text-slate-500">Mevcut: {profile.rocket_league_rank}</p></div><select aria-label={'Rank for '+profile.username} value={profile.rocket_league_rank} onChange={e=>saveRank(profile,e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-2">{ranks.map(r=><option key={r}>{r}</option>)}</select></div>)}</div></section>}
    {tab==='roles'&&isOwner&&<section className={panel}><h2 className="text-xl font-bold">Owner · Personel yetkileri</h2><p className="mt-2 text-sm text-slate-400">Yalnızca Owner admin rolü atayabilir veya kaldırabilir. Adminler Owner oluşturamaz.</p><form onSubmit={assignRole} className="mt-4 flex flex-wrap gap-3"><input required placeholder="Tam kullanıcı adı" className={fieldClass+' min-w-52 flex-1'} value={roleUsername} onChange={e=>setRoleUsername(e.target.value)}/><select value={roleChoice} onChange={e=>setRoleChoice(e.target.value)} className={fieldClass+' max-w-48'}>{roles.map(r=><option key={r}>{r}</option>)}</select><button disabled={busy} className="rounded-lg bg-amber-400 px-4 py-3 font-black text-black">Yetki ata</button></form><div className="mt-5 space-y-2">{staffRoles.map(entry=><div key={entry.user_id+entry.role} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-3"><div><strong>{profiles.find(p=>p.id===entry.user_id)?.username||entry.user_id.slice(0,8)}</strong><p className="text-xs uppercase text-amber-300">{entry.role}</p></div><button disabled={busy} onClick={()=>revokeRole(entry)} className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300">Rolü kaldır</button></div>)}</div></section>}
  </div></main>;
}
