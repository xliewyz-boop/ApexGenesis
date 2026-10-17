import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, username.trim());
      if (result.session) navigate('/');
      else setMessage('Kayıt başarılı. E-posta doğrulaması açıksa gelen kutunu kontrol edip hesabını doğrula, sonra giriş yap.');
    } catch (err) {
      setError(err.message || 'Kayıt başarısız. Bilgilerini kontrol et.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div><h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Apex Genesis hesabı oluştur</h2><p className="mt-2 text-center text-sm text-gray-600">Zaten hesabın var mı? <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">Giriş yap</Link></p></div>
        {!isSupabaseConfigured && <p className="text-sm text-red-600">Supabase ayarları eksik. frontend/.env dosyasını kontrol edin.</p>}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div><label htmlFor="username" className="sr-only">Kullanıcı adı</label><input id="username" name="username" type="text" required minLength={3} maxLength={24} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Kullanıcı adı (3–24 karakter)" /></div>
            <div><label htmlFor="email" className="sr-only">E-posta</label><input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="E-posta adresi" /></div>
            <div><label htmlFor="password" className="sr-only">Şifre</label><input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Şifre (en az 8 karakter)" /></div>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          <button type="submit" disabled={loading || !isSupabaseConfigured} className="group relative w-full flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md">{loading ? 'Hesap oluşturuluyor…' : 'Kayıt ol'}</button>
        </form>
      </div>
    </div>
  );
};
export default Signup;
