import React, { useState } from 'react';
import { getSupportersData, saveSupportersData } from '../../data/mockData';
import Sidebar from '../../components/layout/Sidebar';

export default function SupportersManager() {
  const [supportersList, setSupportersList] = useState(() => getSupportersData());
  const categories = Object.keys(supportersList);

  // نظام الإشعارات
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const updateData = (newData, message) => {
    setSupportersList(newData);
    saveSupportersData(newData);
    showNotification(message);
  };

  // 1. إضافة جهة جديدة
  const [newItemName, setNewItemName] = useState('');
  const [selectedCategoryForNew, setSelectedCategoryForNew] = useState(categories[0]);

  const handleAddNew = () => {
    if (!newItemName.trim()) return showNotification('الرجاء إدخال اسم الجهة', 'error');
    if (supportersList[selectedCategoryForNew].includes(newItemName.trim())) return showNotification('هذا الاسم موجود مسبقاً!', 'error');

    const newData = { ...supportersList };
    newData[selectedCategoryForNew].push(newItemName.trim());
    updateData(newData, `تم إضافة "${newItemName}" إلى ${selectedCategoryForNew} بنجاح`);
    setNewItemName('');
  };

  // 2. الحذف
  const handleDelete = (category, itemIndex) => {
    const newData = { ...supportersList };
    const itemName = newData[category][itemIndex];
    newData[category].splice(itemIndex, 1);
    updateData(newData, `تم حذف "${itemName}" بنجاح`);
  };

  // 3. التعديل (تغيير الاسم)
  const [editingItem, setEditingItem] = useState(null); // { category, index, text }

  const saveEdit = () => {
    if (!editingItem.text.trim()) return;
    const newData = { ...supportersList };
    newData[editingItem.category][editingItem.index] = editingItem.text.trim();
    updateData(newData, 'تم تعديل الاسم بنجاح');
    setEditingItem(null);
  };

  // 4. النقل لفئة أخرى
  const [movingItem, setMovingItem] = useState(null); // { category, index, text }

  const handleMove = (targetCategory) => {
    if (movingItem.category === targetCategory) return setMovingItem(null);
    
    const newData = { ...supportersList };
    const itemName = newData[movingItem.category][movingItem.index];
    
    // إزالة من القديم
    newData[movingItem.category].splice(movingItem.index, 1);
    // إضافة للجديد
    newData[targetCategory].push(itemName);
    
    updateData(newData, `تم نقل "${itemName}" إلى ${targetCategory}`);
    setMovingItem(null);
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-68px)] relative" dir="rtl">
      <Sidebar />

      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span> {toast.message}
        </div>
      )}

      <div className="flex-1 p-6 md:p-10 w-full overflow-y-auto">
        <div className="mb-8 border-b pb-4">
          <h2 className="text-3xl font-bold text-purple-800">إدارة قوائم الجهات الداعمة</h2>
          <p className="text-gray-500 mt-2">من هنا يمكنك إضافة، تعديل، حذف، ونقل أسماء الجمعيات والمشافي.</p>
        </div>

        {/* صندوق الإضافة السريعة */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-purple-600 mb-8 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-1">اسم الجهة الجديدة:</label>
            <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="مثال: مشفى الرازي" className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-400 outline-none" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-1">إلى فئة:</label>
            <select value={selectedCategoryForNew} onChange={(e) => setSelectedCategoryForNew(e.target.value)} className="w-full border p-2 rounded bg-white focus:ring-2 focus:ring-purple-400 outline-none">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <button onClick={handleAddNew} className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-6 rounded transition-colors w-full md:w-auto h-10 cursor-pointer">
            + إضافة للنظام
          </button>
        </div>

        {/* عرض القوائم الحالية */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {categories.map(category => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
              <div className="bg-purple-50 p-3 border-b border-purple-100 flex justify-between items-center">
                <h3 className="font-bold text-purple-800 text-lg">{category}</h3>
                <span className="bg-purple-200 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">{supportersList[category]?.length || 0}</span>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto max-h-96 space-y-2">
                {/* 🌟 إصلاح خطأ الشاشة البيضاء وتصحيح الأقواس هنا */}
                {(!supportersList[category] || supportersList[category].length === 0) ? (
                  <p className="text-center text-gray-400 text-sm py-4 font-bold border border-dashed border-gray-200 rounded-lg">القائمة فارغة</p>
                ) : (
                  supportersList[category].map((item, index) => (
                    <div key={`${item}-${index}`} className="bg-gray-50 border border-gray-100 p-2 rounded text-sm hover:border-purple-300 transition-colors group">
                      
                      {/* وضع التعديل (الاسم) */}
                      {editingItem?.category === category && editingItem?.index === index ? (
                        <div className="flex gap-1 mb-2">
                          <input type="text" value={editingItem.text} onChange={(e) => setEditingItem({...editingItem, text: e.target.value})} className="flex-1 border border-purple-300 p-1 rounded text-xs outline-none" autoFocus />
                          <button onClick={saveEdit} className="bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold cursor-pointer">حفظ</button>
                          <button onClick={() => setEditingItem(null)} className="bg-gray-300 px-2 py-1 rounded text-xs font-bold hover:bg-gray-400 cursor-pointer">إلغاء</button>
                        </div>
                      ) : (
                        <div className="font-bold text-gray-800 mb-2 truncate" title={item}>{item}</div>
                      )}

                      {/* وضع النقل لفئة أخرى */}
                      {movingItem?.category === category && movingItem?.index === index ? (
                        <div className="flex gap-1 mt-2 border-t pt-2">
                          <select onChange={(e) => handleMove(e.target.value)} defaultValue="" className="flex-1 border border-purple-300 p-1 rounded text-xs bg-white outline-none">
                            <option value="" disabled>انقل إلى...</option>
                            {categories.filter(c => c !== category).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button onClick={() => setMovingItem(null)} className="bg-gray-300 px-2 py-1 rounded text-xs font-bold hover:bg-gray-400 cursor-pointer">إلغاء</button>
                        </div>
                      ) : (
                        /* أزرار الإجراءات */
                        !editingItem && !movingItem && (
                          <div className="flex gap-1 mt-2 pt-2 border-t border-gray-200 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingItem({ category, index, text: item })} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-1 rounded text-xs font-bold cursor-pointer transition-colors">✏️ تعديل</button>
                            <button onClick={() => setMovingItem({ category, index, text: item })} className="flex-1 bg-purple-50 text-purple-600 hover:bg-purple-100 py-1 rounded text-xs font-bold cursor-pointer transition-colors">🔄 نقل</button>
                            <button onClick={() => handleDelete(category, index)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 py-1 rounded text-xs font-bold cursor-pointer transition-colors">❌ حذف</button>
                          </div>
                        )
                      )}
                    </div>
                  )) // نهاية الدالة map
                )} {/* نهاية جملة الشرط الثلاثية */}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}