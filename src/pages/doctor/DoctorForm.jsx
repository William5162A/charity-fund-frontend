import React, { useState } from 'react';
import GlobalHeader from '../../components/layout/GlobalHeader'; // 🌟 إضافة الترويسة المفقودة
import { createPatient, createFamilyMember, createAidRequest } from '../../services/api';

export default function DoctorForm() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000); // زيادة الوقت لقراءة الأخطاء المعقدة
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

  const preventInvalidChars = (e) => {
    if (["e", "E", "-", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (category, field, value) => {
    setFormData(prev => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { full_name: '', gender: 'ذكر', age: '', relation: 'ابن', note: '' }]);
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
    let createdPatientId = null; // 🌟 تتبع حالة الـ ID لمعالجة السجلات اليتيمة

    try {
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

      // 1. إنشاء المريض
      const createdPatient = await createPatient(patientPayload);
      createdPatientId = createdPatient.id;

      // 2. إنشاء العائلة
      if (familyMembers.length > 0) {
        const familyPromises = familyMembers.map(member => {
          return createFamilyMember(createdPatientId, {
            full_name: member.full_name,
            gender: member.gender === 'ذكر' ? 'male' : 'female',
            relation: member.relation,
            birth_date: new Date(new Date().setFullYear(new Date().getFullYear() - Number(member.age))).toISOString().split('T')[0]
          });
        });
        await Promise.all(familyPromises);
      }

      // 3. إنشاء الطلب
      const aidRequestPayload = {
        patient: createdPatientId,
        place_of_aid: formData.otherInfo.hospital,
        date_of_aid: formData.otherInfo.surgeryDate,
        estimated_cost: Number(formData.otherInfo.estimatedCost) || 0,
        description: `النوع: ${formData.otherInfo.surgeryType} | الاحتياجات: ${formData.otherInfo.specialNeeds} | ملاحظات: ${formData.otherInfo.generalNote}`,
      };

      await createAidRequest(aidRequestPayload);

      showNotification('تم إرسال الاستمارة الطبية بنجاح وتحويلها للجنة الإدارية!');
      setFormData(initialFormState);
      setFamilyMembers([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      // 🌟 تنبيه الطبيب في حال حدوث فشل جزئي لتجنب التكرار الأعمى
      if (createdPatientId) {
        showNotification('⚠️ تم حفظ بيانات المريض، لكن فشل إرسال الطلب الطبي. يرجى مراجعة اللجنة الإدارية.', 'error');
      } else {
        showNotification(error.message || 'حدث خطأ أثناء إرسال البيانات. تأكد من صحة المدخلات والرقم الوطني.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 صنف Tailwind 4.2 لإخفاء أسهم الأرقام بشكل قياسي بدون <style>
  const numberInputClass = "w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const textInputClass = "w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none";

  return (
    <div className="bg-gray-50 min-h-screen relative" dir="rtl">
      
      {/* <GlobalHeader /> 🌟 الترويسة الأساسية */}

      {toast.show && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 text-white font-bold transition-all duration-300 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 تعديل الـ padding والـ max-w ليناسب التصميم المتجاوب */}
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-10">
        <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
          
          <div className="bg-blue-800 text-white p-6 md:p-8 text-center border-b-4 border-emerald-500">
            <h1 className="text-2xl md:text-3xl font-bold">استمارة طلب مساعدة طبية</h1>
            <p className="mt-2 text-blue-100 font-bold">الرجاء تعبئة بيانات المريض والتقرير الطبي بدقة لإرسالها للجنة</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-10">
            
            <section>
              <h2 className="text-xl font-bold text-blue-800 mb-6 border-b-2 border-blue-50 pb-2 flex items-center gap-2">
                <span>👤</span> المعلومات الشخصية للمستفيد
              </h2>
              {/* 🌟 دعم 1023px بعمودين */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="flex justify-between items-center mb-6 border-b-2 border-blue-50 pb-2">
                <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                  <span>👨‍👩‍👧‍👦</span> أفراد العائلة (اختياري)
                </h2>
                <button type="button" onClick={addFamilyMember} className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 text-sm transition-colors cursor-pointer shadow-sm">
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

            <section className="bg-red-50 p-6 md:p-8 rounded-2xl border border-red-100">
              <h2 className="text-xl font-bold text-red-800 mb-6 border-b-2 border-red-100 pb-2 flex items-center gap-2">
                <span>🩺</span> التقرير الطبي
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {isSubmitting ? 'جاري الرفع للخادم...' : 'إرسال الاستمارة الطبية'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}