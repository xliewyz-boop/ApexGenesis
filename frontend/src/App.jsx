import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Profile from './pages/Profile.jsx';
import Teams from './pages/Teams.jsx';
import Tournaments from './pages/Tournaments.jsx';
import Announcements from './pages/Announcements.jsx';
import Training from './pages/Training.jsx';
import Shop from './pages/Shop.jsx';
import Admin from './pages/Admin.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="bg-slate-950 py-16 text-center text-slate-300">Oturum kontrol ediliyor…</div>;
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  return <div className="min-h-screen bg-slate-950"><Navbar /><Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
    <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
    <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
    <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
    <Route path="/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />
    <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></div>;
}
export default function App() { return <AuthProvider><Router><AppRoutes /></Router></AuthProvider>; }
