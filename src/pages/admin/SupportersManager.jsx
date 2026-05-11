import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { fetchAllProviders, createProvider, updateProvider, deleteProvider } from '../../services/api';

export default function SupportersManager() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 🌟 تمرير الـ signal بشكل اختياري لحماية الذاكرة عند التحميل الأولي
  const loadProviders = async (signal = null) => {
    setLoading(true);
    try {
      const data = await fetchAllProviders();
      
      if (signal?.aborted) return;
      
      setProviders(data);
      setError(null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || 'فشل جلب قائمة الجهات');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  // 🌟 ربط دورة الحياة بـ AbortController
  useEffect(() => {
    const abortController = new AbortController();
    
    loadProviders(abortController.signal);
    
    return () => {
      abortController.abort();
    };
  }, []);

  const [newItemName, setNewItemName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNew = async () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return showNotification('الرجاء إدخال اسم الجهة', 'error');
    
    if (providers.some(p => p.name === trimmedName || p.provider_name === trimmedName)) {
      return showNotification('هذا الاسم موجود مسبقاً في النظام!', 'error');
    }

    setIsSubmitting(true);
    try {
      await createProvider({ name: trimmedName });
      showNotification(`تم إضافة "${trimmedName}" بنجاح`);
      setNewItemName('');
      await loadProviders(); 
    } catch (err) {
      showNotification('فشل إضافة الجهة، تأكد من الاتصال بالخادم.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف جهة "${name}" نهائياً؟`)) return;

    try {
      await deleteProvider(id);
      showNotification(`تم حذف "${name}" بنجاح`);
      setProviders(providers.filter(p => p.id !== id));
    } catch (err) {
      showNotification('فشل الحذف، قد تكون الجهة مرتبطة بطلبات طبية نشطة.', 'error');
    }
  };

  const [editingItem, setEditingItem] = useState(null); 

  const saveEdit = async () => {
    const trimmedText = editingItem.text.trim();
    if (!trimmedText) return;

    try {
      await updateProvider(editingItem.id, { name: trimmedText });
      showNotification('تم تعديل الاسم بنجاح');
      setEditingItem(null);
      await loadProviders();
    } catch (err) {
      showNotification('فشل تعديل الاسم.', 'error');
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-68px)] relative" dir="rtl">
      <Sidebar />

      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span> {toast.message}
        </div>
      )}

      <div className="flex-1 p-6 lg:p-10 w-full overflow-y-auto">
        <div className="mb-8 border-b border-gray-200 pb-4">
          <h2 className="text-3xl font-bold text-purple-800">إدارة قوائم الجهات الداعمة</h2>
          <p className="text-gray-500 mt-2 font-bold">إدارة فعلية للمشافي والجمعيات المسجلة في الخادم لربطها بالطلبات.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border-t-4 border-purple-600 mb-8 flex flex-col md:flex-row gap-4 items-end animate-fadeIn">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-2">اسم الجهة الجديدة:</label>
            <input 
              type="text" 
              value={newItemName} 
              onChange={(e) => setNewItemName(e.target.value)} 
              placeholder="مثال: مشفى الرازي" 
              className="w-full border border-gray-300 p-2.5 rounded-xl focus:ring-2 focus:ring-purple-400 outline-none transition-all" 
            />
          </div>
          <button 
            onClick={handleAddNew} 
            disabled={isSubmitting}
            className={`bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-8 rounded-xl transition-all w-full md:w-auto shadow-md ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'}`}
          >
            {isSubmitting ? 'جاري الإضافة...' : '+ إضافة للنظام'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
            <h3 className="font-bold text-purple-800 text-lg">الجهات المعتمدة في النظام</h3>
            <span className="bg-purple-200 text-purple-800 text-sm font-black px-3 py-1 rounded-full border border-purple-300">{providers.length} جهة</span>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-10">
                 <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="text-center py-10 text-red-600 font-bold border border-red-100 bg-red-50 rounded-xl">⚠️ {error}</div>
            ) : providers.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-bold border border-dashed border-gray-200 rounded-xl">لا توجد جهات داعمة مسجلة في الخادم حالياً.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((item) => {
                  const displayName = item.name || item.provider_name || 'جهة غير مسماة';
                  
                  return (
                    <div key={item.id} className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-sm hover:border-purple-300 hover:shadow-xs transition-all group flex flex-col justify-between">
                      
                      {editingItem?.id === item.id ? (
                        <div className="flex flex-col gap-3 animate-fadeIn">
                          <input 
                            type="text" 
                            value={editingItem.text} 
                            onChange={(e) => setEditingItem({...editingItem, text: e.target.value})} 
                            className="w-full border border-purple-300 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400" 
                            autoFocus 
                          />
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-600 shadow-sm">حفظ</button>
                            <button onClick={() => setEditingItem(null)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg text-xs font-bold hover:bg-gray-400 cursor-pointer">إلغاء</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="font-bold text-gray-800 mb-4 text-base truncate" title={displayName}>{displayName}</div>
                          
                          <div className="flex gap-2 pt-3 border-t border-gray-200 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setEditingItem({ id: item.id, text: displayName })} 
                              className="flex-1 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              ✏️ تعديل
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id, displayName)} 
                              className="flex-1 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              ❌ حذف
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}