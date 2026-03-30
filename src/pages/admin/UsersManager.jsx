import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function UsersManager() {
  // جلب المستخدمين من الذاكرة أو وضع الافتراضيين
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('system_users');
    if (saved) return JSON.parse(saved);
    const defaultUsers = [
      { id: 1, name: 'المالك العام', username: 'owner', password: '123', role: 'owner' },
      { id: 2, name: 'أدمن الإدارة', username: 'admin', password: '123', role: 'admin' },
      { id: 3, name: 'الدكتور المعالج', username: 'doctor', password: '123', role: 'doctor' }
    ];
    localStorage.setItem('system_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  });

  const [formData, setFormData] = useState({ id: null, name: '', username: '', password: '', role: 'admin' });
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // 🌟 State جديد لإدارة نافذة تأكيد الحذف المخصصة
  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, userName: '', userRole: '' });

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const saveToStorage = (updatedUsers) => {
    setUsers(updatedUsers);
    localStorage.setItem('system_users', JSON.stringify(updatedUsers));
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isDuplicate = users.some(u => u.username === formData.username && u.id !== formData.id);
    if (isDuplicate) {
      showNotification('اسم المستخدم (Username) موجود مسبقاً!', 'error');
      return;
    }

    if (isEditing) {
      const updatedUsers = users.map(u => u.id === formData.id ? formData : u);
      saveToStorage(updatedUsers);
      showNotification('تم تحديث بيانات المستخدم بنجاح!');
    } else {
      const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      const newUser = { ...formData, id: newId };
      saveToStorage([...users, newUser]);
      showNotification('تم إضافة المستخدم الجديد بنجاح!');
    }
    resetForm();
  };

  const editUser = (user) => {
    if (user.role === 'owner') {
      showNotification('لا يمكن تعديل بيانات المالك العام!', 'error');
      return;
    }
    setFormData(user);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🌟 تعديل دالة deleteUser لفتح النافذة المخصصة بدلاً من alert المتصفح
  const deleteUser = (id, role, name) => {
    if (role === 'owner') {
      showNotification('لا يمكن حذف حساب المالك العام!', 'error');
      return;
    }
    // فتح النافذة وتخزين بيانات المستخدم المراد حذفه
    setDeleteModal({ show: true, userId: id, userName: name, userRole: role });
  };

  // 🌟 دالة جديدة لإتمام عملية الحذف الفعلية من داخل النافذة
  const confirmDelete = () => {
    const updatedUsers = users.filter(u => u.id !== deleteModal.userId);
    saveToStorage(updatedUsers);
    showNotification(`تم حذف حساب "${deleteModal.userName}" بنجاح!`);
    closeDeleteModal(); // إغلاق النافذة بعد الحذف
  };

  // 🌟 دالة جديدة لإغلاق نافذة الحذف دون فعل شيء
  const closeDeleteModal = () => {
    setDeleteModal({ show: false, userId: null, userName: '', userRole: '' });
  };

  const resetForm = () => {
    setFormData({ id: null, name: '', username: '', password: '', role: 'admin' });
    setIsEditing(false);
  };

  const getRoleName = (role) => {
    switch(role) {
      case 'owner': return 'مالك النظام';
      case 'admin': return 'إداري (لجنة)';
      case 'doctor': return 'طبيب معالج';
      default: return role;
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen relative" dir="rtl">
      <Sidebar />

      {/* التوست الافتراضي للإشعارات السريعة */}
      {toast.show && (
        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 🔴 نافذة تأكيد الحذف المخصصة (Modal) - تظهر فوق كل شيء 🔴 🌟 */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-100 flex items-center justify-center p-4 animate-fadeIn">
          {/* محتوى النافذة */}
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all transform scale-100 relative overflow-hidden border-t-8 border-red-600">
            
            {/* أيقونة تحذير خلفية كبيرة باهتة لجمالية التصميم */}
            <div className="absolute -top-10 -right-10 text-red-50 opacity-50 text-9xl">⚠️</div>
            
            <div className="relative z-10 text-center">
              {/* أيقونة تحذير علوية */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6 border-4 border-red-200">
                <span className="text-red-600 text-4xl">⚠️</span>
              </div>
              
              <h3 className="text-2xl font-black text-gray-800 mb-2">هل أنت متأكد؟</h3>
              <p className="text-gray-600 mb-6">
                أنت على وشك حذف حساب <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{deleteModal.userName}</span> ({getRoleName(deleteModal.userRole)}) نهائياً من النظام. لا يمكن التراجع عن هذا الإجراء.
              </p>
              
              {/* أزرار الإجراءات */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  ❌ نعم، احذفه الآن
                </button>
                <button 
                  onClick={closeDeleteModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>

            {/* زر إغلاق صغير في الزاوية */}
            <button onClick={closeDeleteModal} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 text-2xl outline-none">×</button>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 md:p-10 w-full overflow-y-auto">
        <div className="mb-8 border-b border-gray-200 pb-4">
          <h2 className="text-3xl font-bold text-gray-800">إدارة حسابات النظام</h2>
          <p className="text-gray-500 mt-2">قم بإنشاء وتعديل حسابات الأطباء وأعضاء اللجنة الإدارية وإدارة صلاحياتهم.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* نموذج الإضافة / التعديل */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-10">
              <h3 className="text-lg font-bold text-blue-800 mb-6 border-b pb-2">
                {isEditing ? '✏️ تعديل بيانات المستخدم' : '➕ إضافة مستخدم جديد'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل (الظاهر)</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" placeholder="مثال: د. أحمد" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">اسم المستخدم (للدخول)</label>
                  <input required type="text" name="username" value={formData.username} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" dir="ltr" placeholder="مثال: ahmed_doc" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
                  <input required type="text" name="password" value={formData.password} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" dir="ltr" placeholder="******" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">نوع الصلاحية</label>
                  <select required name="role" value={formData.role} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none font-bold">
                    <option value="admin">إداري (لجنة الصندوق)</option>
                    <option value="doctor">طبيب (رفع طلبات فقط)</option>
                  </select>
                </div>
                
                <div className="pt-4 flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-colors">
                    {isEditing ? 'حفظ التعديلات' : 'إنشاء الحساب'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={resetForm} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded-lg transition-colors">
                      إلغاء
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* جدول المستخدمين */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">الحسابات المسجلة في النظام ({users.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="text-sm text-gray-500 border-b border-gray-100">
                      <th className="p-4 font-bold">الاسم</th>
                      <th className="p-4 font-bold">اسم الدخول</th>
                      <th className="p-4 font-bold">الصلاحية</th>
                      <th className="p-4 font-bold text-center">كلمة السر</th>
                      <th className="p-4 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                        <td className="p-4 font-bold text-gray-800">{user.name}</td>
                        <td className="p-4 text-gray-600 font-mono" dir="ltr">{user.username}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {getRoleName(user.role)}
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-400 font-mono">
                          {user.role === 'owner' ? '***' : user.password}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => editUser(user)}
                              disabled={user.role === 'owner'}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${user.role === 'owner' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            >
                              تعديل
                            </button>
                            {/* 🌟 تعديل هنا لتمرير اسم المستخدم أيضاً لدالة الحذف */}
                            <button 
                              onClick={() => deleteUser(user.id, user.role, user.name)}
                              disabled={user.role === 'owner'}
                              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${user.role === 'owner' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}