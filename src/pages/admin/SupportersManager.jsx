import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import ConfirmModal from '../../components/ui/ConfirmModal'; // 🌟 استيراد نافذة التأكيد
import { 
  fetchAllProviders, 
  createProvider, 
  deleteProvider,
  fetchCategories,
  createCategory
} from '../../services/api';

export default function SupportersManager() {
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // 🌟 حالة نافذة التأكيد المخصصة
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (signal = null) => {
    setLoading(true);
    try {
      const [catsData, provsData] = await Promise.all([
        fetchCategories(signal),
        fetchAllProviders(signal)
      ]);
      if (signal?.aborted) return;
      setCategories(catsData);
      setProviders(provsData);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || 'فشل جلب هيكلية الجهات الداعمة');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    loadData(abortController.signal);
    return () => abortController.abort();
  }, []);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return showNotification('الرجاء إدخال اسم التصنيف', 'error');

    setIsSubmittingCat(true);
    try {
      await createCategory({ category_name: trimmedName });
      showNotification(`تم إضافة تصنيف "${trimmedName}" بنجاح`);
      setNewCategoryName('');
      await loadData(); 
    } catch (err) {
      showNotification('فشل إضافة التصنيف.', 'error');
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const [newProviderName, setNewProviderName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isSubmittingProv, setIsSubmittingProv] = useState(false);

  const handleAddProvider = async () => {
    const trimmedName = newProviderName.trim();
    if (!trimmedName) return showNotification('الرجاء إدخال اسم الجهة', 'error');
    if (!selectedCategoryId) return showNotification('يجب ربط الجهة بتصنيف تنظيمي', 'error');

    setIsSubmittingProv(true);
    try {
      await createProvider({ name: trimmedName, category: selectedCategoryId });
      showNotification(`تم إضافة جهة "${trimmedName}" بنجاح`);
      setNewProviderName('');
      setSelectedCategoryId('');
      await loadData(); 
    } catch (err) {
      showNotification('فشل إضافة الجهة الداعمة.', 'error');
    } finally {
      setIsSubmittingProv(false);
    }
  };

  // 🌟 استدعاء المودال بدلاً من alert
  const triggerDelete = (id, name) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  // 🌟 تنفيذ الحذف الفعلي
  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProvider(deleteModal.id);
      showNotification(`تم حذف "${deleteModal.name}" بنجاح`);
      setProviders(providers.filter(p => p.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null, name: '' });
    } catch (err) {
      showNotification('فشل الحذف، قد تكون مرتبطة بطلبات نشطة.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const groupedData = categories.map(cat => ({
    ...cat,
    linkedProviders: providers.filter(p => p.category === cat.id)
  }));
  const unassignedProviders = providers.filter(p => !p.category);

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-68px)] relative" dir="rtl">
      <Sidebar />

      {/* 🌟 نافذة الحذف المخصصة */}
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => !isDeleting && setDeleteModal({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDelete}
        title="تأكيد الحذف النهائي"
        message={`هل أنت متأكد من رغبتك في حذف جهة "${deleteModal.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
        isProcessing={isDeleting}
      />

      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span> {toast.message}
        </div>
      )}

      <div className="flex-1 p-4 lg:p-10 w-full overflow-y-auto">
        <div className="mb-8 border-b border-gray-200 pb-4">
          <h2 className="text-3xl font-bold text-purple-800">الهيكلية التنظيمية للشركاء</h2>
          <p className="text-gray-500 mt-2 font-bold">إدارة تصنيفات الجهات الداعمة وربط الفروع والمؤسسات بها.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-indigo-500 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-indigo-900 mb-4 flex items-center gap-2">
                <span>📁</span> إضافة تصنيف رئيسي
              </h3>
              <input 
                type="text" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="مثال: المستشفيات الحكومية، منظمات دولية" 
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none mb-4" 
              />
            </div>
            <button 
              onClick={handleAddCategory} 
              disabled={isSubmittingCat}
              className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md w-full ${isSubmittingCat ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isSubmittingCat ? 'جاري الإضافة...' : 'حفظ التصنيف'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border-t-4 border-emerald-500 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-emerald-900 mb-4 flex items-center gap-2">
                <span>🏢</span> إضافة جهة فرعية وربطها
              </h3>
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input 
                  type="text" 
                  value={newProviderName} 
                  onChange={(e) => setNewProviderName(e.target.value)} 
                  placeholder="اسم الجهة (مثال: مشفى الرازي)" 
                  className="flex-1 border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none" 
                />
                <select 
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="md:w-1/3 border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none bg-white font-bold text-sm"
                >
                  <option value="" disabled>-- اختر التصنيف --</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={handleAddProvider} 
              disabled={isSubmittingProv || categories.length === 0}
              className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md w-full ${isSubmittingProv || categories.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isSubmittingProv ? 'جاري الإضافة...' : 'حفظ الجهة وربطها'}
            </button>
          </div>

        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div></div>
          ) : error ? (
            <div className="bg-red-50 p-6 rounded-2xl text-red-600 font-bold text-center border border-red-100">⚠️ {error}</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded-2xl bg-white">
              الهيكلية فارغة. ابدأ بإنشاء تصنيف رئيسي أولاً.
            </div>
          ) : (
            groupedData.map((category) => (
              <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fadeIn">
                <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="font-black text-gray-800 text-lg flex items-center gap-2">
                    <span className="text-indigo-500">📁</span> {category.category_name}
                  </h3>
                  <span className="bg-white border border-gray-200 text-gray-600 text-xs font-black px-3 py-1.5 rounded-lg shadow-xs">
                    {category.linkedProviders.length} كيان
                  </span>
                </div>
                
                <div className="p-6">
                  {category.linkedProviders.length === 0 ? (
                    <p className="text-sm text-gray-400 font-bold text-center py-4">لا توجد جهات مرتبطة بهذا التصنيف حالياً.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.linkedProviders.map(provider => (
                        <div key={provider.id} className="border border-gray-100 p-4 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all group flex justify-between items-center bg-gray-50/50">
                          <span className="font-bold text-gray-700 text-sm truncate pr-2" title={provider.name}>{provider.name}</span>
                          <button 
                            onClick={() => triggerDelete(provider.id, provider.name)} // 🌟 استخدام الدالة الجديدة
                            className="text-red-400 hover:text-red-600 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {unassignedProviders.length > 0 && (
            <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 overflow-hidden mt-8 animate-fadeIn">
              <div className="bg-red-100 p-4 border-b border-red-200 flex justify-between items-center">
                <h3 className="font-black text-red-800 text-lg flex items-center gap-2">⚠️ جهات غير مصنفة (متروكة)</h3>
                <span className="bg-white text-red-600 text-xs font-black px-3 py-1.5 rounded-lg shadow-xs">{unassignedProviders.length} كيان</span>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedProviders.map(provider => (
                  <div key={provider.id} className="border border-red-100 bg-white p-4 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm truncate pr-2" title={provider.name}>{provider.name}</span>
                    <button 
                      onClick={() => triggerDelete(provider.id, provider.name)} // 🌟 استخدام الدالة الجديدة
                      className="text-red-500 hover:text-red-700 text-xs font-bold bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}