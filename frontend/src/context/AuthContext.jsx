import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase || !user) {
      setIsAdmin(false);
      return () => { active = false; };
    }
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setIsAdmin(Boolean(data && !error));
      })
      .catch(() => { if (active) setIsAdmin(false); });
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
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
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
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { username } },
    });
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
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, logout, loading, isSupabaseConfigured, isAdmin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
