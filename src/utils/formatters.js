// تنسيق الأرقام لتظهر كعملة سورية (مثال: 1,500,000 ل.س)
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 ل.س';
  return new Intl.NumberFormat('ar-SY').format(amount) + ' ل.س';
};

// تنسيق التاريخ ليظهر بشكل بسيط (مثال: 2026/03/29)
export const formatDate = (dateString) => {
  if (!dateString) return 'تاريخ غير محدد';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// دالة ذكية للتحقق إذا كان التاريخ قد مضى (مقارنة بتاريخ اليوم)
export const isPastDate = (dateString) => {
  if (!dateString) return false;
  
  // الحصول على تاريخ اليوم وتصفير الوقت للمقارنة بالأيام فقط
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // تحويل تاريخ العملية
  const surgeryDate = new Date(dateString);
  surgeryDate.setHours(0, 0, 0, 0);

  // يعيد true إذا كان تاريخ العملية قبل تاريخ اليوم
  return surgeryDate < today;
};

// دالة لحساب النسبة المئوية
export const calculatePercentage = (amount, percentage) => {
  if (!amount || !percentage) return 0;
  return (Number(percentage) / 100) * Number(amount);
};