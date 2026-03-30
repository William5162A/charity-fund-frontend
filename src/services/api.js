import { getRequestsData, saveRequestsData, getSupportersData, saveSupportersData } from '../data/mockData';

/**
 * هذا الملف يعمل كمحاكي (Simulator) لعمليات السيرفر
 * قمت بإضافة "تأخير بسيط" (Delay) لجعل الموقع يبدو حقيقياً عند جلب البيانات
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // --- عمليات الطلبات ---
  getRequests: async () => {
    await delay(300); // محاكاة وقت التحميل
    return getRequestsData();
  },

  updateRequest: async (updatedRequests) => {
    await delay(200);
    saveRequestsData(updatedRequests);
    return true;
  },

  // --- عمليات الجهات الداعمة ---
  getSupporters: async () => {
    await delay(300);
    return getSupportersData();
  },

  saveSupporters: async (newData) => {
    await delay(200);
    saveSupportersData(newData);
    return true;
  },

  // --- عمليات تسجيل الدخول ---
  // داخل ملف api.js - دالة login
login: async (username, password) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // جلب المستخدمين أو وضع الافتراضيين إذا كانت الذاكرة فارغة
    let savedUsers = JSON.parse(localStorage.getItem('system_users'));
    if (!savedUsers) {
      savedUsers = [
        { id: 1, name: 'المالك العام', username: 'owner', password: '123', role: 'owner' },
        { id: 2, name: 'أدمن الإدارة', username: 'admin', password: '123', role: 'admin' },
        { id: 3, name: 'الدكتور المعالج', username: 'doctor', password: '123', role: 'doctor' }
      ];
      localStorage.setItem('system_users', JSON.stringify(savedUsers));
    }
    
    // البحث مع قص المسافات (trim) لضمان الدقة
    const user = savedUsers.find(u => 
      u.username.trim() === username.trim() && 
      u.password.trim() === password.trim()
    );
    
    if (user) return { role: user.role, name: user.name };
    throw new Error('اسم المستخدم أو كلمة المرور خاطئة!');
  }
};