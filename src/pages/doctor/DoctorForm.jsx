import React, { useState } from 'react';
import { getSupportersData, getRequestsData, saveRequestsData } from '../../data/mockData';

export default function DoctorForm() {
  const [supportersList] = useState(() => getSupportersData());
  const hospitals = supportersList['مشافي'] || [];
  
  const doctorName = localStorage.getItem('userName') || 'الطبيب المعالج';

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

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

  // دالة لمنع إدخال الرموز غير الرقمية (مثل - و + وحرف e)
  const preventInvalidChars = (e) => {
    if (["e", "E", "-", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (category, field, value) => {
    setFormData(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: '', gender: 'ذكر', age: '', kinship: 'ابن', note: '' }]);
  };

  const updateFamilyMember = (index, field, value) => {
    const updated = [...familyMembers];
    updated[index][field] = value;
    setFamilyMembers(updated);
  };

  const removeFamilyMember = (index) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    const currentRequests = getRequestsData();
    const newId = currentRequests.length > 0 ? Math.max(...currentRequests.map(r => r.id)) + 1 : 1;

    const newRequest = {
      id: newId,
      date: new Date().toISOString().split('T')[0],
      organizerName: doctorName, 
      status: 'قيد الدراسة',
      beneficiary: {
        ...formData.beneficiary,
        salary: Number(formData.beneficiary.salary) || 0,
        familyMembersCount: Number(formData.beneficiary.familyMembersCount) || 1
      },
      familyMembers: familyMembers,
      otherInfo: {
        ...formData.otherInfo,
        estimatedCost: Number(formData.otherInfo.estimatedCost) || 0
      },
      contributions: []
    };

    saveRequestsData([newRequest, ...currentRequests]);

    showNotification('تم إرسال الاستمارة الطبية بنجاح وتحويلها للإدارة!');
    setFormData(initialFormState);
    setFamilyMembers([]);
    setIsSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10 relative" dir="rtl">
      
      {/* تنسيق CSS لإخفاء الأسهم من خانات الأرقام */}
      <style>{`
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
      
      {toast.show && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-2xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="bg-blue-800 text-white p-6 text-center border-b-4 border-emerald-500">
          <h1 className="text-3xl font-bold">استمارة طلب مساعدة طبية</h1>
          <p className="mt-2 text-blue-100 mb-4">الرجاء تعبئة بيانات المريض والتقرير الطبي بدقة لإرسالها للجنة</p>
          <div className="bg-red-500 text-white text-sm font-bold py-2 px-4 rounded-lg inline-block shadow-sm">
            ⚠️ ملاحظة هامة: جميع الحقول في هذه الاستمارة إلزامية.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-10">
          
          {/* 1. المعلومات الشخصية */}
          <section>
            <h2 className="text-xl font-bold text-blue-800 mb-6 border-b-2 border-blue-100 pb-2 flex items-center gap-2">
              <span>👤</span> المعلومات الشخصية للمستفيد
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الثلاثي *</label>
                <input required type="text" value={formData.beneficiary.fullName} onChange={(e) => handleInputChange('beneficiary', 'fullName', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الجنس *</label>
                <select required value={formData.beneficiary.gender} onChange={(e) => handleInputChange('beneficiary', 'gender', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                  <option>ذكر</option><option>أنثى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">اسم ونسبة الأم *</label>
                <input required type="text" value={formData.beneficiary.motherName} onChange={(e) => handleInputChange('beneficiary', 'motherName', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              {/* تعديل الرقم الوطني ودفتر العائلة */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الرقم الوطني *</label>
                <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.beneficiary.nationalId} onChange={(e) => handleInputChange('beneficiary', 'nationalId', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">رقم دفتر العائلة *</label>
                <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.beneficiary.familyBookNumber} onChange={(e) => handleInputChange('beneficiary', 'familyBookNumber', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">مكان الولادة *</label>
                <input required type="text" value={formData.beneficiary.birthPlace} onChange={(e) => handleInputChange('beneficiary', 'birthPlace', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الولادة *</label>
                <input required type="date" value={formData.beneficiary.birthDate} onChange={(e) => handleInputChange('beneficiary', 'birthDate', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
            </div>
          </section>

          {/* 2. السكن والتواصل */}
          <section>
            <h2 className="text-xl font-bold text-blue-800 mb-6 border-b-2 border-blue-100 pb-2 flex items-center gap-2">
              <span>🏡</span> السكن والتواصل
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">مكان السكن بالتفصيل *</label>
                <input required type="text" value={formData.beneficiary.address} onChange={(e) => handleInputChange('beneficiary', 'address', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">صفة المنزل *</label>
                <select required value={formData.beneficiary.houseStatus} onChange={(e) => handleInputChange('beneficiary', 'houseStatus', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                  <option>ملك</option><option>آجار</option><option>للأقارب</option><option>استضافة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الرعية *</label>
                <select required value={formData.beneficiary.parish} onChange={(e) => handleInputChange('beneficiary', 'parish', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                  <option>رعية الأربعين شهيد</option><option>رعية أم الزنار</option><option>أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">كاهن الرعية *</label>
                <input required type="text" value={formData.beneficiary.priest} onChange={(e) => handleInputChange('beneficiary', 'priest', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الهاتف الأرضي *</label>
                <input required type="text" value={formData.beneficiary.landline} onChange={(e) => handleInputChange('beneficiary', 'landline', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الجوال *</label>
                <input required type="text" value={formData.beneficiary.mobile} onChange={(e) => handleInputChange('beneficiary', 'mobile', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" dir="ltr" />
              </div>
            </div>
          </section>

          {/* 3. الوضع المهني والعائلي */}
          <section>
            <h2 className="text-xl font-bold text-blue-800 mb-6 border-b-2 border-blue-100 pb-2 flex items-center gap-2">
              <span>💼</span> الوضع المهني والعائلي
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الوضع العائلي *</label>
                <select required value={formData.beneficiary.maritalStatus} onChange={(e) => handleInputChange('beneficiary', 'maritalStatus', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                  <option>عازب</option><option>متزوج</option><option>أرمل</option><option>مطلق</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">عدد الأفراد *</label>
                <input required type="number" min="1" onKeyDown={preventInvalidChars} value={formData.beneficiary.familyMembersCount} onChange={(e) => handleInputChange('beneficiary', 'familyMembersCount', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">العمل الحالي والتفاصيل *</label>
                <div className="flex gap-2">
                  <select required value={formData.beneficiary.jobType} onChange={(e) => handleInputChange('beneficiary', 'jobType', e.target.value)} className="w-1/3 border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                    <option value="">نوع العمل...</option><option>موظف قطاع عام</option><option>موظف قطاع خاص</option><option>أعمال حرة</option><option>لا يعمل</option>
                  </select>
                  <input required type="text" placeholder="المهنة..." value={formData.beneficiary.job} onChange={(e) => handleInputChange('beneficiary', 'job', e.target.value)} className="w-2/3 border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">الراتب / الدخل الشهري (ل.س) *</label>
                <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.beneficiary.salary} onChange={(e) => handleInputChange('beneficiary', 'salary', e.target.value)} className="w-full border p-2.5 rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none" />
              </div>
            </div>
          </section>

          {/* 4. أفراد العائلة المرفقين */}
          <section>
            <div className="flex justify-between items-center mb-6 border-b-2 border-blue-100 pb-2">
              <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                <span>👨‍👩‍👧‍👦</span> جدول أفراد العائلة
              </h2>
              <button type="button" onClick={addFamilyMember} className="bg-blue-100 text-blue-700 px-4 py-2 rounded font-bold hover:bg-blue-200 text-sm transition-colors">
                + إضافة فرد للعائلة
              </button>
            </div>
            
            {familyMembers.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500 font-bold">
                اضغط على الزر أعلاه في حال وجود أفراد عائلة
              </div>
            ) : (
              <div className="space-y-3">
                {familyMembers.map((member, index) => (
                  <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-gray-50 p-3 rounded border border-gray-200">
                    <input required type="text" placeholder="الاسم *" value={member.name} onChange={(e) => updateFamilyMember(index, 'name', e.target.value)} className="flex-1 border p-2 rounded text-sm min-w-37.5 outline-none focus:border-blue-400" />
                    <select required value={member.gender} onChange={(e) => updateFamilyMember(index, 'gender', e.target.value)} className="border p-2 rounded text-sm bg-white outline-none">
                      <option>ذكر</option><option>أنثى</option>
                    </select>
                    {/* تعديل خانة العمر في العائلة */}
                    <input required type="number" min="0" onKeyDown={preventInvalidChars} placeholder="العمر *" value={member.age} onChange={(e) => updateFamilyMember(index, 'age', e.target.value)} className="w-20 border p-2 rounded text-sm outline-none focus:border-blue-400" />
                    <select required value={member.kinship} onChange={(e) => updateFamilyMember(index, 'kinship', e.target.value)} className="border p-2 rounded text-sm bg-white outline-none">
                      <option>أب</option><option>أم</option><option>ابن</option><option>ابنة</option><option>زوج</option><option>زوجة</option>
                    </select>
                    <input required type="text" placeholder="ملاحظة *" value={member.note} onChange={(e) => updateFamilyMember(index, 'note', e.target.value)} className="flex-1 border p-2 rounded text-sm min-w-37.5 outline-none focus:border-blue-400" />
                    <button type="button" onClick={() => removeFamilyMember(index)} className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200 font-bold transition-colors">❌</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 5. التقرير الطبي والتكلفة */}
          <section className="bg-red-50 p-6 rounded-xl border border-red-100">
            <h2 className="text-xl font-bold text-red-800 mb-6 border-b-2 border-red-200 pb-2 flex items-center gap-2">
              <span>🩺</span> التقرير الطبي للعملية الجراحية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-red-900 mb-2">نوع المساعدة المطلوبة *</label>
                <select required value={formData.otherInfo.surgeryType} onChange={(e) => handleInputChange('otherInfo', 'surgeryType', e.target.value)} className="w-full border border-red-200 p-2.5 rounded bg-white focus:ring-2 focus:ring-red-400 outline-none">
                  <option>عمل جراحي</option><option>أدوية</option><option>معاينة طبيب</option><option>مساعدة طبية أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-red-900 mb-2">اسم المشفى المقترح للتنفيذ *</label>
                <select required value={formData.otherInfo.hospital} onChange={(e) => handleInputChange('otherInfo', 'hospital', e.target.value)} className="w-full border border-red-200 p-2.5 rounded bg-white focus:ring-2 focus:ring-red-400 outline-none">
                  <option value="">-- يرجى اختيار المشفى --</option>
                  {hospitals.map((hospital, index) => (
                    <option key={index} value={hospital}>{hospital}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-red-900 mb-2">تاريخ العمل الجراحي (التقريبي) *</label>
                <input required type="date" value={formData.otherInfo.surgeryDate} onChange={(e) => handleInputChange('otherInfo', 'surgeryDate', e.target.value)} className="w-full border border-red-200 p-2.5 rounded bg-white focus:ring-2 focus:ring-red-400 outline-none" />
              </div>
              
              {/* تعديل خانة التكلفة التقديرية */}
              <div>
                <label className="block text-sm font-bold text-red-900 mb-2">التكلفة التقديرية (ل.س) *</label>
                <input required type="number" min="0" onKeyDown={preventInvalidChars} value={formData.otherInfo.estimatedCost} onChange={(e) => handleInputChange('otherInfo', 'estimatedCost', e.target.value)} className="w-full border border-red-300 p-2.5 rounded bg-white text-red-700 font-bold text-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="مثال: 1500000" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-red-900 mb-2">الاحتياجات الخاصة والمستلزمات *</label>
                <input required type="text" placeholder="اكتب مجهول إذا لا يوجد..." value={formData.otherInfo.specialNeeds} onChange={(e) => handleInputChange('otherInfo', 'specialNeeds', e.target.value)} className="w-full border border-red-200 p-2.5 rounded bg-white focus:ring-2 focus:ring-red-400 outline-none" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-red-900 mb-2">ملاحظات الطبيب العامة *</label>
                <textarea required rows="3" value={formData.otherInfo.generalNote} onChange={(e) => handleInputChange('otherInfo', 'generalNote', e.target.value)} className="w-full border border-red-200 p-2.5 rounded bg-white focus:ring-2 focus:ring-red-400 outline-none" placeholder="اكتب تشخيصك، أو مجهول..."></textarea>
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-200">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-1 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'جاري إرسال الاستمارة...' : 'إرسال الاستمارة الطبية للجنة الإدارية'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}