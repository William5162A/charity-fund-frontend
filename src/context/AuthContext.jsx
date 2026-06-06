import React, { createContext, useState, useContext } from 'react';

// 🌟 القاموس الموحد والنهائي. يجب ألا يتغير أبداً لضمان استقرار التوجيه
export const ROLES = {
  ADMIN: 'admin',
  PROCESSOR: 'requests_processor',
  DOCTOR: 'doctor'
};

const USER_ID_STORAGE_KEY = 'userId';

const decodeJwtPayload = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const normalizeUserId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numericId = Number(value);
  return Number.isNaN(numericId) ? value : numericId;
};

const resolveUserId = (userData, token) => {
  const directId = userData?.id ?? userData?.user_id ?? userData?.userId;
  if (directId !== null && directId !== undefined && directId !== '') {
    return normalizeUserId(directId);
  }

  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return normalizeUserId(payload.user_id ?? payload.id ?? payload.sub ?? null);
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('access_token');
    const savedRole = localStorage.getItem('userRole');
    const savedName = localStorage.getItem('userName');
    const savedId = localStorage.getItem(USER_ID_STORAGE_KEY);

    if (token && savedRole) {
      const id = savedId !== null
        ? normalizeUserId(savedId)
        : resolveUserId(null, token);

      return {
        id,
        role: savedRole,
        name: savedName,
      };
    }

    if (!token && savedRole) {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem(USER_ID_STORAGE_KEY);
    }

    return null;
  });

  const login = (userData) => {
    const token = localStorage.getItem('access_token');
    const id = resolveUserId(userData, token);

    setUser({
      id,
      role: userData.role,
      name: userData.name,
    });

    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('userName', userData.name || '');

    if (id !== null) {
      localStorage.setItem(USER_ID_STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(USER_ID_STORAGE_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem(USER_ID_STORAGE_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('يجب استخدام useAuth داخل AuthProvider');
  }
  return context;
};
