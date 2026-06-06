import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { formatDate } from '../../utils/formatters';
import { 
  fetchPatientDetails, 
  fetchPatientFamily,
  addPatientFamilyMember,
  updatePatientFamilyMember,
  deletePatientFamilyMember
} from '../../services/api';
import { useToast } from '../../hooks/useToast';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showNotification } = useToast();

  const [patientData, setPatientData] = useState(null);
  const [familyData, setFamilyData] = useState([]);

  // حالات نموذج إضافة/تعديل فرد
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', relation: '', gender: 'male', birth_date: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // حالة حذف فرد
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    const loadData = async () => {
      try {
        const [patData, famData] = await Promise.all([
          fetchPatientDetails(id, abortController.signal),
          fetchPatientFamily(id, abortController.signal)
        ]);

        if (abortController.signal.aborted) return;

        setPatientData(patData);
        setFamilyData(famData);
        setLoading(false);
      } catch (err) {
        if (abortController.signal.aborted || err.name === 'CanceledError') return;
        if (!abortController.signal.aborted) {
          setError(err.message || 'فشل جلب بيانات المريض.');
          setLoading(false);
        }
      }
    };

    loadData();
    return () => abortController.abort();
  }, [id]);

  const resetForm = () => {
    setFormData({ full_name: '', relation: '', gender: 'male', birth_date: '' });
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditClick = (member) => {
    setFormData({
      full_name: member.full_name,
      relation: member.relation,
      gender: member.gender,
      birth_date: member.birth_date ? member.birth_date.split('T')[0] : ''
    });
    setEditingId(member.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSaveMember = async () => {
    if (!formData.full_name.trim() || !formData.relation.trim() || !formData.birth_date) {
      return showNotification('الرجاء إدخال الاسم، القرابة، وتاريخ الميلاد', 'error');
    }

    setIsProcessing(true);
    try {
      if (isEditing) {
        const updated = await updatePatientFamilyMember(editingId, formData);
        setFamilyData(prev => prev.map(m => m.id === editingId ? updated : m));
        showNotification('تم تحديث بيانات فرد العائلة بنجاح');
      } else {
        const added = await addPatientFamilyMember(id, formData);
        setFamilyData(prev => [...prev, added]);
        showNotification('تمت إضافة فرد جديد للعائلة');
      }
      resetForm();
    } catch (err) {
      showNotification('فشل حفظ البيانات. تأكد من إعدادات الباك إند.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeDeleteMember = async () => {
    setIsDeleting(true);
    try {
      await deletePatientFamilyMember(deleteModal.id);
      setFamilyData(prev => prev.filter(m => m.id !== deleteModal.id));
      showNotification(`تم حذف "${deleteModal.name}" من سجل العائلة`);
      setDeleteModal({ isOpen: false, id: null, name: '' });
    } catch (err) {
      showNotification('فشل عملية الحذف.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="flex bg-gray-50 min-h-screen" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center p-10">
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 font-bold text-center">
            ⚠️ {error || 'سجل المريض غير موجود.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen relative" dir="rtl">
      <Sidebar />

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => !isDeleting && setDeleteModal({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDeleteMember}
        title="حذف فرد من العائلة"
        message={`هل أنت متأكد من حذف السجل الخاص بـ "${deleteModal.name}" بشكل نهائي من قاعدة البيانات؟`}
        isProcessing={isDeleting}
      />

      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 transition-all duration-300 text-white font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex-1 p-6 lg:p-10 w-full overflow-y-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4">
          <h2 className="text-3xl font-bold text-gray-800">
            السجل المركزي للمريض <span className="text-indigo-600 font-mono">#{patientData.id}</span>
          </h2>
          <button 
            onClick={() => navigate(-1)} 
            className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-50 font-bold cursor-pointer transition-colors hover:-translate-x-1 text-sm shadow-sm"
          >
            &rarr; العودة
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto">
          
          {/* ملخص بيانات المريض (للقراءة فقط هنا لربط السياق) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">صاحب الملف الأساسي</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-400 block text-[10px] uppercase font-black mb-1">الاسم</span><span className="font-bold text-gray-800">{patientData.first_name} {patientData.last_name}</span></div>
              <div><span className="text-gray-400 block text-[10px] uppercase font-black mb-1">الرقم الوطني</span><span className="font-bold font-mono text-gray-800">{patientData.national_number || '---'}</span></div>
              <div><span className="text-gray-400 block text-[10px] uppercase font-black mb-1">رقم الجوال</span><span className="font-bold font-mono text-gray-800" dir="ltr">{patientData.phone_number}</span></div>
              <div><span className="text-gray-400 block text-[10px] uppercase font-black mb-1">تاريخ الولادة</span><span className="font-bold font-mono text-gray-800">{formatDate(patientData.birth_date)}</span></div>
            </div>
          </div>

          {/* لوحة إدارة العائلة */}
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-indigo-900">إدارة أفراد العائلة</h3>
                <p className="text-xs text-indigo-600 mt-1 font-bold">المرفقين تحت الملف الحالي: {familyData.length} أفراد</p>
              </div>
              {!showForm && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  + إضافة فرد جديد
                </button>
              )}
            </div>

            {showForm && (
              <div className="p-6 bg-gray-50 border-b border-gray-200 animate-fadeIn">
                <h4 className="font-bold text-gray-700 mb-4">{isEditing ? 'تعديل بيانات فرد مسجل' : 'تسجيل فرد جديد في العائلة'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-1">الاسم الكامل:</label>
                    <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-1">درجة القرابة:</label>
                    <input type="text" placeholder="مثال: ابن، زوجة، أم" value={formData.relation} onChange={e => setFormData({...formData, relation: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-1">الجنس:</label>
                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold">
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-1">تاريخ الميلاد:</label>
                    <input type="date" value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 font-mono" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={handleSaveMember} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer shadow-sm transition-colors">
                    {isProcessing ? 'جاري الحفظ...' : 'حفظ البيانات'}
                  </button>
                  <button onClick={resetForm} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer transition-colors">
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            <div className="p-0 overflow-x-auto">
              {familyData.length === 0 ? (
                <div className="p-10 text-center text-gray-400 font-bold">لا يوجد أفراد مسجلين في عائلة هذا المريض حالياً.</div>
              ) : (
                <table className="w-full text-right text-sm border-collapse">
                  <thead className="bg-white text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="p-4 font-bold">الاسم الكامل</th>
                      <th className="p-4 font-bold">القرابة</th>
                      <th className="p-4 font-bold">الجنس</th>
                      <th className="p-4 font-bold">تاريخ الميلاد</th>
                      <th className="p-4 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {familyData.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-800">{member.full_name}</td>
                        <td className="p-4 text-indigo-700 font-bold">{member.relation}</td>
                        <td className="p-4 text-gray-600">{member.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                        <td className="p-4 text-gray-500 font-mono">{formatDate(member.birth_date)}</td>
                        <td className="p-4 text-center space-x-2 space-x-reverse">
                          <button 
                            onClick={() => handleEditClick(member)}
                            className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
                          >
                            تعديل
                          </button>
                          <button 
                            onClick={() => setDeleteModal({ isOpen: true, id: member.id, name: member.full_name })}
                            className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}