import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // 🌟 الاعتماد على السياق المركزي حصراً

export default function GlobalHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth(); // 🌟 استدعاء دالة التطهير الآمنة

  const handleLogout = () => {
    logout(); // هذه الدالة ستقوم بتنظيف localStorage وتحديث حالة React تلقائياً
    navigate('/', { replace: true }); // استخدام replace لمنع المستخدم من العودة بزر المتصفح
  };

  const isLoginPage = location.pathname === '/';

  return (
    <header className="bg-blue-900 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
        
        {/* 🌟 معالجة التجاوب: إخفاء الجزء الطويل من النص على الشاشات الصغيرة لمنع كسر التصميم */}
        <h1 className="text-sm lg:text-xl font-bold tracking-wide truncate">
          <span className="hidden lg:inline">أبرشية حمص وتوابعها للروم الأرثوذكس - </span>
          صندوق القديس اليان الحمصي الطبي
        </h1>
        
        {!isLoginPage && (
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 lg:px-5 py-2 rounded-lg font-bold text-xs lg:text-sm transition-all shadow-sm border border-red-400 shrink-0 cursor-pointer"
          >
            تسجيل الخروج
          </button>
        )}
        
      </div>
    </header>
  );
}