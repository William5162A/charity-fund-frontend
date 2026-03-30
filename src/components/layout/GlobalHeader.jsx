import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function GlobalHeader() {
  const navigate = useNavigate();
  const location = useLocation(); // لمعرفة في أي صفحة نحن الآن

  const handleLogout = () => {
  // نمسح فقط بيانات الدخول (الجلسة الحالية)
    localStorage.removeItem('userRole'); 
    localStorage.removeItem('userName'); 
    
    // لا نمسح 'system_users' أو 'requestsData' أبداً!
    
    navigate('/'); // العودة لصفحة الدخول
  };

  // التحقق مما إذا كنا في صفحة الدخول
  const isLoginPage = location.pathname === '/';

  return (
    <header className="bg-blue-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        
        {/* عنوان الموقع على اليمين */}
        <h1 className="text-xl font-bold tracking-wide">
          أبرشية حمص للروم الأرثوذكس - الصندوق الطبي
        </h1>
        
        {/* زر تسجيل الخروج على اليسار (يظهر فقط إذا لم نكن في صفحة الدخول) */}
        {!isLoginPage && (
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm border border-red-400"
          >
            تسجيل الخروج
          </button>
        )}
        
      </div>
    </header>
  );
}