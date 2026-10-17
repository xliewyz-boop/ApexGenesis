import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('member');
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (!user || !supabase) {
      setRole('member');
      setRoleLoading(false);
      return undefined;
    }
    let active = true;
    setRoleLoading(true);
    supabase.from('user_roles').select('role').eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!active) return;
        const roles = error ? [] : (data ?? []).map(row => row.role);
        setRole(roles.includes('owner') ? 'owner' : roles.includes('admin') || roles.includes('moderator') ? 'admin' : 'member');
        setRoleLoading(false);
      })
      .catch(() => { if (active) { setRole('member'); setRoleLoading(false); } });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Supabase session lookup failed:', error.message);
      if (alive) {
        setUser(data?.session?.user ?? null);
        setLoading(false);
      }
    }).catch(() => { if (alive) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase bağlantısı yapılandırılmamış. .env ayarlarını kontrol edin.');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setUser(data.user);
    return data;
  };

  const signUp = async (email, password, username) => {
    if (!supabase) throw new Error('Supabase bağlantısı yapılandırılmamış. .env ayarlarını kontrol edin.');
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (error) throw error;
    if (data.user && data.session) setUser(data.user);
    return data;
  };

  const logout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setUser(null);
    setRole('member');
  };

  const isAdmin = role === 'admin' || role === 'owner';
  const isOwner = role === 'owner';
  return (
    <AuthContext.Provider value={{ user, signIn, signUp, logout, loading, isSupabaseConfigured, role, roleLoading, isAdmin, isOwner }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
