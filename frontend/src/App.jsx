import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Teams = lazy(() => import('./pages/Teams.jsx'));
const Tournaments = lazy(() => import('./pages/Tournaments.jsx'));
const Announcements = lazy(() => import('./pages/Announcements.jsx'));
const Training = lazy(() => import('./pages/Training.jsx'));
const Shop = lazy(() => import('./pages/Shop.jsx'));
const Support = lazy(() => import('./pages/Support.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="bg-slate-950 py-16 text-center text-slate-300">Oturum kontrol ediliyor…</div>;
  return user ? children : <Navigate to="/login" replace />;
};

function PageMotion() {
  const location = useLocation();
  useEffect(() => {
    const revealRoutes = new Set(['/','/teams','/tournaments','/announcements','/training','/shop']);
    if (!revealRoutes.has(location.pathname) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const root = document.querySelector('main');
    if (!root || !('IntersectionObserver' in window)) return undefined;
    const nodes = root.querySelectorAll('article, section, main .grid > div');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    nodes.forEach((node,index) => { node.classList.add('scroll-reveal'); node.style.setProperty('--reveal-delay', Math.min(index%5,4)*35+'ms'); observer.observe(node); });
    return () => observer.disconnect();
  }, [location.pathname]);
  return null;
}

function RouteFallback() {
  return <div className="mx-auto min-h-[45vh] max-w-5xl px-4 py-16 text-center text-slate-300" role="status"><span className="inline-block animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400 h-7 w-7 align-middle"/><p className="mt-4">Sayfa yükleniyor…</p></div>;
}

function AppRoutes() {
  const { user } = useAuth();
  return <div className="min-h-screen bg-slate-950"><Navbar/><PageMotion/><Suspense fallback={<RouteFallback/>}><Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
    <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
    <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
    <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
    <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
    <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
    <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></div>;
}
export default function App() { return <AuthProvider><Router><AppRoutes/></Router></AuthProvider>; }
