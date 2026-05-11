import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLES } from '../../context/AuthContext'; 
import { loginUser } from '../../services/api';

// دالة فك تشفير الـ JWT (بدون مكتبات خارجية)
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function Login() {
  const [email, setEmail] = useState('');
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
      const response = await loginUser(email.trim(), password.trim());
      
      let finalRole = response.role;

      const decodedToken = decodeJWT(response.access);
      if (!finalRole && decodedToken) {
        finalRole = decodedToken.role;
      }

      if (!finalRole) {
        throw new Error('الخادم لم يرسل صلاحية الحساب (role).');
      }

      const userData = {
        role: finalRole,
        name: decodedToken?.full_name || decodedToken?.name || email.split('@')[0], 
      };

      console.log("Extracted Role from Backend:", finalRole);

      login(userData);

      // 🌟 التوجيه الذكي المطابق للمسارات الجديدة في AppRoutes
      if (userData.role === ROLES.ADMIN) {
        navigate('/admin'); // تم التعديل من /owner إلى /admin
      } else if (userData.role === ROLES.PROCESSOR) {
        navigate('/processor'); // تم التعديل من /admin إلى /processor
      } else if (userData.role === ROLES.DOCTOR) {
        navigate('/doctor'); 
      } else {
        throw new Error('صلاحية غير مدعومة.');
      }
      
    } catch (err) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      console.error("Login Error:", err);
      setError(err.message || 'خطأ في الاتصال بالخادم أو صحة البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="bg-blue-800 p-8 text-center border-b-4 border-emerald-500">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
            ⚕️
          </div>
          <h1 className="text-2xl font-bold text-white">نظام صندوق</h1>
          <h1 className="text-2xl font-bold text-white">القديس اليان الحمصي الطبي</h1>
          <p className="text-blue-200 mt-2 text-sm font-bold">أبرشية حمص وتوابعها للروم الأرثوذكس</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">تسجيل الدخول</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-bold border border-red-200 text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-mono"
                placeholder="أدخل بريدك الإلكتروني..."
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
                className="w-full border border-gray-300 p-3 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none font-mono tracking-widest"
                placeholder="••••••••"
                required
                dir="ltr"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full text-white font-bold py-3 rounded-lg transition-all shadow-md mt-4 flex justify-center items-center gap-2
                ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 hover:-translate-y-1 cursor-pointer'}`}
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> جاري التحقق...
                </>
              ) : (
                'دخول إلى النظام'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}