import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

const categories = [
  ['general', 'Genel destek'], ['rank_verification', 'Rank doğrulama'],
  ['account', 'Hesap sorunu'], ['bug_report', 'Hata bildirimi'], ['other', 'Diğer'],
];
const time = value => value ? new Date(value).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '';

export default function Support() {
  const { user, isAdmin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [firstMessage, setFirstMessage] = useState('');
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTickets = useCallback(async (keep = true) => {
    if (!supabase || !user) return;
    const { data, error: queryError } = await supabase.from('support_tickets')
      .select('id,user_id,subject,category,status,priority,assigned_to,created_at,updated_at')
      .order('updated_at', { ascending: false }).limit(100);
    if (queryError) { setError(queryError.message); return; }
    setTickets(data ?? []);
    if (keep && active) {
      const latest = (data ?? []).find(item => item.id === active.id);
      if (latest) setActive(latest);
      else setActive(null);
    }
  }, [user?.id, active?.id]);

  const loadMessages = useCallback(async (ticket = active) => {
    if (!supabase || !ticket) { setMessages([]); return; }
    const { data, error: queryError } = await supabase.from('support_messages')
      .select('id,ticket_id,sender_id,body,is_staff,created_at')
      .eq('ticket_id', ticket.id).order('created_at').limit(300);
    if (queryError) { setError(queryError.message); return; }
    setMessages(data ?? []);
  }, [active?.id]);

  useEffect(() => { loadTickets(false); }, [loadTickets]);
  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (!supabase || !user) return undefined;
    const channel = supabase.channel('support-live-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, payload => {
        if (!active || payload.new?.ticket_id === active.id || payload.old?.ticket_id === active.id) loadMessages();
        loadTickets();
      }).subscribe();
    const fallback = setInterval(() => { loadTickets(); if (active) loadMessages(); }, 15000);
    return () => { clearInterval(fallback); supabase.removeChannel(channel); };
  }, [user?.id, active?.id, loadTickets, loadMessages]);

  const createTicket = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const { data: ticket, error: ticketError } = await supabase.from('support_tickets')
        .insert({ user_id: user.id, subject: subject.trim(), category }).select().single();
      if (ticketError) throw ticketError;
      const { error: messageError } = await supabase.from('support_messages')
        .insert({ ticket_id: ticket.id, sender_id: user.id, body: firstMessage.trim(), is_staff: false });
      if (messageError) throw messageError;
      setSubject(''); setCategory('general'); setFirstMessage('');
      await loadTickets(false); setActive(ticket); setStatus('Ticket oluşturuldu. Destek ekibi yanıt verdiğinde burada görünecek.');
    } catch (e) { setError(e.message || 'Ticket oluşturulamadı.'); }
    finally { setBusy(false); }
  };

  const sendReply = async event => {
    event.preventDefault(); if (!active || !reply.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const { error: sendError } = await supabase.from('support_messages')
        .insert({ ticket_id: active.id, sender_id: user.id, body: reply.trim(), is_staff: isAdmin });
      if (sendError) throw sendError;
      setReply(''); await loadMessages(active); await loadTickets();
    } catch (e) { setError(e.message || 'Mesaj gönderilemedi.'); }
    finally { setBusy(false); }
  };

  const changeStatus = async next => {
    if (!isAdmin || !active) return;
    const { error: updateError } = await supabase.from('support_tickets').update({ status: next, assigned_to: user.id }).eq('id', active.id);
    if (updateError) setError(updateError.message);
    else { setActive({ ...active, status: next }); await loadTickets(); }
  };

  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 text-slate-100">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-emerald-300">{isAdmin ? 'Live customer support' : 'Apex Genesis Help Desk'}</p>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">{isAdmin ? 'Canlı destek masası' : 'Destek Merkezi'}</h1><p className="mt-2 text-slate-400">{isAdmin ? 'Açık ticket kuyruğu; mesajlar gerçek zamanlı güncellenir.' : 'Sorun bildir, rank doğrulama talebi aç ve destek ekibiyle yazış.'}</p></div><span className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-2 text-xs text-emerald-200">● Canlı bağlantı</span></div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-900 bg-red-950 p-3 text-sm text-red-200">{error}</p>}
    {status && <p role="status" className="mt-4 rounded-xl border border-emerald-900 bg-emerald-950 p-3 text-sm text-emerald-200">{status}</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      {!isAdmin && <section className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="text-xl font-bold">Ticket oluştur</h2><form onSubmit={createTicket} className="mt-4 grid gap-3"><label className="grid gap-1 text-sm text-slate-300">Konu<input required minLength={3} maxLength={140} value={subject} onChange={e=>setSubject(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-3"/></label><label className="grid gap-1 text-sm text-slate-300">Kategori<select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-3">{categories.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="grid gap-1 text-sm text-slate-300">Açıklama<textarea required minLength={5} maxLength={5000} rows={5} value={firstMessage} onChange={e=>setFirstMessage(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-3"/></label><button disabled={busy} className="rounded-lg bg-indigo-500 p-3 font-bold disabled:opacity-50">{busy?'Gönderiliyor…':'Destek talebi gönder'}</button></form></section>}
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{isAdmin ? 'Tüm destek talepleri' : 'Taleplerim'}</h2><button onClick={()=>loadTickets()} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Yenile</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{tickets.map(ticket=><button key={ticket.id} onClick={()=>setActive(ticket)} className={'rounded-xl border p-3 text-left '+(active?.id===ticket.id?'border-indigo-400 bg-indigo-950/50':'border-slate-800 bg-slate-950 hover:border-slate-600')}><span className="flex items-start justify-between gap-2"><strong className="break-words">{ticket.subject}</strong><span className="rounded-full bg-slate-800 px-2 py-1 text-xs">{ticket.status.replace('_',' ')}</span></span><span className="mt-2 block text-xs text-slate-500">{ticket.category.replace('_',' ')} · {time(ticket.updated_at)}</span></button>)}</div>{!tickets.length&&<p className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">Henüz ticket bulunmuyor.</p>}</section>
    </div>
    <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{active?.subject || 'Ticket konuşması'}</h2>{active&&<p className="mt-1 text-xs text-slate-500">{active.category.replace('_',' ')} · {active.status.replace('_',' ')}</p>}</div>{isAdmin&&active&&<select aria-label="Ticket durumu" value={active.status} onChange={e=>changeStatus(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-2">{['open','in_progress','waiting_user','resolved','closed'].map(s=><option value={s} key={s}>{s.replace('_',' ')}</option>)}</select>}</div><div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto">{messages.map(message=><article key={message.id} className={'max-w-[90%] rounded-xl border p-3 '+(message.is_staff?'border-emerald-900 bg-emerald-950/40':'border-slate-700 bg-slate-950')}><div className="flex flex-wrap justify-between gap-2 text-xs text-slate-400"><strong>{message.is_staff?'Apex Genesis Support':message.sender_id===user.id?'Sen':'Üye'}</strong><time>{time(message.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p></article>)}</div><form onSubmit={sendReply} className="mt-4 flex flex-col gap-3 sm:flex-row"><textarea disabled={!active||busy} required maxLength={5000} rows={2} value={reply} onChange={e=>setReply(e.target.value)} placeholder={active?'Yanıtını yaz…':'Önce bir ticket seç'} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 p-3"/><button disabled={!active||busy} className="rounded-lg bg-indigo-500 px-5 py-3 font-bold disabled:opacity-50">Yanıt gönder</button></form></section>
  </main>;
}
