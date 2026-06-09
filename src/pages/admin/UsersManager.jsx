import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { fetchUsers, createUser, updateUser, deleteSystemUser } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

export default function UsersManager() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ id: null, full_name: '', email: '', password: '', role: ROLES.PROCESSOR });
  const [isEditing, setIsEditing] = useState(false);
  const { toast, showNotification } = useToast(3000);

  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, userName: '', userRole: '' });

  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async (signal, params = {}) => {
    setLoading(true);

    try {
      const data = await fetchUsers(signal, params);

      if (signal?.aborted) return;

      setUsers(data);
      setError(null);
    } catch (err) {
      if (signal?.aborted || err.name === 'CanceledError') return;
      setError(err.message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    const params = {};
    if (roleFilter) params.role = roleFilter;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    loadUsers(abortController.signal, params);

    return () => {
      abortController.abort();
    };
  }, [roleFilter, searchTerm]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        email: formData.email.trim(),
        full_name: formData.full_name.trim(),
        role: formData.role,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEditing) {
        await updateUser(formData.id, payload);
        showNotification('تم تحديث بيانات المستخدم بنجاح!');
      } else {
        if (!formData.password) {
          showNotification('كلمة المرور مطلوبة لإنشاء حساب جديد!', 'error');
          return;
        }
        await createUser(payload);
        showNotification('تم إضافة المستخدم الجديد بنجاح!');
      }

      await loadUsers();
      resetForm();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const editUser = (user) => {
    if (user.id === currentUser?.id) {
      showNotification('لا يمكنك تعديل حسابك الشخصي النشط من هنا!', 'error');
      return;
    }

    setFormData({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteUser = (id, role, name) => {
    if (id === currentUser?.id) {
      showNotification('عملية مرفوضة: لا يمكنك حذف حسابك الشخصي النشط!', 'error');
      return;
    }
    setDeleteModal({ show: true, userId: id, userName: name, userRole: role });
  };

  const confirmDelete = async () => {
    try {
      await deleteSystemUser(deleteModal.userId);
      setUsers(prevUsers => prevUsers.filter(u => u.id !== deleteModal.userId));
      showNotification(`تم حذف حساب "${deleteModal.userName}" بنجاح!`);
      closeDeleteModal();
    } catch (err) {
      showNotification(err.message, 'error');
      closeDeleteModal();
    }
  };

  const closeDeleteModal = () => {
    setDeleteModal({ show: false, userId: null, userName: '', userRole: '' });
  };

  const resetForm = () => {
    setFormData({ id: null, full_name: '', email: '', password: '', role: ROLES.PROCESSOR });
    setIsEditing(false);
  };

  const getRoleName = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'مدير النظام';
      case ROLES.PROCESSOR: return 'لجنة إدارية';
      case ROLES.DOCTOR: return 'طبيب معالج';
      default: return role;
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen relative" dir="rtl">
      <Sidebar />

      {toast.show && (
        <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all transform scale-100 relative overflow-hidden border-t-8 border-red-600">
            <div className="absolute -top-10 -right-10 text-red-50 opacity-50 text-9xl">⚠️</div>
            <div className="relative z-10 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6 border-4 border-red-200">
                <span className="text-red-600 text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">هل أنت متأكد؟</h3>
              <p className="text-gray-600 mb-6">
                أنت على وشك حذف حساب <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{deleteModal.userName}</span> ({getRoleName(deleteModal.userRole)}) نهائياً من الخادم.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  ❌ نعم، احذفه الآن
                </button>
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 p-6 lg:p-10 w-full overflow-y-auto">
        <div className="mb-8 border-b border-gray-200 pb-4">
          <h2 className="text-3xl font-bold text-gray-800">إدارة حسابات النظام</h2>
          <p className="text-gray-500 mt-2 font-bold">إدارة فعلية للمستخدمين المسجلين في قاعدة بيانات الخادم.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          <div className="xl:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-10">
              <h3 className="text-lg font-bold text-blue-800 mb-6 border-b pb-2">
                {isEditing ? '✏️ تعديل بيانات المستخدم' : '➕ إضافة مستخدم جديد'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل (full_name)</label>
                  <input required type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" placeholder="مثال: د. فادي" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">البريد الإلكتروني (email)</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" dir="ltr" placeholder="example@domain.com" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    كلمة المرور
                    {isEditing && <span className="text-xs text-orange-500 mr-2">(اتركها فارغة إذا لم ترد تغييرها)</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none"
                    dir="ltr"
                    placeholder="******"
                    autoComplete={isEditing ? 'new-password' : 'new-password'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">الصلاحية (role)</label>
                  <select required name="role" value={formData.role} onChange={handleInputChange} className="w-full border border-gray-300 p-2.5 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none font-bold">
                    <option value={ROLES.ADMIN}>مدير نظام (Admin)</option>
                    <option value={ROLES.PROCESSOR}>لجنة إدارية (Processor)</option>
                    <option value={ROLES.DOCTOR}>طبيب (Doctor)</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-colors cursor-pointer">
                    {isEditing ? 'حفظ التعديلات' : 'إنشاء الحساب'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={resetForm} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer">
                      إلغاء
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className="xl:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-bold text-gray-800 text-lg">الحسابات المسجلة في الخادم ({users.length})</h3>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو البريد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-56 border border-gray-200 p-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="border border-gray-200 p-2 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  >
                    <option value="">كل الصلاحيات</option>
                    <option value={ROLES.ADMIN}>مدير نظام</option>
                    <option value={ROLES.PROCESSOR}>لجنة إدارية</option>
                    <option value={ROLES.DOCTOR}>طبيب</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-16 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : error ? (
                <div className="p-10 text-center text-red-600 font-bold">⚠️ {error}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[600px]">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b border-gray-100 bg-white">
                        <th className="p-4 font-bold whitespace-nowrap">الاسم</th>
                        <th className="p-4 font-bold whitespace-nowrap">البريد الإلكتروني</th>
                        <th className="p-4 font-bold whitespace-nowrap">الصلاحية</th>
                        <th className="p-4 font-bold text-center whitespace-nowrap">تاريخ الإنشاء</th>
                        <th className="p-4 font-bold text-center whitespace-nowrap">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => {
                        const isSelf = user.id === currentUser?.id;
                        return (
                          <tr key={user.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                            <td className="p-4 font-bold text-gray-800">
                              {user.full_name}
                              {isSelf && <span className="mr-2 text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">أنت</span>}
                            </td>
                            <td className="p-4 text-gray-600 font-mono" dir="ltr">{user.email}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${
                                user.role === ROLES.ADMIN ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                user.role === ROLES.PROCESSOR ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}>
                                {getRoleName(user.role)}
                              </span>
                            </td>
                            <td className="p-4 text-center text-gray-500 text-xs font-bold whitespace-nowrap">
                              {user.created_at ? formatDate(user.created_at) : 'غير متوفر'}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => editUser(user)}
                                  disabled={isSelf}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${isSelf ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer'}`}
                                >
                                  ✏️ تعديل
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id, user.role, user.full_name)}
                                  disabled={isSelf}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${isSelf ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer'}`}
                                >
                                  🗑️ حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
