import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth(); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. محاولة تسجيل الدخول وجلب بيانات المستخدم
      const userData = await api.login(username.trim(), password.trim());
      
      // 2. حفظ البيانات في الذاكرة المركزية (Context)
      login(userData);

      // 3. التوجيه الذكي بناءً على الصلاحية (Role)
      // تم تغيير المسمى من user إلى userData لإصلاح الخطأ الذي ظهر عندك
      // التعديل: استبدل user بـ userData
      if (userData.role === 'owner') {
        navigate('/owner'); 
      } else if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'doctor') {
        navigate('/doctor');
      }
      
    } catch (err) {
      // إظهار رسالة الخطأ في حال فشل تسجيل الدخول
      setError(err.message || 'خطأ في اسم المستخدم أو كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* الترويسة العلوية */}
        <div className="bg-blue-800 p-8 text-center border-b-4 border-emerald-500">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
            ⚕️
          </div>
          <h1 className="text-2xl font-bold text-white">نظام الصندوق الطبي</h1>
          <p className="text-blue-200 mt-2 text-sm">أبرشية حمص للروم الأرثوذكس</p>
        </div>

        {/* نموذج الدخول */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">تسجيل الدخول</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold border border-red-200 text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اسم المستخدم</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                placeholder="أدخل اسم المستخدم..."
                required
                dir="ltr"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                placeholder="••••••••"
                required
                dir="ltr"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full text-white font-bold py-3 rounded-lg transition-all shadow-md mt-4 flex justify-center items-center gap-2
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 hover:-translate-y-1'}`}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin text-xl">⏳</span> جاري التحقق...
                </>
              ) : (
                'دخول إلى النظام'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-100 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 text-center">
            <p className="font-bold mb-2 text-gray-500">إرشادات الوصول</p>
            <p>يرجى استخدام الحساب المخصص لك من قبل الإدارة.</p>
          </div>

        </div>
      </div>
    </div>
  );
}