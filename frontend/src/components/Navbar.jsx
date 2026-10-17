import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navClass = 'rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white';
export default function Navbar() {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try { await logout(); navigate('/login'); }
    catch (error) { console.error('Çıkış başarısız:', error); }
  };
  return <nav className="border-b border-slate-800 bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3"><Link to="/" className="text-xl font-black tracking-tight text-white">APEX <span className="text-indigo-400">GENESIS</span></Link><div className="flex flex-wrap items-center gap-1">{!user ? <><Link to="/login" className={navClass}>Giriş</Link><Link to="/signup" className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-400">Kayıt ol</Link></> : <><Link to="/" className={navClass}>Akış</Link><Link to="/teams" className={navClass}>Takımlar</Link><Link to="/tournaments" className={navClass}>Turnuvalar</Link><Link to="/training" className={navClass}>Antrenman</Link><Link to="/shop" className={navClass}>Mağaza</Link><Link to="/announcements" className={navClass}>Duyurular</Link><Link to="/profile" className={navClass}>Profil</Link><Link to="/support" className={navClass}>Destek</Link>{isAdmin&&<Link to="/admin" className={navClass}>{isOwner?'Owner Paneli':'Yönetim'}</Link>}<button onClick={handleLogout} className={navClass}>Çıkış</button></>}</div></div></nav>;
}
