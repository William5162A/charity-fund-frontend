import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

  const userRole = user.role;
  const userName = user.name || 'مستخدم النظام';

  // 🌟 تصحيح البادئة لتطابق المسارات الجديدة تماماً
  const basePath = userRole === ROLES.ADMIN ? '/admin' : '/processor';

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const navLinkStyle = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${
      isActive 
        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
    }`;

  const adminLinkStyle = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${
      isActive 
        ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-700' 
        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
    }`;

  return (
    <aside className="w-64 bg-white shadow-xl h-screen sticky top-0 overflow-y-auto flex-col hidden lg:flex border-l border-gray-100">
      
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner ${userRole === ROLES.ADMIN ? 'bg-purple-100' : 'bg-blue-100'}`}>
            {userRole === ROLES.ADMIN ? '👑' : '👨‍💻'}
          </div>
          <div>
            <p className="font-black text-gray-800 text-sm">{userName}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {userRole === ROLES.ADMIN ? 'مدير النظام' : 'اللجنة الإدارية'}
            </p>
          </div>
        </div>
      </div>

      <nav className="p-4 flex flex-col gap-2 grow">
        <p className="text-[11px] font-black text-gray-400 mb-2 px-2 mt-2 uppercase">العمليات الأساسية</p>
        
        <NavLink to={`${basePath}`} end className={navLinkStyle}>
          <span className="text-xl">📊</span> الرئيسية
        </NavLink>
        
        <NavLink to={`${basePath}/new-requests`} className={navLinkStyle}>
          <span className="text-xl">📥</span> الطلبات الواردة
        </NavLink>
        
        <NavLink to={`${basePath}/completed`} className={navLinkStyle}>
          <span className="text-xl">✅</span> الطلبات المنجزة
        </NavLink>

        <p className="text-[11px] font-black text-gray-400 mt-6 mb-2 px-2 uppercase">الجهات والتقارير</p>
        
        <NavLink to={`${basePath}/supporters`} className={navLinkStyle}>
          <span className="text-xl">🤝</span> الجهات الداعمة
        </NavLink>
        
        <NavLink to={`${basePath}/reports`} className={navLinkStyle}>
          <span className="text-xl">📈</span> التقارير المالية
        </NavLink>

        {/* 🌟 تعديل الروابط المباشرة للمدير لتطابق مسار /admin بدلاً من /owner */}
        {userRole === ROLES.ADMIN && (
          <>
            <p className="text-[11px] font-black text-purple-400 mt-6 mb-2 px-2 uppercase">إدارة النظام</p>
            <NavLink to="/admin/users" className={adminLinkStyle}>
              <span className="text-xl">⚙️</span> إدارة الحسابات
            </NavLink>
            <NavLink to="/admin/supporters-manager" className={adminLinkStyle}>
              <span className="text-xl">🏢</span> إدارة قوائم الجهات
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm cursor-pointer"
        >
          <span>🚪</span> تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}