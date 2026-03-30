import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName') || 'مستخدم النظام';

  // 🌟 تحديد البادئة بناءً على الصلاحية
  const basePath = userRole === 'owner' ? '/owner' : '/admin';

  // دالة تسجيل الخروج الذكية (لا تمسح قاعدة البيانات)
  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    navigate('/');
  };

  // تنسيق الروابط العادية (أزرق)
  const navLinkStyle = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${
      isActive 
        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
    }`;

  // تنسيق روابط المالك (بنفسجي)
  const ownerLinkStyle = ({ isActive }) => 
    `flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all ${
      isActive 
        ? 'bg-purple-50 text-purple-700 border-r-4 border-purple-700' 
        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
    }`;

  return (
    <aside className="w-64 bg-white shadow-xl h-screen sticky top-0 overflow-y-auto flex-col hidden md:flex border-l border-gray-100">
      
      {/* رأس القائمة: معلومات المستخدم */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner ${userRole === 'owner' ? 'bg-purple-100' : 'bg-blue-100'}`}>
            {userRole === 'owner' ? '👑' : '👨‍💻'}
          </div>
          <div>
            <p className="font-black text-gray-800 text-sm">{userName}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {userRole === 'owner' ? 'المالك العام' : 'فريق الإدارة'}
            </p>
          </div>
        </div>
      </div>

      {/* الروابط الديناميكية */}
      <nav className="p-4 flex flex-col gap-2 grow">
        <p className="text-[11px] font-black text-gray-400 mb-2 px-2 mt-2 uppercase">العمليات الأساسية</p>
        
        {/* نستخدم ${basePath} لضمان بقاء المستخدم في مساره الصحيح */}
        <NavLink path to={`${basePath}`} end className={navLinkStyle}>
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

        {/* قسم خاص بالمالك فقط ويستخدم مسار /owner */}
        {userRole === 'owner' && (
          <>
            <p className="text-[11px] font-black text-purple-400 mt-6 mb-2 px-2 uppercase">إدارة النظام</p>
            <NavLink to="/owner/users" className={ownerLinkStyle}>
              <span className="text-xl">⚙️</span> إدارة الحسابات
            </NavLink>
            <NavLink to="/owner/supporters-manager" className={ownerLinkStyle}>
              <span className="text-xl">🏢</span> إدارة قوائم الجهات
            </NavLink>
          </>
        )}
      </nav>

      {/* زر تسجيل الخروج في الأسفل */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm"
        >
          <span>🚪</span> تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}