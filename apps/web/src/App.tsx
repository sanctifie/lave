import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AdminUser } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Deliveries } from './pages/Deliveries';
import { Rides } from './pages/Rides';
import { Meals } from './pages/Meals';
import { Doctors } from './pages/Doctors';
import { Verifications } from './pages/Verifications';
import { Reviews } from './pages/Reviews';
import { Users } from './pages/Users';
import { Pricing } from './pages/Pricing';

export default function App() {
  const { user, login, logout, isAuthenticated } = useAuth();
  const { mode, toggle } = useTheme();

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar onLogout={logout} userName={user!.name} themeMode={mode} onToggleTheme={toggle} />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--canvas)' }}>
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/orders"     element={<Orders />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/rides"      element={<Rides />} />
          <Route path="/meals"      element={<Meals />} />
          <Route path="/doctors"    element={<Doctors />} />
          <Route path="/verifications" element={<Verifications />} />
          <Route path="/reviews"    element={<Reviews />} />
          <Route path="/users"      element={<Users />} />
          <Route path="/pricing"    element={<Pricing />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
