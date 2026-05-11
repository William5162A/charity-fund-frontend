import React, { createContext, useState, useContext } from 'react';

// 🌟 القاموس الموحد والنهائي. يجب ألا يتغير أبداً لضمان استقرار التوجيه
export const ROLES = {
  ADMIN: 'admin',
  PROCESSOR: 'requests_processor',
  DOCTOR: 'doctor'
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // التحقق من وجود الـ Token الفعلي قبل الثقة ببيانات المستخدم
    const token = localStorage.getItem('access_token');
    const savedRole = localStorage.getItem('userRole');
    const savedName = localStorage.getItem('userName');
    
    if (token && savedRole) {
      return { role: savedRole, name: savedName };
    }
    
    // تنظيف استباقي في حال وجود بيانات فاسدة بدون Token
    if (!token && savedRole) {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
    }
    
    return null;
  });

  const login = (userData) => {
    setUser({ role: userData.role, name: userData.name });
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('userName', userData.name || '');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
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
    throw new Error("يجب استخدام useAuth داخل AuthProvider");
  }
  return context;
};