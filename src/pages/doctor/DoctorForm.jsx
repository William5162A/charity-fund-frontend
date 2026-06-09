import React, { useState, useEffect } from 'react';
import GlobalHeader from '../../components/layout/GlobalHeader'; 
import { formatDate, formatCurrency } from '../../utils/formatters';
import { 
  createPatient, 
  createFamilyMember, 
  createAidRequest,
  searchPatients,
  fetchRequestsByPatientId
} from '../../services/api';
import { useToast } from '../../hooks/useToast';

export default function DoctorForm() {
  const { toast, showNotification } = useToast(5000);

  // 🌟 إدارة حالة الواجهة الجديدة
  const [wizardStep, setWizardStep] = useState('search'); // 'search' | 'new_patient' | 'selected_patient'
  
  // 🌟 حالات محرك البحث
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const initialFormState = {
    beneficiary: {
      fullName: '', gender: 'ذكر', motherName: '', birthPlace: '', birthDate: '', nationalId: '', familyBookNumber: '',
      address: '', houseStatus: 'ملك', parish: 'رعية الأربعين شهيد', priest: '', landline: '', mobile: '',
      maritalStatus: 'عازب', familyMembersCount: '', jobType: '', job: '', salary: ''
    },
    otherInfo: {
      surgeryType: 'عمل جراحي', hospital: '', surgeryDate: '', specialNeeds: '', estimatedCost: '', generalNote: ''
    }
  };

  const [formData, setFormData] = useState(initialFormState);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preventInvalidChars = (e) => {
    if (["e", "E", "-", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (category, field, value) => {
    setFormData(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  // 🌟 نظام الـ Debounce الاحترافي للبحث الفوري
 // 🌟 نظام الـ Debounce الاحترافي + الفلترة الصارمة المحلية
 useEffect(() => {
  const query = searchQuery.trim();
  if (!query) {
    setSearchResults([]);
    setIsSearching(false);
    return;
  }

  setIsSearching(true);
  const abortController = new AbortController();

  const timer = setTimeout(async () => {
    try {
      // 1. جلب البيانات من الخادم (الذي قد يرسل كل شيء حالياً)
      const rawResults = await searchPatients(query, abortController.signal);
      
      // 2. 🌟 الدرع المعماري: الفلترة الصارمة في الواجهة الأمامية
      const strictResults = rawResults.filter(patient => {
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
        const natNumber = patient.national_number || '';
        
        // التطابق الصارم: يجب أن يحتوي الاسم أو الرقم الوطني على النص المكتوب حرفياً
        return fullName.includes(query.toLowerCase()) || natNumber.includes(query);
      });

      setSearchResults(strictResults);
    } catch (error) {
      if (error.name !== 'CanceledError') {
        showNotification(error.message, 'error');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, 400); // تقليل หน่วง الزمن قليلاً لزيادة الاستجابة

  return () => {
    clearTimeout(timer);
    abortController.abort(); 
  };
}, [searchQuery]);

  // 🌟 اختيار المريض من القائمة وجلب سجلاته
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setWizardStep('selected_patient');
    setIsLoadingHistory(true);
    setSearchQuery('');
    setSearchResults([]);

    try {
      const history = await fetchRequestsByPatientId(patient.id);
      // ترتيب تنازلي (الأحدث أولاً)
      const sortedHistory = history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPatientHistory(sortedHistory);
    } catch (error) {
      showNotification('فشل جلب تاريخ المريض الطبي.', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleStartNewPatient = () => {
    setWizardStep('new_patient');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPatient(null);
    setFormData(initialFormState);
  };

  const resetToSearch = () => {
    setWizardStep('search');
    setSelectedPatient(null);
    setSearchQuery('');
    setSearchResults([]);
    setPatientHistory([]);
    setFormData(initialFormState);
    setFamilyMembers([]);
  };

  // 🌟 إرسال البيانات للباك إند
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    let targetPatientId = selectedPatient ? selectedPatient.id : null; 

    try {
      if (wizardStep === 'new_patient') {
        const nameParts = formData.beneficiary.fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || 'مجهول';
        const maritalStatusMap = { 'عازب': 'single', 'متزوج': 'married', 'أرمل': 'widowed', 'مطلق': 'divorced' };

        const patientPayload = {
          first_name: firstName,
          last_name: lastName,
          mother_full_name: formData.beneficiary.motherName,
          birth_date: formData.beneficiary.birthDate,
          gender: formData.beneficiary.gender === 'ذكر' ? 'male' : 'female',
          national_number: formData.beneficiary.nationalId,
          family_booklet_no: formData.beneficiary.familyBookNumber,
          current_residence: formData.beneficiary.address,
          phone_number: formData.beneficiary.mobile,
          marital_status: maritalStatusMap[formData.beneficiary.maritalStatus] || 'single',
          monthly_salary: Number(formData.beneficiary.salary) || 0,
        };

        const createdPatient = await createPatient(patientPayload);
        targetPatientId = createdPatient.id;

        if (familyMembers.length > 0) {
          if (!targetPatientId) {
            showNotification('تعذر الحصول على معرف المريض لربط أفراد العائلة.', 'error');
          } else {
            const familyPromises = familyMembers.map(member => {
              return createFamilyMember(targetPatientId, {
                full_name: member.full_name,
                gender: member.gender === 'ذكر' ? 'male' : 'female',
                relation: member.relation,
                patient: targetPatientId,
                birth_date: new Date(new Date().setFullYear(new Date().getFullYear() - Number(member.age))).toISOString().split('T')[0]
              });
            });
            await Promise.all(familyPromises);
          }
        }
      }

      const aidRequestPayload = {
        patient: targetPatientId,
        place_of_aid: formData.otherInfo.hospital,
        date_of_aid: formData.otherInfo.surgeryDate,
        estimated_cost: Number(formData.otherInfo.estimatedCost) || 0,
        description: `النوع: ${formData.otherInfo.surgeryType} | الاحتياجات: ${formData.otherInfo.specialNeeds} | ملاحظات: ${formData.otherInfo.generalNote}`,
      };

      await createAidRequest(aidRequestPayload);

      showNotification('تم إرسال الاستمارة الطبية بنجاح وتحويلها للجنة الإدارية!');
      resetToSearch(); 
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      if (wizardStep === 'new_patient' && targetPatientId) {
        showNotification('⚠️ تم حفظ بيانات المريض، لكن فشل إرسال الطلب الطبي. يرجى مراجعة اللجنة الإدارية.', 'error');
      } else {
        showNotification(error.message || 'حدث خطأ أثناء إرسال البيانات.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addFamilyMember = () => setFamilyMembers([...familyMembers, { full_name: '', gender: 'ذكر', age: '', relation: 'ابن', note: '' }]);
  const updateFamilyMember = (index, field, value) => {
    const updated = [...familyMembers];
    updated[index][field] = value;
    setFamilyMembers(updated);
  };
  const removeFamilyMember = (index) => setFamilyMembers(familyMembers.filter((_, i) => i !== index));

  const STATUS_MAP = {
    'pending': { label: 'قيد الدراسة', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'processing': { label: 'معالجة', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    'completed': { label: 'مكتمل', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'rejected': { label: 'مرفوض', color: 'bg-red-100 text-red-700 border-red-200' }
  };

  const numberInputClass = "w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const textInputClass = "w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none";

  return (
    <div className="bg-gray-50 min-h-screen relative flex flex-col" dir="rtl">
      
      {/* <GlobalHeader />  */}

      {toast.show && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-10 w-full flex-grow flex flex-col">
        
        {/* =========================================================
            المرحلة 1: محرك البحث الفوري
        ========================================================= */}
        {wizardStep === 'search' && (
          <div className="w-full max-w-3xl mx-auto mt-10 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-blue-800 text-white p-8 text-center border-b-4 border-emerald-500">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">🔍</div>
                <h1 className="text-2xl md:text-3xl font-bold">تحديد هوية المريض</h1>
                <p className="mt-2 text-blue-100 font-bold text-sm">ابحث بالرقم الوطني أو الاسم لربط الطلب الجديد بسجل المريض</p>
              </div>
              
              <div className="p-8">
                <div className="relative mb-6">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو الرقم الوطني..." 
                    className="w-full border-2 border-gray-200 p-4 pl-12 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 outline-none text-lg font-bold transition-colors shadow-inner"
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                {/* 🌟 نتائج البحث المباشرة */}
                {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
                  <div className="text-center p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 font-bold mb-6">
                    لم يتم العثور على مريض مطابق لهذا البحث.
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm max-h-64 overflow-y-auto bg-white">
                    {searchResults.map(patient => (
                      <div 
                        key={patient.id} 
                        onClick={() => handleSelectPatient(patient)}
                        className="p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors group"
                      >
                        <div>
                          <p className="font-bold text-gray-800 text-lg group-hover:text-blue-800">{patient.first_name} {patient.last_name}</p>
                          <p className="text-sm text-gray-500 font-mono mt-1">{patient.national_number || 'بدون رقم وطني'}</p>
                        </div>
                        <button className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          اختيار
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative flex py-5 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="shrink-0 mx-4 text-gray-400 text-sm font-bold">أو</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button 
                  onClick={handleStartNewPatient}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-xl shadow-md transition-all cursor-pointer hover:-translate-y-1 flex justify-center items-center gap-2"
                >
                  <span className="text-2xl">+</span> إضافة مريض جديد بالكامل
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            المرحلة 2 & 3: النماذج (مريض موجود أو جديد)
        ========================================================= */}
        {wizardStep !== 'search' && (
          <div className="w-full bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden animate-fadeIn">
            
            <div className="bg-blue-800 text-white p-6 flex flex-col md:flex-row justify-between items-center px-6 md:px-8 border-b-4 border-emerald-500 gap-4">
              <h1 className="text-xl md:text-2xl font-bold">
                {wizardStep === 'selected_patient' ? 'إضافة طلب طبي لمريض مسجل' : 'تسجيل مريض جديد'}
              </h1>
              <button onClick={resetToSearch} className="bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer w-full md:w-auto">
                &times; إلغاء وتغيير المريض
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 lg:p-8 space-y-8">
              
              {/* --- قسم المريض المختار (عرض الهوية والتاريخ) --- */}
              {wizardStep === 'selected_patient' && selectedPatient && (
                <div className="space-y-6">
                  {/* البطاقة الشخصية */}
                  <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-inner">
                    <h2 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-100 pb-2">
                      <span>👤</span> الهوية الشخصية المعتمدة
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="block text-[10px] uppercase font-black text-gray-400 mb-1">الاسم الكامل</span><span className="font-bold text-gray-800">{selectedPatient.first_name} {selectedPatient.last_name}</span></div>
                      <div><span className="block text-[10px] uppercase font-black text-gray-400 mb-1">الرقم الوطني</span><span className="font-bold text-gray-800 font-mono">{selectedPatient.national_number || 'غير متوفر'}</span></div>
                      <div><span className="block text-[10px] uppercase font-black text-gray-400 mb-1">تاريخ الولادة</span><span className="font-bold text-gray-800">{selectedPatient.birth_date || 'غير متوفر'}</span></div>
                      <div><span className="block text-[10px] uppercase font-black text-gray-400 mb-1">رقم الجوال</span><span className="font-bold text-gray-800" dir="ltr">{selectedPatient.phone_number || 'غير متوفر'}</span></div>
                    </div>
                  </section>

                  

                  {/* سجل الطلبات السابقة (التاريخ الطبي) */}
                  <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                      <span>📋</span> السجل الطبي والطلبات السابقة
                    </h2>
                    
                    {isLoadingHistory ? (
                      <div className="flex justify-center p-6"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : patientHistory.length === 0 ? (
                      <div className="text-center p-6 bg-gray-50 rounded-xl text-gray-500 font-bold border border-dashed border-gray-200">
                        لا يوجد أي طلبات طبية سابقة مسجلة لهذا المريض.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm border-collapse min-w-[600px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-3 font-bold text-gray-600 border-b">رقم الطلب</th>
                              <th className="p-3 font-bold text-gray-600 border-b">تاريخ الإرسال</th>
                              <th className="p-3 font-bold text-gray-600 border-b">التكلفة</th>
                              <th className="p-3 font-bold text-center text-gray-600 border-b">حالة الطلب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {patientHistory.map(req => {
                              const status = STATUS_MAP[req.request_status] || STATUS_MAP['pending'];
                              return (
                                <tr key={req.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                  <td className="p-3 font-mono text-gray-500">#{req.id}</td>
                                  <td className="p-3 font-bold text-gray-700">{formatDate(req.created_at || req.date_of_aid)}</td>
                                  <td className="p-3 font-black text-emerald-600">{formatCurrency(req.estimated_cost)}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${status.color}`}>
                                      {status.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* --- قسم المريض الجديد --- */}
              {wizardStep === 'new_patient' && (
                <>
                  <section>
                    <h2 className="text-xl font-bold text-blue-800 mb-6 border-b-2 border-blue-50 pb-2 flex items-center gap-2">
                      <span>👤</span> المعلومات الشخصية للمستفيد
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الثلاثي *</label>
                        <input required type="text" value={formData.beneficiary.fullName} onChange={(e) => handleInputChange('beneficiary', 'fullName', e.target.value)} className={textInputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الجنس *</label>
                        <select required value={formData.beneficiary.gender} onChange={(e) => handleInputChange('beneficiary', 'gender', e.target.value)} className={textInputClass}>
                          <option>ذكر</option><option>أنثى</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">اسم ونسبة الأم *</label>
                        <input required type="text" value={formData.beneficiary.motherName} onChange={(e) => handleInputChange('beneficiary', 'motherName', e.target.value)} className={textInputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الرقم الوطني *</label>
                        <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.beneficiary.nationalId} onChange={(e) => handleInputChange('beneficiary', 'nationalId', e.target.value)} className={numberInputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">رقم دفتر العائلة *</label>
                        <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.beneficiary.familyBookNumber} onChange={(e) => handleInputChange('beneficiary', 'familyBookNumber', e.target.value)} className={numberInputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الولادة *</label>
                        <input required type="date" value={formData.beneficiary.birthDate} onChange={(e) => handleInputChange('beneficiary', 'birthDate', e.target.value)} className={textInputClass} />
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-bold text-blue-800 mb-6 border-b-2 border-blue-50 pb-2 flex items-center gap-2">
                      <span>🏡</span> السكن والتواصل
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">مكان السكن بالتفصيل *</label>
                        <input required type="text" value={formData.beneficiary.address} onChange={(e) => handleInputChange('beneficiary', 'address', e.target.value)} className={textInputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">رقم الجوال *</label>
                        <input required type="text" value={formData.beneficiary.mobile} onChange={(e) => handleInputChange('beneficiary', 'mobile', e.target.value)} className={textInputClass} dir="ltr" placeholder="+963..." />
                      </div>
                    </div>
                  </section>

                  <section>
                    <h2 className="text-xl font-bold text-blue-800 mb-6 border-b-2 border-blue-50 pb-2 flex items-center gap-2">
                      <span>💼</span> الوضع المهني والمالي
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الوضع العائلي *</label>
                        <select required value={formData.beneficiary.maritalStatus} onChange={(e) => handleInputChange('beneficiary', 'maritalStatus', e.target.value)} className={textInputClass}>
                          <option>عازب</option><option>متزوج</option><option>أرمل</option><option>مطلق</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">الراتب / الدخل الشهري (ل.س) *</label>
                        <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.beneficiary.salary} onChange={(e) => handleInputChange('beneficiary', 'salary', e.target.value)} className={numberInputClass} />
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b-2 border-blue-50 pb-2 gap-4">
                      <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                        <span>👨‍👩‍👧‍👦</span> أفراد العائلة (اختياري)
                      </h2>
                      <button type="button" onClick={addFamilyMember} className="w-full md:w-auto bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 text-sm transition-colors cursor-pointer shadow-sm">
                        + إضافة فرد
                      </button>
                    </div>
                    
                    {familyMembers.length === 0 ? (
                      <div className="text-center p-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-400 font-bold">
                        لا يوجد أفراد عائلة مسجلين حالياً.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {familyMembers.map((member, index) => (
                          <div key={index} className="flex flex-col md:flex-row gap-3 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <input required type="text" placeholder="الاسم" value={member.full_name} onChange={(e) => updateFamilyMember(index, 'full_name', e.target.value)} className={`${textInputClass} md:flex-1`} />
                            <select required value={member.gender} onChange={(e) => updateFamilyMember(index, 'gender', e.target.value)} className={`${textInputClass} md:w-auto`}>
                              <option>ذكر</option><option>أنثى</option>
                            </select>
                            <input required type="number" min="0" onKeyDown={preventInvalidChars} placeholder="العمر" value={member.age} onChange={(e) => updateFamilyMember(index, 'age', e.target.value)} className={`${numberInputClass} md:w-24`} />
                            <select required value={member.relation} onChange={(e) => updateFamilyMember(index, 'relation', e.target.value)} className={`${textInputClass} md:w-auto`}>
                              <option>أب</option><option>أم</option><option>ابن</option><option>ابنة</option><option>زوج</option><option>زوجة</option>
                            </select>
                            <button type="button" onClick={() => removeFamilyMember(index)} className="w-full md:w-auto bg-red-50 text-red-600 border border-red-200 p-2.5 rounded-lg hover:bg-red-100 font-bold transition-colors cursor-pointer">حذف</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* --- قسم التقرير الطبي مشترك ويظهر دائماً --- */}
              <section className="bg-red-50 p-6 md:p-8 rounded-2xl border border-red-100">
                <h2 className="text-xl font-bold text-red-800 mb-6 border-b-2 border-red-100 pb-2 flex items-center gap-2">
                  <span>🩺</span> التقرير والطلب الطبي الجديد
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block text-sm font-bold text-red-900 mb-2">نوع المساعدة المطلوبة *</label>
                    <select required value={formData.otherInfo.surgeryType} onChange={(e) => handleInputChange('otherInfo', 'surgeryType', e.target.value)} className="w-full border border-red-200 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-400 outline-none">
                      <option>عمل جراحي</option><option>أدوية</option><option>معاينة طبيب</option><option>أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-red-900 mb-2">اسم المشفى المقترح للتنفيذ *</label>
                    <input required type="text" value={formData.otherInfo.hospital} onChange={(e) => handleInputChange('otherInfo', 'hospital', e.target.value)} className="w-full border border-red-200 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-400 outline-none" placeholder="اكتب اسم المشفى..." />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-red-900 mb-2">تاريخ التنفيذ المستهدف *</label>
                    <input required type="date" value={formData.otherInfo.surgeryDate} onChange={(e) => handleInputChange('otherInfo', 'surgeryDate', e.target.value)} className="w-full border border-red-200 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-400 outline-none" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-red-900 mb-2">التكلفة التقديرية (ل.س) *</label>
                    <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.otherInfo.estimatedCost} onChange={(e) => handleInputChange('otherInfo', 'estimatedCost', e.target.value)} className="w-full border border-red-300 p-2.5 rounded-lg bg-white text-red-700 font-bold text-lg focus:ring-2 focus:ring-red-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="مثال: 1500000" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-red-900 mb-2">ملاحظات الطبيب والتشخيص *</label>
                    <textarea required rows="3" value={formData.otherInfo.generalNote} onChange={(e) => handleInputChange('otherInfo', 'generalNote', e.target.value)} className="w-full border border-red-200 p-2.5 rounded-xl bg-white focus:ring-2 focus:ring-red-400 outline-none resize-y" placeholder="اكتب تشخيصك الطبي التفصيلي هنا..."></textarea>
                  </div>
                </div>
              </section>

              <div className="pt-6 border-t border-gray-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-xl shadow-md transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}`}
                >
                  {isSubmitting ? 'جاري الرفع للخادم...' : 'إرسال الاستمارة الطبية واعتمادها'}
                </button>
              </div>

            </form>
          </div>
        )}
      </div>
    </div>
  );
}