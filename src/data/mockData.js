// ==========================================
// 1. القوائم الافتراضية (Default Data)
// ==========================================

const defaultSupporters = {
  مشافي: ["مشفى جامعة الحواش", "المشفى العمالي", "المشفى الاهلي", "المشفى الكندي", "المركز العيني في مشفى الزعيم", "المركز العيني التخصصي"],
  منظمات: ["GOPA", "ACN", "عائلة البشارة", "كاريتاس", "راهبات القلبين الاقدسين", "المكتب الطبي للاباء اليسوعيين", "صندوق العافية", "المكتب الطبي للكنيسة المشيخية الانجيلية", "مؤسسة العافية"],
  جمعيات: ["جمعية خدمة المحبة (مطرانية السريان الكاثوليك)", "الجمعية الخيرية"],
  أطباء: []
};

// ==========================================
// 2. دوال الطلبات (Requests)
// ==========================================

export const getRequestsData = () => {
  const data = localStorage.getItem('requestsData');
  if (data) return JSON.parse(data);
  
  // في حال كانت الذاكرة فارغة، نولد البيانات الوهمية (مرة واحدة فقط)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialRequests = Array.from({ length: 100 }, (_, i) => {
    const randomOffset = (Math.floor(Math.random() * 60) - 30) * 24 * 60 * 60 * 1000;
    const surgeryDate = new Date(today.getTime() + randomOffset);
    const submitDate = new Date(surgeryDate.getTime() - (Math.floor(Math.random() * 15) + 1) * 24 * 60 * 60 * 1000);
    const estimatedCost = Math.floor(500000 + Math.random() * 2000000);

    let status = (i % 5 === 0) ? 'مكتمل' : (i % 7 === 0) ? 'مرفوض' : 'قيد الدراسة';

    // منطق فات الموعد
    if (status === 'قيد الدراسة' && surgeryDate < today) {
      status = 'فات الموعد';
    }

    let contributions = [];
    if (status === 'مكتمل') {
      const categories = Object.keys(defaultSupporters).filter(c => defaultSupporters[c].length > 0);
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const supporter = defaultSupporters[cat][Math.floor(Math.random() * defaultSupporters[cat].length)];
      contributions.push({ category: cat, supporter: supporter, amount: estimatedCost, percentageInfo: null });
    }

    return {
      id: i + 1,
      date: submitDate.toISOString().split('T')[0],
      organizerName: 'د. فادي',
      status: status,
      beneficiary: {
        fullName: `مريض تجريبي رقم ${i + 1}`,
        gender: i % 2 === 0 ? 'ذكر' : 'أنثى',
        nationalId: `04010${Math.floor(100000 + Math.random() * 900000)}`,
        familyBookNumber: `99${Math.floor(1000 + Math.random() * 9000)}`,
        mobile: `09${Math.floor(30000000 + Math.random() * 60000000)}`,
        maritalStatus: 'متزوج',
        salary: Math.floor(300000 + Math.random() * 700000),
      },
      familyMembers: [],
      otherInfo: {
        surgeryType: i % 2 === 0 ? 'عمل جراحي' : 'أدوية',
        estimatedCost: estimatedCost,
        surgeryDate: surgeryDate.toISOString().split('T')[0]
      },
      contributions: contributions
    };
  });

  localStorage.setItem('requestsData', JSON.stringify(initialRequests));
  return initialRequests;
};

export const saveRequestsData = (data) => {
  localStorage.setItem('requestsData', JSON.stringify(data));
};

// ==========================================
// 3. دوال الجهات الداعمة (Supporters)
// ==========================================

export const getSupportersData = () => {
  // توحيد المفتاح ليكون 'supportersData' في كل النظام
  const data = localStorage.getItem('supportersData');
  if (data) return JSON.parse(data);
  
  localStorage.setItem('supportersData', JSON.stringify(defaultSupporters));
  return defaultSupporters;
};

export const saveSupportersData = (data) => {
  localStorage.setItem('supportersData', JSON.stringify(data));
};

// ==========================================
// 4. 🌟 دوال الصندوق العام المتراكم (General Fund)
// ==========================================

export const getGeneralFundBalance = () => {
  const balance = localStorage.getItem('general_fund_balance');
  return balance ? Number(balance) : 0;
};

/**
 * تحديث رصيد الصندوق
 * @param {number} amount - المبلغ المراد إضافته (أو طرحه إذا كان سالباً)
 */
export const updateGeneralFundBalance = (amount) => {
  const currentBalance = getGeneralFundBalance();
  const newBalance = currentBalance + Number(amount);
  localStorage.setItem('general_fund_balance', newBalance.toString());
  return newBalance;
};