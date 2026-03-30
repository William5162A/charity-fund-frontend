import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getRequestsData, 
  saveRequestsData, 
  getSupportersData, 
  saveSupportersData,
  getGeneralFundBalance,
  updateGeneralFundBalance
} from '../../data/mockData';
import Sidebar from '../../components/layout/Sidebar';
import { formatCurrency, formatDate, isPastDate } from '../../utils/formatters'; 

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [allRequests, setAllRequests] = useState(() => getRequestsData());
  const [request, setRequest] = useState(() => {
    const data = getRequestsData();
    const found = data.find(req => req.id === parseInt(id));
    if (found && !found.contributions) found.contributions = [];
    if (found && !found.familyMembers) found.familyMembers = [];
    return found;
  });
  
  const [supportersList, setSupportersList] = useState(() => getSupportersData());
  const [fundBalance, setFundBalance] = useState(() => getGeneralFundBalance());

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const updateRequestData = (updatedFields, successMessage) => {
    const updatedRequest = { ...request, ...updatedFields };
    const updatedRequests = allRequests.map(req => req.id === request.id ? updatedRequest : req);
    setAllRequests(updatedRequests);
    setRequest(updatedRequest);
    saveRequestsData(updatedRequests);
    if (successMessage) showNotification(successMessage);
  };

  // --- حسابات الفائض والصندوق ---
  const estimatedTotalCost = Number(request?.otherInfo?.estimatedCost || 0);
  const totalContributed = request?.contributions?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const surplusAmount = totalContributed - estimatedTotalCost;

  const handleTransferSurplus = () => {
    if (surplusAmount <= 0) return;
    
    const newBalance = updateGeneralFundBalance(surplusAmount);
    setFundBalance(newBalance);

    const transferEntry = {
      category: 'تحويل داخلي',
      supporter: 'ترحيل الفائض للصندوق العام',
      amount: -surplusAmount,
      percentageInfo: null
    };

    updateRequestData(
      { contributions: [...request.contributions, transferEntry] },
      `تم ترحيل ${formatCurrency(surplusAmount)} إلى الصندوق العام بنجاح!`
    );
  };

  const [editSection, setEditSection] = useState(null); 
  const [formData, setFormData] = useState(null);

  const startEditing = (section) => {
    setEditSection(section);
    setFormData(JSON.parse(JSON.stringify(request))); 
  };

  const handleInputChange = (e, category, field) => {
    setFormData({ ...formData, [category]: { ...formData[category], [field]: e.target.value } });
  };

  const saveBasicChanges = () => {
    updateRequestData(formData, 'تم حفظ التعديلات بنجاح!');
    setEditSection(null);
  };

  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [familyData, setFamilyData] = useState([]);

  const startEditingFamily = () => {
    setIsEditingFamily(true);
    setFamilyData(JSON.parse(JSON.stringify(request.familyMembers)));
  };

  const handleFamilyChange = (index, field, value) => {
    const updatedFamily = [...familyData];
    updatedFamily[index][field] = value;
    setFamilyData(updatedFamily);
  };

  const removeFamilyMember = (index) => {
    setFamilyData(familyData.filter((_, i) => i !== index));
  };

  const addFamilyMember = () => {
    setFamilyData([...familyData, { name: '', gender: 'ذكر', age: '0', kinship: 'ابن', note: '' }]);
  };

  const saveFamilyChanges = () => {
    updateRequestData({ familyMembers: familyData }, 'تم تحديث بيانات العائلة بنجاح!');
    setIsEditingFamily(false);
  };

  const [showContributionForm, setShowContributionForm] = useState(false);
  const [contribCategory, setContribCategory] = useState('');
  const [contribName, setContribName] = useState('');
  const [customContribName, setCustomContribName] = useState('');
  const [contribInputType, setContribInputType] = useState('amount'); 
  const [contribAmount, setContribAmount] = useState('');
  const [contribPercentage, setContribPercentage] = useState('');
  const [isEditingContribs, setIsEditingContribs] = useState(false);
  const [contribsData, setContribsData] = useState([]);

  const handleAddContribution = () => {
    let finalAmount = 0;
    if (contribInputType === 'percentage') {
      const perc = Number(contribPercentage);
      if (perc <= 0 || perc > 100) {
        showNotification('الرجاء إدخال نسبة صحيحة بين 1 و 100', 'error');
        return;
      }
      finalAmount = (perc / 100) * estimatedTotalCost;
    } else {
      finalAmount = Number(contribAmount);
    }
    
    if (finalAmount <= 0 || isNaN(finalAmount)) {
      showNotification(estimatedTotalCost === 0 && contribInputType === 'percentage' 
        ? 'لا يمكن حساب النسبة لأن التكلفة الكلية للعملية صفر!' 
        : 'عذراً، لا يمكن إضافة مساهمة بمبلغ صفر!', 'error');
      return;
    }

    if (!contribCategory && contribName !== 'GENERAL_FUND') {
      showNotification('الرجاء اختيار فئة الجهة الداعمة!', 'error');
      return;
    }

    if (contribName === 'GENERAL_FUND') {
      if (finalAmount > fundBalance) {
        showNotification(`عذراً، رصيد الصندوق العام الحالي (${formatCurrency(fundBalance)}) لا يكفي!`, 'error');
        return;
      }
      const newBal = updateGeneralFundBalance(-finalAmount);
      setFundBalance(newBal);
    }

    let finalSupporterName = contribName === 'GENERAL_FUND' ? 'الصندوق العام المتراكم' : contribName;
    let finalCategory = contribName === 'GENERAL_FUND' ? 'صندوق داخلي' : contribCategory;

    if (contribName === 'new') {
      if (!customContribName.trim()) {
        showNotification('الرجاء كتابة اسم الجهة الجديدة!', 'error');
        return;
      }
      finalSupporterName = customContribName.trim();
      const updatedSupportersList = { ...supportersList };
      if (!updatedSupportersList[contribCategory].includes(finalSupporterName)) {
        updatedSupportersList[contribCategory].push(finalSupporterName);
        setSupportersList(updatedSupportersList);
        saveSupportersData(updatedSupportersList);
      }
    } else if (!contribName) {
      showNotification('الرجاء اختيار اسم الجهة الداعمة!', 'error');
      return;
    }

    const newContribution = { 
      category: finalCategory, 
      supporter: finalSupporterName, 
      amount: finalAmount,
      percentageInfo: contribInputType === 'percentage' ? contribPercentage : null 
    };

    updateRequestData(
      { contributions: [...request.contributions, newContribution] }, 
      `تمت إضافة مساهمة ${finalSupporterName} بنجاح!`
    );

    setContribCategory('');
    setContribName('');
    setCustomContribName('');
    setContribAmount('');
    setContribPercentage('');
    setShowContributionForm(false);
  };

  const startEditingContribs = () => {
    setIsEditingContribs(true);
    setContribsData(JSON.parse(JSON.stringify(request.contributions)));
  };

  const handleContribChange = (index, field, value) => {
    const updated = [...contribsData];
    updated[index][field] = value;
    setContribsData(updated);
  };

  const removeContrib = (index) => {
    setContribsData(contribsData.filter((_, i) => i !== index));
  };

  // 🌟 التعديل المحاسبي الذكي: معالجة الفروقات في الصندوق عند الحذف أو التعديل
  const saveContribsChanges = () => {
    let oldFundImpact = 0;
    request.contributions.forEach(c => {
      if (c.supporter === 'ترحيل الفائض للصندوق العام' || c.supporter === 'الصندوق العام المتراكم') {
        oldFundImpact += Number(c.amount);
      }
    });

    let newFundImpact = 0;
    contribsData.forEach(c => {
      if (c.supporter === 'ترحيل الفائض للصندوق العام' || c.supporter === 'الصندوق العام المتراكم') {
        newFundImpact += Number(c.amount);
      }
    });

    // المعادلة: الأثر القديم - الأثر الجديد يعطينا القيمة التي يجب إعادتها للصندوق
    const difference = oldFundImpact - newFundImpact;
    if (difference !== 0) {
      const newBal = updateGeneralFundBalance(difference);
      setFundBalance(newBal);
    }

    updateRequestData({ contributions: contribsData }, 'تم تحديث سجل المساهمات بنجاح!');
    setIsEditingContribs(false);
  };

  const renderField = (label, category, field, type = "text", options = []) => {
    const isEditing = editSection === category;
    const value = isEditing && formData ? formData[category]?.[field] : request[category]?.[field];

    if (isEditing) {
      if (options.length > 0) {
        return (
          <div>
            <span className="text-gray-500 block mb-1 text-xs">{label}:</span>
            <select value={value || ''} onChange={(e) => handleInputChange(e, category, field)} className="w-full border border-blue-300 p-1.5 rounded bg-blue-50 focus:ring-2 focus:ring-blue-400">
              <option value="">اختر...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        );
      }
      return (
        <div>
          <span className="text-gray-500 block mb-1 text-xs">{label}:</span>
          <input type={type} value={value || ''} onChange={(e) => handleInputChange(e, category, field)} className="w-full border border-blue-300 p-1.5 rounded bg-blue-50 focus:ring-2 focus:ring-blue-400" />
        </div>
      );
    }

    const isOverdue = field === 'surgeryDate' && (isPastDate(value) && request.status === 'قيد الدراسة');
    const isOfficiallyPastDue = field === 'surgeryDate' && request.status === 'فات الموعد';

    return (
      <div>
        <span className="text-gray-500 block mb-1 text-xs">{label}:</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${isOverdue || isOfficiallyPastDue ? 'text-orange-600' : 'text-gray-800'}`}>
            {type === 'date' ? formatDate(value) : 
             (field === 'salary' || field === 'estimatedCost') ? formatCurrency(value) : 
             (value || 'غير معلوم')}
          </span>
          {isOverdue && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">⚠️ تجاوز الموعد المقترح</span>}
        </div>
      </div>
    );
  };

  if (!request) return <div className="p-10 text-center text-xl font-bold mt-20">الطلب غير موجود!</div>;

  const isRequestOverdueWarning = isPastDate(request.otherInfo?.surgeryDate) && request.status === 'قيد الدراسة';
  const isOfficiallyPastDue = request.status === 'فات الموعد';

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-68px)] relative" dir="rtl">
      <Sidebar />

      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl z-50 flex items-center gap-3 transition-all duration-300 text-white font-bold ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex-1 p-6 md:p-10 w-full overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              تفاصيل الطلب رقم #{request.id}
              <span className={`text-sm px-3 py-1 rounded-full font-bold ${ 
                request.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' : 
                isOfficiallyPastDue ? 'bg-orange-100 text-orange-700' :
                isRequestOverdueWarning ? 'bg-red-600 text-white animate-bounce' : 
                request.status === 'مرفوض' ? 'bg-red-100 text-red-700' : 
                'bg-yellow-100 text-yellow-700' 
              }`}>
                {isOfficiallyPastDue ? '⚠️ فات الموعد' : isRequestOverdueWarning ? '⚠️ متجاوز للموعد (يحتاج قرار)' : (request.status || 'قيد الدراسة')}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">تاريخ تقديم الطلب: {formatDate(request.date)}</p>
          </div>
          {/* 🌟 تعديل زر العودة للرجوع للصفحة السابقة مباشرة */}
          <button onClick={() => navigate(-1)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 font-bold cursor-pointer transition-colors">&rarr; العودة</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-t-4 border-blue-500">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-blue-800">البيانات الشاملة للمستفيد</h3>
                {editSection !== 'beneficiary' ? (
                  <button onClick={() => startEditing('beneficiary')} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-sm font-bold">✏️ تعديل</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveBasicChanges} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded text-sm font-bold">حفظ</button>
                    <button onClick={() => setEditSection(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1 rounded text-sm font-bold">إلغاء</button>
                  </div>
                )}
              </div>
              <h4 className="font-bold text-gray-700 mb-3 mt-4 bg-gray-100 px-2 py-1 rounded w-max text-sm">المعلومات الشخصية</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
                {renderField('الاسم الثلاثي', 'beneficiary', 'fullName')}
                {renderField('الجنس', 'beneficiary', 'gender', 'text', ['ذكر', 'أنثى'])}
                {renderField('اسم ونسبة الأم', 'beneficiary', 'motherName')}
                {renderField('مكان الولادة', 'beneficiary', 'birthPlace')}
                {renderField('تاريخ الولادة', 'beneficiary', 'birthDate', 'date')}
                {renderField('الرقم الوطني', 'beneficiary', 'nationalId')}
                {renderField('رقم دفتر العائلة', 'beneficiary', 'familyBookNumber')}
              </div>
              <h4 className="font-bold text-gray-700 mb-3 bg-gray-100 px-2 py-1 rounded w-max text-sm">السكن والتواصل</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
                {renderField('مكان السكن', 'beneficiary', 'address')}
                {renderField('صفة المنزل', 'beneficiary', 'houseStatus', 'text', ['ملك', 'آجار', 'للأقارب'])}
                {renderField('الرعية', 'beneficiary', 'parish', 'text', ['رعية الأربعين شهيد', 'رعية أم الزنار', 'أخرى'])}
                {renderField('كاهن الرعية', 'beneficiary', 'priest')}
                {renderField('الهاتف الأرضي', 'beneficiary', 'landline')}
                {renderField('رقم الجوال', 'beneficiary', 'mobile')}
              </div>
              <h4 className="font-bold text-gray-700 mb-3 bg-gray-100 px-2 py-1 rounded w-max text-sm">الوضع العائلي والمهني</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {renderField('الوضع العائلي', 'beneficiary', 'maritalStatus', 'text', ['عازب', 'متزوج'])}
                {renderField('عدد أفراد العائلة', 'beneficiary', 'familyMembersCount', 'number')}
                {renderField('نوع العمل', 'beneficiary', 'jobType')}
                {renderField('العمل الحالي', 'beneficiary', 'job')}
                {renderField('الراتب الشهري', 'beneficiary', 'salary', 'number')}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-t-4 border-blue-500">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-blue-800">أفراد العائلة المرفقين</h3>
                {!isEditingFamily ? (
                  <button onClick={startEditingFamily} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded text-sm font-bold">✏️ تعديل أفراد العائلة</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveFamilyChanges} className="bg-emerald-600 text-white px-4 py-1 rounded text-sm font-bold">حفظ</button>
                    <button onClick={() => setIsEditingFamily(false)} className="bg-gray-200 text-gray-800 px-4 py-1 rounded text-sm font-bold">إلغاء</button>
                  </div>
                )}
              </div>
              {!isEditingFamily ? (
                request.familyMembers.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded text-center text-gray-500 text-sm font-bold border border-dashed">لا يوجد أفراد عائلة مسجلين.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm border-collapse">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr><th className="p-2 border-b">الاسم</th><th className="p-2 border-b">الجنس</th><th className="p-2 border-b">العمر</th><th className="p-2 border-b">القرابة</th><th className="p-2 border-b">ملاحظة</th></tr>
                      </thead>
                      <tbody>
                        {request.familyMembers.map((m, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50"><td className="p-2">{m.name}</td><td className="p-2">{m.gender}</td><td className="p-2">{m.age}</td><td className="p-2 font-bold">{m.kinship}</td><td className="p-2">{m.note}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {familyData.map((m, idx) => (
                    <div key={idx} className="flex flex-wrap gap-2 items-center bg-blue-50 p-2 rounded border border-blue-100">
                      <input type="text" value={m.name} onChange={(e) => handleFamilyChange(idx, 'name', e.target.value)} placeholder="الاسم" className="flex-1 border p-1 rounded text-sm min-w-30" />
                      <select value={m.gender} onChange={(e) => handleFamilyChange(idx, 'gender', e.target.value)} className="border p-1 rounded text-sm bg-white">
                        <option>ذكر</option><option>أنثى</option>
                      </select>
                      <input type="number" value={m.age} onChange={(e) => handleFamilyChange(idx, 'age', e.target.value)} placeholder="العمر" className="w-16 border p-1 rounded text-sm" />
                      <select value={m.kinship} onChange={(e) => handleFamilyChange(idx, 'kinship', e.target.value)} className="border p-1 rounded text-sm bg-white">
                        <option>أب</option><option>أم</option><option>ابن</option><option>ابنة</option><option>زوج</option><option>زوجة</option>
                      </select>
                      <input type="text" value={m.note || ''} onChange={(e) => handleFamilyChange(idx, 'note', e.target.value)} placeholder="ملاحظة" className="flex-1 border p-1 rounded text-sm min-w-25" />
                      <button onClick={() => removeFamilyMember(idx)} className="bg-red-100 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-200">❌</button>
                    </div>
                  ))}
                  <button onClick={addFamilyMember} className="w-full border-2 border-dashed border-blue-300 text-blue-600 py-2 rounded font-bold hover:bg-blue-50 text-sm mt-2">+ إضافة فرد جديد</button>
                </div>
              )}
            </div>

            <div className={`bg-white p-6 rounded-xl shadow-sm border border-t-4 ${(isRequestOverdueWarning || isOfficiallyPastDue) ? 'border-orange-500' : 'border-red-500'}`}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-lg font-bold text-red-800">التقرير الطبي والتكلفة</h3>
                {editSection !== 'otherInfo' ? (
                  <button onClick={() => startEditing('otherInfo')} className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded text-sm font-bold">✏️ تعديل</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveBasicChanges} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded text-sm font-bold">حفظ</button>
                    <button onClick={() => setEditSection(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1 rounded text-sm font-bold">إلغاء</button>
                  </div>
                )}
              </div>

              {isRequestOverdueWarning && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-bold flex items-center gap-2">
                  🚨 تنبيه: تاريخ العمل الجراحي المقترح قد مضى والطلب لا يزال قيد الدراسة!
                </div>
              )}
              {isOfficiallyPastDue && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm font-bold flex items-center gap-2">
                  ⚠️ حالة هذا الطلب مسجلة حالياً كـ "فات الموعد".
                </div>
              )}

              <div className="grid grid-cols-2 gap-5 text-sm bg-red-50 p-5 rounded-lg border border-red-100">
                {renderField('نوع المساعدة', 'otherInfo', 'surgeryType', 'text', ['عمل جراحي', 'أدوية', 'معاينة طبيب'])}
                {renderField('اسم المشفى المقترح', 'otherInfo', 'hospital')}
                {renderField('تاريخ العمل', 'otherInfo', 'surgeryDate', 'date')}
                {renderField('الاحتياجات الخاصة', 'otherInfo', 'specialNeeds')}
                <div className="col-span-2">
                  {renderField('التكلفة التقديرية', 'otherInfo', 'estimatedCost', 'number')}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block mb-1 text-xs">ملاحظات الطبيب العامة:</span>
                  {editSection === 'otherInfo' ? (
                    <textarea value={formData.otherInfo.generalNote || ''} onChange={(e) => handleInputChange(e, 'otherInfo', 'generalNote')} className="w-full border border-blue-300 p-2 rounded bg-blue-50 focus:ring-2 focus:ring-blue-400 h-20" />
                  ) : (
                    <span className="font-bold block bg-white p-3 rounded border text-gray-700">{request.otherInfo?.generalNote || 'لا يوجد ملاحظات'}</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className={`bg-white p-6 rounded-xl shadow-sm border-2 sticky top-24 ${isRequestOverdueWarning ? 'border-red-600 shadow-red-100' : isOfficiallyPastDue ? 'border-orange-500 shadow-orange-100' : 'border-emerald-500'}`}>
              <h3 className="text-lg font-bold text-emerald-800 mb-4 border-b border-emerald-100 pb-2">لوحة القرار المالي</h3>
              
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center">
                <span className="text-xs text-emerald-700 font-bold uppercase">رصيد الصندوق العام:</span>
                <span className="text-sm font-black text-emerald-800">{formatCurrency(fundBalance)}</span>
              </div>

              <div className="space-y-2 mt-4 border-b pb-6">
                <button onClick={() => updateRequestData({ status: 'مكتمل' }, 'تم الاعتماد')} className={`w-full py-2 rounded font-bold transition-all ${request.status === 'مكتمل' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>✅ اعتماد ومكتمل</button>
                <button onClick={() => updateRequestData({ status: 'قيد الدراسة' }, 'قيد الدراسة')} className={`w-full py-2 rounded font-bold transition-all ${request.status === 'قيد الدراسة' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}>⏳ قيد الدراسة</button>
                <button onClick={() => updateRequestData({ status: 'مرفوض' }, 'تم الرفض')} className={`w-full py-2 rounded font-bold transition-all ${request.status === 'مرفوض' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>❌ رفض الطلب</button>
                <button onClick={() => updateRequestData({ status: 'فات الموعد' }, 'تم تحويل الحالة إلى: فات الموعد')} className={`w-full py-2 rounded font-bold transition-all ${request.status === 'فات الموعد' ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>⚠️ فات الموعد</button>
              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-bold text-gray-700">المساهمات والجهات الداعمة:</p>
                  {!isEditingContribs ? (
                    request.contributions.length > 0 && <button onClick={startEditingContribs} className="text-emerald-600 text-xs font-bold hover:underline">✏️ تعديل والحذف</button>
                  ) : (
                    <button onClick={saveContribsChanges} className="bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold">حفظ التغييرات</button>
                  )}
                </div>

                {surplusAmount > 0 && (
                  <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-xl animate-pulse">
                    <p className="text-xs font-bold text-cyan-800 mb-2">⚠️ يوجد فائض تبرع بقيمة {formatCurrency(surplusAmount)}</p>
                    <button 
                      onClick={handleTransferSurplus}
                      className="w-full bg-cyan-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-cyan-700 transition-all shadow-md cursor-pointer"
                    >
                      ترحيل الفائض للصندوق العام 📥
                    </button>
                  </div>
                )}

                {!isEditingContribs ? (
                  request.contributions.length === 0 ? (
                    <div className="text-center p-3 bg-gray-50 border border-dashed border-gray-300 rounded mb-3 text-xs text-gray-500">لم يتم إضافة مساهمات.</div>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {request.contributions.map((cont, index) => (
                        <div key={index} className={`flex justify-between items-center p-2 rounded border text-sm ${cont.amount < 0 ? 'bg-gray-100 border-gray-200 opacity-70' : 'bg-emerald-50 border-emerald-100'}`}>
                          <div>
                            <span className="text-xs text-gray-500 bg-white px-1 rounded ml-1 border shadow-sm">{cont.category}</span>
                            <span className="font-bold text-emerald-800">{cont.supporter}</span>
                            {cont.amount < 0 && <span className="text-[10px] bg-gray-400 text-white px-1 rounded mx-1">مرحل</span>}
                            {cont.percentageInfo && <span className="text-xs text-emerald-600 mr-2">({cont.percentageInfo}%)</span>}
                          </div>
                          <span className={`font-black ${cont.amount < 0 ? 'text-gray-500' : 'text-emerald-600'}`}>{formatCurrency(Math.abs(cont.amount))}</span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-2 mb-4">
                    {contribsData.map((cont, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-emerald-50 p-2 rounded border border-emerald-200">
                        <span className="text-xs font-bold w-1/2 truncate">{cont.supporter}</span>
                        <input type="number" value={cont.amount} disabled={cont.supporter === 'ترحيل الفائض للصندوق العام'} onChange={(e) => handleContribChange(idx, 'amount', e.target.value)} className="w-1/3 border p-1 rounded text-xs disabled:bg-gray-200" />
                        <button onClick={() => removeContrib(idx)} className="text-red-500 hover:bg-red-100 rounded px-2 cursor-pointer">❌</button>
                      </div>
                    ))}
                  </div>
                )}

                {!isEditingContribs && (
                  showContributionForm ? (
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-3">
                      
                      <select 
                        value={contribName} 
                        onChange={(e) => {
                          setContribName(e.target.value);
                          if (e.target.value === 'GENERAL_FUND') {
                            setContribCategory('صندوق داخلي');
                          } else {
                            setContribCategory('');
                          }
                          setCustomContribName('');
                        }} 
                        className="w-full border p-2 rounded text-sm bg-white font-bold outline-none"
                      >
                        <option value="">اختر مصدر الدعم...</option>
                        <optgroup label="خزنة النظام">
                          <option value="GENERAL_FUND" className="text-blue-600 font-bold">💰 الصندوق العام (المتاح: {formatCurrency(fundBalance)})</option>
                        </optgroup>
                        {Object.keys(supportersList).map(cat => (
                          <optgroup key={cat} label={cat}>
                            {supportersList[cat].map(name => <option key={name} value={name}>{name}</option>)}
                          </optgroup>
                        ))}
                        <option value="new" className="font-bold text-emerald-600">+ إضافة خيار جديد...</option>
                      </select>

                      {contribName === 'new' && (
                        <>
                          <select value={contribCategory} onChange={(e) => setContribCategory(e.target.value)} className="w-full border p-2 rounded text-sm bg-white outline-none">
                            <option value="">اختر تصنيف الجهة الجديدة...</option>
                            {Object.keys(supportersList).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                          <input type="text" placeholder="اكتب اسم الجهة الجديدة هنا..." value={customContribName} onChange={(e) => setCustomContribName(e.target.value)} className="w-full border border-emerald-400 p-2 rounded text-sm bg-emerald-50 outline-none" />
                        </>
                      )}

                      {contribName && contribName !== 'GENERAL_FUND' && contribName !== 'new' && (
                         <div className="text-xs text-gray-500 bg-white p-1 rounded border text-center">
                           تصنيف الجهة: 
                           <span className="font-bold mr-1">
                             {Object.keys(supportersList).find(cat => supportersList[cat].includes(contribName))}
                             {setTimeout(() => {
                               const cat = Object.keys(supportersList).find(cat => supportersList[cat].includes(contribName));
                               if(contribCategory !== cat) setContribCategory(cat);
                             }, 0) && ""}
                           </span>
                         </div>
                      )}

                      <div className="flex gap-2 bg-white p-1 rounded border">
                        <button type="button" onClick={() => { setContribInputType('amount'); setContribAmount(''); }} className={`flex-1 text-xs py-1.5 rounded transition-all cursor-pointer ${contribInputType === 'amount' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}>مبلغ مقطوع</button>
                        <button type="button" onClick={() => { setContribInputType('percentage'); setContribPercentage(''); }} className={`flex-1 text-xs py-1.5 rounded transition-all cursor-pointer ${contribInputType === 'percentage' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}>نسبة مئوية (%)</button>
                      </div>

                      {contribInputType === 'amount' ? (
                        <input type="number" placeholder="أدخل المبلغ (ل.س)" value={contribAmount} onChange={(e) => setContribAmount(e.target.value)} className="w-full border p-2 rounded text-sm outline-none focus:border-emerald-500" />
                      ) : (
                        <div>
                          <input type="number" placeholder="أدخل النسبة (مثال: 50)" max="100" min="1" value={contribPercentage} onChange={(e) => setContribPercentage(e.target.value)} className="w-full border border-emerald-400 p-2 rounded text-sm bg-emerald-50 focus:ring-2 focus:ring-emerald-400 outline-none" />
                          {contribPercentage && (
                            <p className="text-xs text-emerald-700 mt-2 font-bold text-center bg-emerald-100 py-1 rounded">
                              القيمة المحسوبة: {formatCurrency((Number(contribPercentage) / 100) * estimatedTotalCost)}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-2">
                        <button onClick={handleAddContribution} className="flex-1 bg-emerald-600 text-white py-1.5 rounded text-sm font-bold hover:bg-emerald-700 cursor-pointer">إضافة الدعم</button>
                        <button onClick={() => setShowContributionForm(false)} className="flex-1 bg-gray-300 text-gray-700 py-1.5 rounded text-sm font-bold hover:bg-gray-400 cursor-pointer">إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowContributionForm(true)} className="w-full bg-white border-2 border-emerald-600 text-emerald-700 py-2 rounded font-bold hover:bg-emerald-50 transition-colors text-sm cursor-pointer">+ إضافة تمويل</button>
                  )
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}