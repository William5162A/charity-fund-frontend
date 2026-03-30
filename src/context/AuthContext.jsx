import React, { createContext ,  useState, useContext } from 'react';

// 1. إنشاء "الغيمة" التي ستحمل البيانات
const AuthContext = createContext(null);

// 2. إنشاء المزود (Provider) الذي سيغلف التطبيق
export function AuthProvider({ children }) {
  // البحث في الذاكرة المحلية (المرآب الخاص بنا) لمعرفة ما إذا كان المستخدم مسجلاً مسبقاً
  const [user, setUser] = useState(() => {
    const savedRole = localStorage.getItem('userRole');
    const savedName = localStorage.getItem('userName');
    
    if (savedRole) {
      return { role: savedRole, name: savedName };
    }
    return null; // لا يوجد مستخدم مسجل
  });

  // دالة تسجيل الدخول (تُحفظ البيانات في الذاكرة المحلية لكي لا تضيع عند التحديث)
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('userName', userData.name || '');
  };

  // دالة تسجيل الخروج (تقوم بمسح البيانات من الذاكرة)
  const logout = () => {
    setUser(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
  };

  // توفير البيانات والدوال لكل أجزاء التطبيق
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. أداة مساعدة (Hook) لكي نستخدم البيانات بسهولة في أي صفحة
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("يجب استخدام useAuth داخل AuthProvider");
  }
  return context;
};