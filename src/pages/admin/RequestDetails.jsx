import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { formatCurrency, formatDate, isPastDate } from '../../utils/formatters'; 
import { 
  fetchAidRequestDetails, 
  fetchPatientDetails, 
  fetchPatientFamily,
  updateRequestStatus,
  fetchAllProviders,
  assignProviderToRequest
} from '../../services/api';

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [requestData, setRequestData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [familyData, setFamilyData] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  
  // الاحتفاظ بالصندوق العام محلياً لحين توفر API خاص به
  const [fundBalance, setFundBalance] = useState(() => Number(localStorage.getItem('general_fund')) || 100000);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 🌟 استخدام AbortController للمعالجة النظيفة للذاكرة
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadFullDetails = async () => {
      setLoading(true);
      try {
        const reqData = await fetchAidRequestDetails(id);
        
        if (abortController.signal.aborted) return;

        setRequestData(reqData);
        
        if (reqData.patient) {
          const [patData, famData, provData] = await Promise.all([
            fetchPatientDetails(reqData.patient),
            fetchPatientFamily(reqData.patient),
            fetchAllProviders()
          ]);
          
          if (abortController.signal.aborted) return;

          setPatientData(patData);
          setFamilyData(famData.results || famData);
          setAvailableProviders(provData);
        }
        setLoading(false);
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err.message || 'حدث خطأ أثناء جلب تفاصيل الطلب.');
          setLoading(false);
        }
      }
    };

    loadFullDetails();
    
    return () => { 
      abortController.abort(); // 🌟 تدمير الطلبات المعلقة عند الخروج من الصفحة
    };
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

  const estimatedTotalCost = Number(requestData?.estimated_cost || 0);
  const totalContributed = requestData?.providers?.reduce((sum, item) => sum + Number(item.aid_amount), 0) || 0;
  const surplusAmount = totalContributed - estimatedTotalCost;

  const STATUS_MAP = {
    'pending': 'قيد الدراسة',
    'processing': 'معالجة',
    'completed': 'مكتمل',
    'rejected': 'مرفوض'
  };

  const [showContributionForm, setShowContributionForm] = useState(false);
  const [contribData, setContribData] = useState({ providerId: '', amount: '', type: 'fixed', notes: '' });

  const handleAddContribution = async () => {
    if (!contribData.providerId || !contribData.amount) {
      showNotification('الرجاء إدخال الجهة الداعمة والمبلغ', 'error');
      return;
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
      
      showNotification('تمت إضافة المساهمة بنجاح');
      setShowContributionForm(false);
      setContribData({ providerId: '', amount: '', type: 'fixed', notes: '' });
      
    } catch (err) {
      showNotification('فشل إضافة المساهمة. تأكد من البيانات.', 'error');
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

  const currentStatus = STATUS_MAP[requestData.request_status] || requestData.request_status;
  const isOverdue = isPastDate(requestData.date_of_aid) && requestData.request_status !== 'completed';

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-68px)] relative" dir="rtl">
      <Sidebar />

      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 transition-all duration-300 text-white font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex-1 p-6 lg:p-10 w-full overflow-y-auto">
        
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              تفاصيل الطلب رقم #{requestData.id}
              <span className={`text-sm px-3 py-1 rounded-full font-bold border ${ 
                currentStatus === 'مكتمل' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                isOverdue ? 'bg-orange-100 text-orange-700 border-orange-200 animate-pulse' :
                currentStatus === 'مرفوض' ? 'bg-red-100 text-red-700 border-red-200' : 
                'bg-yellow-100 text-yellow-700 border-yellow-200' 
              }`}>
                {isOverdue ? '⚠️ فات الموعد' : currentStatus}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">تاريخ التنفيذ المستهدف: {formatDate(requestData.date_of_aid)}</p>
          </div>
          <button onClick={() => navigate(-1)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-bold cursor-pointer transition-colors hover:-translate-x-1">&rarr; العودة</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-t-4 border-blue-500">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-blue-800">البيانات الشاملة للمستفيد</h3>
                <span className="text-xs text-gray-400 font-bold">جُلب من جدول المرضى</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الاسم</span><span className="font-bold text-gray-800">{patientData.first_name} {patientData.last_name}</span></div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">تاريخ الولادة</span><span className="font-bold text-gray-800">{formatDate(patientData.birth_date)}</span></div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الرقم الوطني</span><span className="font-bold text-gray-800">{patientData.national_number || 'غير متوفر'}</span></div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الجنس</span><span className="font-bold text-gray-800">{patientData.gender === 'male' ? 'ذكر' : 'أنثى'}</span></div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">رقم الجوال</span><span className="font-bold text-gray-800" dir="ltr">{patientData.phone_number}</span></div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الحالة الاجتماعية</span><span className="font-bold text-gray-800">{patientData.marital_status === 'married' ? 'متزوج' : 'أعزب'}</span></div>
                <div><span className="text-gray-400 block text-[10px] uppercase tracking-wider font-black mb-1">الراتب الشهري</span><span className="font-black text-emerald-600">{formatCurrency(patientData.monthly_salary)}</span></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-t-4 border-blue-500">
              <h3 className="text-lg font-bold text-blue-800 mb-4 border-b pb-2">أفراد العائلة المرفقين</h3>
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

            <div className={`bg-white p-6 rounded-2xl shadow-sm border border-t-4 ${isOverdue ? 'border-orange-500' : 'border-red-500'}`}>
              <h3 className="text-lg font-bold text-red-800 mb-4 border-b pb-2">التقرير الطبي والتكلفة المقدرة</h3>
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
            </div>

          </div>

          <div className="space-y-6">
            <div className={`bg-white p-6 rounded-2xl shadow-sm border-2 sticky top-24 ${isOverdue ? 'border-orange-500 shadow-orange-100' : 'border-emerald-500'}`}>
              <h3 className="text-lg font-bold text-emerald-800 mb-4 border-b border-emerald-100 pb-2">لوحة القرار المالي</h3>
              
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                <span className="text-[11px] text-emerald-700 font-black uppercase tracking-wider">رصيد الصندوق العام:</span>
                <span className="text-lg font-black text-emerald-800">{formatCurrency(fundBalance)}</span>
              </div>

              <div className="space-y-2 mt-4 border-b pb-6 border-gray-100">
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
                    {requestData.providers?.map((cont) => (
                      <div key={cont.id} className="flex justify-between items-center p-3 rounded-xl border text-sm bg-emerald-50 border-emerald-100">
                        <div>
                          <span className="font-bold text-emerald-800 block">{cont.provider_name}</span>
                          {cont.type_of_aid_amount === 'percentage' && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">نسبة مئوية</span>}
                        </div>
                        <span className="font-black text-emerald-600">{formatCurrency(cont.aid_amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {showContributionForm ? (
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
                        className="w-2/3 border border-gray-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400 font-mono" 
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
                ) : (
                  <button onClick={() => setShowContributionForm(true)} className="w-full bg-white border-2 border-emerald-500 text-emerald-700 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition-colors text-sm cursor-pointer mt-2 shadow-sm">
                    + ربط جهة داعمة جديدة
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}