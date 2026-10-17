import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

export default function Shop() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [owned, setOwned] = useState(new Set());
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const [itemsRes, inventoryRes, ledgerRes] = await Promise.all([
      supabase.from('shop_items').select('id,name,description,item_type,price,asset_url').eq('is_active',true).order('price'),
      supabase.from('user_inventory').select('item_id').eq('user_id',user.id),
      supabase.from('wallet_transactions').select('amount').eq('user_id',user.id),
    ]);
    const firstError = itemsRes.error || inventoryRes.error || ledgerRes.error;
    if (firstError) setError(firstError.message);
    setItems(itemsRes.data ?? []);
    setOwned(new Set((inventoryRes.data ?? []).map(item=>item.item_id)));
    setBalance((ledgerRes.data ?? []).reduce((sum,item)=>sum+item.amount,0));
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const purchase = async item => {
    setBusy(item.id); setError(''); setMessage('');
    const { data, error: purchaseError } = await supabase.rpc('purchase_shop_item',{p_item_id:item.id});
    if (purchaseError) setError(purchaseError.message);
    else setMessage(item.price===0?'Ürün envanterine eklendi.':'Satın alma başarılı. Yeni bakiyen: '+data.balance+' Genesis Coin.');
    await load();
    setBusy('');
  };

  return <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-5xl">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-300">Virtual items</p><h1 className="mt-2 text-3xl font-black">Genesis Shop</h1><p className="mt-2 text-slate-400">Bakiyen güvenli sunucu tarafında kontrol edilir; istemci kendi kendine coin ekleyemez.</p>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"><span className="text-slate-400">Genesis Coin bakiyen</span><strong className="text-2xl text-amber-300">{balance.toLocaleString()} GC</strong></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-lg bg-emerald-950 p-3 text-sm text-emerald-200">{message}</p>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 text-3xl font-black text-indigo-200">{item.item_type==='badge'?'✦':item.item_type==='title'?'♛':'◇'}</div><p className="mt-4 text-xs font-bold uppercase tracking-widest text-indigo-300">{item.item_type}</p><h2 className="mt-1 text-lg font-bold">{item.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-400">{item.description}</p><div className="mt-4 flex items-center justify-between gap-2"><strong className="text-amber-300">{item.price===0?'Ücretsiz':item.price.toLocaleString()+' GC'}</strong><button disabled={busy===item.id||owned.has(item.id)} onClick={()=>purchase(item)} className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-bold hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">{busy===item.id?'İşleniyor…':owned.has(item.id)?'Sahipsin':'Al'}</button></div></article>)}</div>
    {!items.length&&!error&&<p className="mt-8 text-center text-slate-400">Mağaza yükleniyor…</p>}
  </div></div>;
}
