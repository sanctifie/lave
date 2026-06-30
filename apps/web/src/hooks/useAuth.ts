import { useState, useEffect } from 'react';

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  token: string;
}

const STORAGE_KEY = 'mbolo_admin_token';

function getStored(): AdminUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(getStored);

  const login = (userData: AdminUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return { user, login, logout, isAuthenticated: !!user };
}
