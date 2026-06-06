import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { formatCurrency, formatDate, isPastDate } from '../../utils/formatters'; 
import { 
  fetchAidRequestDetails, 
  fetchPatientDetails, 
  fetchPatientFamily,
  updateRequestStatus,
  fetchAllProviders,
  assignProviderToRequest,
  removeProviderFromRequest,
  updateAidRequest,
  updatePatientDetails 
} from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast'; 

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); 

  const isAdmin = user?.role === ROLES.ADMIN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, showNotification } = useToast();

  const [requestData, setRequestData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [familyData, setFamilyData] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  
  // 🌟 حالات تعديل الطلب الطبي أصبحت تشمل التاريخ
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editFormData, setEditFormData] = useState({ place_of_aid: '', estimated_cost: '', description: '', date_of_aid: '' });
  const [isSavingRequest, setIsSavingRequest] = useState(false);

  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [patientEditData, setPatientEditData] = useState({});
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  const [deleteContribModal, setDeleteContribModal] = useState({ isOpen: false, id: null, name: '' });
  const [isDeletingContrib, setIsDeletingContrib] = useState(false);

  const [showContributionForm, setShowContributionForm] = useState(false);
  const [contribData, setContribData] = useState({ providerId: '', amount: '', type: 'fixed', notes: '' });

  const STATUS_MAP = {
    'pending': 'قيد الدراسة',
    'processing': 'معالجة',
    'completed': 'مكتمل',
    'rejected': 'مرفوض'
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    const loadFullDetails = async () => {
      setLoading(true);
      try {
        const reqData = await fetchAidRequestDetails(id, abortController.signal);
        
        if (abortController.signal.aborted) return;

        setRequestData(reqData);
        // 🌟 تهيئة حقل التاريخ عند فتح التعديل
        setEditFormData({
          place_of_aid: reqData.place_of_aid || '',
          estimated_cost: reqData.estimated_cost || '',
          description: reqData.description || '',
          date_of_aid: reqData.date_of_aid ? reqData.date_of_aid.split('T')[0] : ''
        });
        
        if (reqData.patient) {
          const [patData, famData, provData] = await Promise.all([
            fetchPatientDetails(reqData.patient, abortController.signal),
            fetchPatientFamily(reqData.patient, abortController.signal),
            fetchAllProviders(abortController.signal)
          ]);
          
          if (abortController.signal.aborted) return;

          setPatientData(patData);
          setPatientEditData({
            first_name: patData.first_name || '',
            last_name: patData.last_name || '',
            national_number: patData.national_number || '',
            gender: patData.gender || 'male',
            phone_number: patData.phone_number || '',
            marital_status: patData.marital_status || 'single',
            monthly_salary: patData.monthly_salary || 0
          });
          setFamilyData(famData);
          setAvailableProviders(provData);
        }
        setLoading(false);
      } catch (err) {
        if (abortController.signal.aborted || err.name === 'CanceledError') return;
        if (!abortController.signal.aborted) {
          setError(err.message || 'حدث خطأ أثناء جلب تفاصيل الطلب.');
          setLoading(false);
        }
      }
    };

    loadFullDetails();
    return () => abortController.abort();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateRequestStatus(id, newStatus);
      setRequestData(prev => ({ ...prev, request_status: newStatus }));
      showNotification(`تم تغيير حالة الطلب إلى: ${newStatus}`);
    } catch (err) {
      showNotification('فشل تحديث حالة الطلب', 'error');
    }
  };

  const handleSaveRequestUpdate = async () => {
    // 🌟 حماية إضافية للتحقق من التاريخ
    if (!editFormData.place_of_aid.trim() || !editFormData.estimated_cost || !editFormData.description.trim() || !editFormData.date_of_aid) {
      return showNotification('الرجاء تعبئة كافة حقول التعديل الإجبارية بما فيها التاريخ', 'error');
    }
    setIsSavingRequest(true);
    try {
      const updated = await updateAidRequest(id, {
        place_of_aid: editFormData.place_of_aid,
        estimated_cost: Number(editFormData.estimated_cost),
        description: editFormData.description,
        date_of_aid: editFormData.date_of_aid
      });
      setRequestData(prev => ({
        ...prev,
        place_of_aid: updated.place_of_aid,
        estimated_cost: updated.estimated_cost,
        description: updated.description,
        date_of_aid: updated.date_of_aid
      }));
      setIsEditingRequest(false);
      showNotification('تم تحديث بيانات التقرير الطبي بنجاح');
    } catch (err) {
      showNotification('فشل تحديث بيانات الطلب من السيرفر', 'error');
    } finally {
      setIsSavingRequest(false);
    }
  };

  const handleSavePatientUpdate = async () => {
    if (!patientEditData.first_name.trim() || !patientEditData.last_name.trim()) {
      return showNotification('الاسم الأول والأخير حقول إجبارية', 'error');
    }
    setIsSavingPatient(true);
    try {
      const updated = await updatePatientDetails(patientData.id, patientEditData);
      setPatientData(prev => ({ ...prev, ...updated }));
      setIsEditingPatient(false);
      showNotification('تم تحديث السجل المركزي للمريض بنجاح');
    } catch (err) {
      showNotification('فشل التحديث. تأكد من توفير دالة updatePatientDetails في API', 'error');
    } finally {
      setIsSavingPatient(false);
    }
  };

  const handleAddContribution = async () => {
    if (!contribData.providerId || !contribData.amount) {
      return showNotification('الرجاء إدخال الجهة الداعمة والمبلغ', 'error');
    }

    try {
      const payload = {
        aid_request: id,
        aid_provider: contribData.providerId,
        aid_type: "financial", 
        aid_amount: contribData.amount,
        type_of_aid_amount: contribData.type,
        notes: contribData.notes
      };

      await assignProviderToRequest(id, payload);
      
      const updatedReq = await fetchAidRequestDetails(id);
      setRequestData(updatedReq);
      
      const newTotal = updatedReq.providers?.reduce((sum, item) => {
        const amount = Number(item.aid_amount);
        if (item.type_of_aid_amount === 'percentage') {
          return sum + ((amount / 100) * Number(updatedReq.estimated_cost || 0));
        }
        return sum + amount;
      }, 0) || 0;

      if (newTotal >= Number(updatedReq.estimated_cost || 0)) {
        showNotification('🎯 نجاح: تم جمع كامل المبلغ المطلوب للطلب الطـبي!', 'success');
      } else {
        showNotification('تمت إضافة المساهمة بنجاح');
      }
      
      setShowContributionForm(false);
      setContribData({ providerId: '', amount: '', type: 'fixed', notes: '' });
      
    } catch (err) {
      showNotification('فشل إضافة المساهمة. تأكد من البيانات.', 'error');
    }
  };

  const executeDeleteContribution = async () => {
    setIsDeletingContrib(true);
    try {
      await removeProviderFromRequest(deleteContribModal.id);
      const updatedReq = await fetchAidRequestDetails(id);
      setRequestData(updatedReq);
      showNotification(`تم إلغاء مساهمة "${deleteContribModal.name}" بنجاح`);
      setDeleteContribModal({ isOpen: false, id: null, name: '' });
    } catch (err) {
      showNotification('فشل حذف المساهمة.', 'error');
    } finally {
      setIsDeletingContrib(false);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-gray-50 min-h-screen" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !requestData || !patientData) {
    return (
      <div className="flex bg-gray-50 min-h-screen" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center p-10">
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 font-bold text-center">
            <span className="text-4xl block mb-2">⚠️</span>
            {error || 'الطلب غير موجود في الخادم.'}
          </div>
        </div>
      </div>
    );
  }

  const estimatedTotalCost = Number(requestData.estimated_cost || 0);

  const totalContributed = requestData.providers?.reduce((sum, item) => {
    const amount = Number(item.aid_amount);
    if (item.type_of_aid_amount === 'percentage') {
      return sum + ((amount / 100) * estimatedTotalCost);
    }
    return sum + amount;
  }, 0) || 0;

  // 🌟 العملية الحسابية المطلوبة لمعرفة المتبقي
  const remainingAmount = estimatedTotalCost - totalContributed;
  const isFullyFunded = remainingAmount <= 0 && estimatedTotalCost > 0;

  const currentStatus = STATUS_MAP[requestData.request_status] || requestData.request_status;
  const isOverdue = isPastDate(requestData.date_of_aid) && requestData.request_status !== 'completed';

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-68px)] relative" dir="rtl">
      <Sidebar />

      <ConfirmModal 
        isOpen={deleteContribModal.isOpen}
        onClose={() => !isDeletingContrib && setDeleteContribModal({ isOpen: false, id: null, name: '' })}
        onConfirm={executeDeleteContribution}
        title="إلغاء مساهمة مالية"
        message={`هل أنت متأكد من إلغاء الدعم المقدم من "${deleteContribModal.name}" لهذا الطلب؟ سيتم خصم المبلغ من الإجمالي فوراً.`}
        isProcessing={isDeletingContrib}
      />

      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 transition-all duration-300 text-white font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex-1 p-6 lg:p-10 w-full overflow-y-auto">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-200 gap-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center flex-wrap gap-3">
              تفاصيل الطلب رقم #{requestData.id}
              <span className={`text-sm px-3 py-1 rounded-full font-bold border ${ 
                currentStatus === 'مكتمل' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                isOverdue ? 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse' :
                currentStatus === 'مرفوض' ? 'bg-red-100 text-red-700 border-red-200' : 
                'bg-yellow-100 text-yellow-700 border-yellow-200' 
              }`}>
                {isOverdue ? '⚠️ فات الموعد' : currentStatus}
              </span>
              
              {isFullyFunded && (
                <span className="text-sm px-4 py-1 rounded-full font-black border bg-blue-100 text-blue-800 border-blue-300 shadow-sm flex items-center gap-2 animate-pulse">
                  🎯 تم جمع كامل المبلغ
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-2">تاريخ التنفيذ المستهدف: {formatDate(requestData.date_of_aid)}</p>
          </div>
          
          <button onClick={() => navigate(-1)} className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-xl hover:bg-gray-50 font-bold cursor-pointer transition-colors hover:-translate-x-1 text-sm shadow-sm">
            &rarr; العودة
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-t-4 border-blue-500 relative group/patient">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-blue-800">البيانات الشاملة للمستفيد</h3>
                {isAdmin && !isEditingPatient && (
                  <button 
                    onClick={() => setIsEditingPatient(true)}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-lg font-bold cursor-pointer hover:bg-blue-100 transition-all shadow-xs"
                  >
                    ✏️ تعديل البيانات
                  </button>
                )}
              </div>

              {isEditingPatient ? (
                <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-black text-gray-600 mb-1">الاسم الأول:</label><input type="text" value={patientEditData.first_name} onChange={e => setPatientEditData({...patientEditData, first_name: e.target.value})} className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400" /></div>
                    <div><label className="block text-xs font-black text-gray-600 mb-1">الاسم الأخير:</label><input type="text" value={patientEditData.last_name} onChange={e => setPatientEditData({...patientEditData, last_name: e.target.value})} className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400" /></div>
                    <div><label className="block text-xs font-black text-gray-600 mb-1">الرقم الوطني:</label><input type="text" value={patientEditData.national_number} onChange={e => setPatientEditData({...patientEditData, national_number: e.target.value})} className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 font-mono" /></div>
                    <div><label className="block text-xs font-black text-gray-600 mb-1">رقم الجوال:</label><input type="text" value={patientEditData.phone_number} onChange={e => setPatientEditData({...patientEditData, phone_number: e.target.value})} className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 font-mono" dir="ltr" /></div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 mb-1">الجنس:</label>
                      <select value={patientEditData.gender} onChange={e => setPatientEditData({...patientEditData, gender: e.target.value})} className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 mb-1">الحالة الاجتماعية:</label>
                      <select value={patientEditData.marital_status} onChange={e => setPatientEditData({...patientEditData, marital_status: e.target.value})} className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="single">أعزب/عزباء</option>
                        <option value="married">متزوج/ـة</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-gray-600 mb-1">الراتب الشهري (ل.س):</label>
                      <input type="number" value={patientEditData.monthly_salary} onChange={e => setPatientEditData({...patientEditData, monthly_salary: e.target.value})} className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
                    <button onClick={handleSavePatientUpdate} disabled={isSavingPatient} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer shadow-sm transition-colors">
                      {isSavingPatient ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                    <button onClick={() => setIsEditingPatient(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer transition-colors">
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-2">
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الاسم</span><span className="font-bold text-gray-800">{patientData.first_name} {patientData.last_name}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">تاريخ الولادة</span><span className="font-bold text-gray-800">{formatDate(patientData.birth_date)}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الرقم الوطني</span><span className="font-bold text-gray-800">{patientData.national_number || 'غير متوفر'}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الجنس</span><span className="font-bold text-gray-800">{patientData.gender === 'male' ? 'ذكر' : 'أنثى'}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">رقم الجوال</span><span className="font-bold text-gray-800" dir="ltr">{patientData.phone_number}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الحالة الاجتماعية</span><span className="font-bold text-gray-800">{patientData.marital_status === 'married' ? 'متزوج' : 'أعزب'}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الراتب الشهري</span><span className="font-black text-emerald-600">{formatCurrency(patientData.monthly_salary)}</span></div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-t-4 border-blue-500">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-blue-800">أفراد العائلة المرفقين</h3>
                {isAdmin && (
                  <button 
                    onClick={() => navigate(`/admin/patients/${patientData.id}`)}
                    className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-lg font-bold cursor-pointer hover:bg-indigo-100 transition-all shadow-xs"
                    title="لا يمكن تعديل مصفوفة العائلة من هنا، انتقل لملف المريض الأساسي"
                  >
                    ✏️ إدارة أفراد العائلة
                  </button>
                )}
              </div>
              
              {familyData.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-500 text-sm font-bold border border-dashed border-gray-200">لا يوجد أفراد عائلة مسجلين لهذا المريض.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm border-collapse">
                    <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <tr><th className="p-3 font-bold">الاسم</th><th className="p-3 font-bold">القرابة</th><th className="p-3 font-bold">الجنس</th><th className="p-3 font-bold">تاريخ الميلاد</th></tr>
                    </thead>
                    <tbody>
                      {familyData.map((m, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                          <td className="p-3 font-bold text-gray-800">{m.full_name}</td>
                          <td className="p-3 font-bold text-blue-700">{m.relation}</td>
                          <td className="p-3 text-gray-600">{m.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                          <td className="p-3 text-gray-500 font-mono">{formatDate(m.birth_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={`bg-white p-6 rounded-2xl shadow-sm border border-t-4 ${isOverdue ? 'border-orange-500' : 'border-red-500'} relative group/report`}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-red-800">التقرير الطبي والتكلفة المقدرة</h3>
                {isAdmin && !isEditingRequest && (
                  <button 
                    onClick={() => setIsEditingRequest(true)}
                    className="text-xs bg-red-50 text-red-700 border border-red-100 px-3 py-1 rounded-lg font-bold cursor-pointer hover:bg-red-100 transition-all shadow-xs"
                  >
                    ✏️ تعديل التقرير
                  </button>
                )}
              </div>

              {isEditingRequest ? (
                <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 mb-1">اسم المشفى المقترح:</label>
                      <input 
                        type="text" 
                        value={editFormData.place_of_aid}
                        onChange={(e) => setEditFormData({ ...editFormData, place_of_aid: e.target.value })}
                        className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    {/* 🌟 إضافة حقل تعديل التاريخ هنا */}
                    <div>
                      <label className="block text-xs font-black text-gray-600 mb-1">تاريخ التنفيذ المستهدف:</label>
                      <input 
                        type="date" 
                        value={editFormData.date_of_aid}
                        onChange={(e) => setEditFormData({ ...editFormData, date_of_aid: e.target.value })}
                        className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-red-400 font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-gray-600 mb-1">التكلفة التقديرية (ل.س):</label>
                      <input 
                        type="number" 
                        value={editFormData.estimated_cost}
                        onChange={(e) => setEditFormData({ ...editFormData, estimated_cost: e.target.value })}
                        className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-red-400 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 mb-1">وصف الحالة الطبية والتوصيات:</label>
                    <textarea 
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows="4"
                      className="w-full bg-white border border-gray-300 p-2.5 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-red-400 leading-relaxed"
                    ></textarea>
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
                    <button 
                      onClick={handleSaveRequestUpdate}
                      disabled={isSavingRequest}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer shadow-sm transition-colors"
                    >
                      {isSavingRequest ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingRequest(false);
                        setEditFormData({ 
                          place_of_aid: requestData.place_of_aid, 
                          estimated_cost: requestData.estimated_cost, 
                          description: requestData.description,
                          date_of_aid: requestData.date_of_aid ? requestData.date_of_aid.split('T')[0] : ''
                        });
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-5 text-sm bg-red-50 p-6 rounded-xl border border-red-100">
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">نوع المساعدة</span><span className="font-bold text-gray-800">{requestData.aid_request_type?.type_name || 'عام'}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">اسم المشفى المقترح</span><span className="font-bold text-gray-800">{requestData.place_of_aid}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">تاريخ التنفيذ</span><span className={`font-bold ${isOverdue ? 'text-orange-600' : 'text-gray-800'}`}>{formatDate(requestData.date_of_aid)}</span></div>
                  <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">التكلفة التقديرية</span><span className="font-black text-red-600 text-lg">{formatCurrency(requestData.estimated_cost)}</span></div>
                  <div className="col-span-2 mt-2">
                    <span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-2">وصف الحالة الطبية والتوصيات:</span>
                    <span className="font-bold block bg-white p-4 rounded-xl border border-red-200 text-gray-700 leading-relaxed">{requestData.description}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="space-y-6">
            <div className={`bg-white p-6 rounded-2xl shadow-sm border-2 sticky top-24 ${isOverdue ? 'border-orange-500 shadow-orange-100' : 'border-emerald-500'}`}>
              <h3 className="text-lg font-bold text-emerald-800 mb-4 border-b border-emerald-100 pb-2">لوحة القرار المالي</h3>

              <div className="space-y-2 border-b pb-6 border-gray-100">
                <button onClick={() => handleStatusChange('completed')} className={`w-full py-2.5 rounded-xl font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${requestData.request_status === 'completed' ? 'bg-emerald-700 text-white shadow-md' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>✅ اعتماد ومكتمل</button>
                <button onClick={() => handleStatusChange('processing')} className={`w-full py-2.5 rounded-xl font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${requestData.request_status === 'processing' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>🔄 قيد المعالجة</button>
                <button onClick={() => handleStatusChange('pending')} className={`w-full py-2.5 rounded-xl font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${requestData.request_status === 'pending' ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}>⏳ قيد الدراسة</button>
                <button onClick={() => handleStatusChange('rejected')} className={`w-full py-2.5 rounded-xl font-bold transition-all cursor-pointer hover:-translate-y-0.5 ${requestData.request_status === 'rejected' ? 'bg-red-600 text-white shadow-md' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>❌ رفض الطلب</button>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-bold text-gray-700">المساهمات والجهات الداعمة:</p>
                </div>

                {requestData.providers?.length === 0 ? (
                  <div className="text-center p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl mb-3 text-xs font-bold text-gray-400">لم يتم ربط جهات داعمة بهذا الطلب.</div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {requestData.providers?.map((cont) => {
                      const amountRaw = Number(cont.aid_amount);
                      const isPercentage = cont.type_of_aid_amount === 'percentage';
                      const calculatedAmount = isPercentage ? ((amountRaw / 100) * estimatedTotalCost) : amountRaw;

                      return (
                        <div key={cont.id} className="flex justify-between items-center p-3 rounded-xl border text-sm bg-emerald-50 border-emerald-100 group">
                          <div>
                            <span className="font-bold text-emerald-800 block">{cont.provider_name}</span>
                            {isPercentage && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">تغطية {amountRaw}%</span>}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="font-black text-emerald-600">{formatCurrency(calculatedAmount)}</span>
                            {isAdmin && (
                              <button 
                                onClick={() => setDeleteContribModal({ isOpen: true, id: cont.id, name: cont.provider_name })}
                                className="text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 p-1.5 rounded-lg transition-colors cursor-pointer opacity-100 lg:opacity-0 group-hover:opacity-100 shrink-0 text-xs"
                                title="إلغاء المساهمة"
                              >
                                ❌
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 🌟 إضافة العملية الحسابية (المبلغ المتبقي) أسفل الجهات الداعمة */}
                <div className={`mt-4 p-4 rounded-xl border flex justify-between items-center ${remainingAmount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200 shadow-inner'}`}>
                  <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                    {remainingAmount > 0 ? 'المبلغ المتبقي للتغطية:' : 'حالة التغطية المالية:'}
                  </span>
                  <span className={`font-black text-lg ${remainingAmount > 0 ? 'text-orange-600' : 'text-blue-700'}`}>
                    {remainingAmount > 0 ? formatCurrency(remainingAmount) : 'مُغطى بالكامل 🎯'}
                  </span>
                </div>

                {!isFullyFunded && !showContributionForm && (
                  <button onClick={() => setShowContributionForm(true)} className="w-full bg-white border-2 border-emerald-500 text-emerald-700 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition-colors text-sm cursor-pointer mt-4 shadow-sm">
                    + ربط جهة داعمة جديدة
                  </button>
                )}

                {showContributionForm && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mt-4 animate-fadeIn">
                    <select 
                      value={contribData.providerId} 
                      onChange={(e) => setContribData({...contribData, providerId: e.target.value})} 
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-400 font-bold"
                    >
                      <option value="">اختر الجهة الداعمة...</option>
                      {availableProviders.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.name}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <select value={contribData.type} onChange={(e) => setContribData({...contribData, type: e.target.value})} className="w-1/3 border border-gray-300 p-2.5 rounded-lg text-xs bg-white font-bold outline-none">
                        <option value="fixed">مبلغ مقطوع</option>
                        <option value="percentage">نسبة مئوية</option>
                      </select>
                      <input 
                        type="number" 
                        placeholder={contribData.type === 'fixed' ? "المبلغ" : "النسبة"} 
                        value={contribData.amount} 
                        onChange={(e) => setContribData({...contribData, amount: e.target.value})} 
                        className="w-2/3 border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      />
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder="ملاحظات إضافية (اختياري)" 
                      value={contribData.notes} 
                      onChange={(e) => setContribData({...contribData, notes: e.target.value})} 
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400" 
                    />

                    <div className="flex gap-2 mt-2">
                      <button onClick={handleAddContribution} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 cursor-pointer shadow-sm">إضافة</button>
                      <button onClick={() => setShowContributionForm(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-300 cursor-pointer">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}