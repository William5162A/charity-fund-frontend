import axios from 'axios';

// الرابط الأساسي للباك إند
const BASE_URL = 'http://127.0.0.1:8000/api/';

// إنشاء نسخة مخصصة من Axios
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor 1: حقن الـ Access Token تلقائياً في كل طلب مرسل للباك إند
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor 2: التقاط خطأ 401 وتجديد الـ Token تلقائياً دون إزعاج المستخدم
api.interceptors.response.use(
  (response) => response, // تمرير الاستجابة الناجحة
  async (error) => {
    const originalRequest = error.config;

    // التحقق من أن الخطأ 401 (انتهاء الصلاحية) وأنه لم يتم محاولة التجديد مسبقاً لهذا الطلب
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('لا يوجد مفتاح تجديد');
        }

        // نستخدم axios الخام هنا لتجنب الحلقة اللانهائية مع المعترض الخاص بنا
        const res = await axios.post(`${BASE_URL}token/refresh/`, { refresh: refreshToken });
        
        // حفظ المفتاح الجديد
        localStorage.setItem('access_token', res.data.access);
        
        // تحديث ترويسة الطلب الأصلي بالمفتاح الجديد وإعادة إرساله
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return api(originalRequest);

      } catch (refreshError) {
        // فشل التجديد (انتهت صلاحية الـ refresh token أيضاً) -> تنظيف الذاكرة وتوجيه لشاشة الدخول
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userRole');
        window.location.href = '/login'; 
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);


// --------------------------------------------------------
// نقطة النهاية (Endpoints) الخاصة بالمصادقة (Authentication)
// --------------------------------------------------------

export const loginUser = async (email, password) => {
  try {
    const response = await api.post('token/', { email, password });
    
    // حفظ الـ Tokens في الذاكرة المحلية
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    
    return response.data;
  } catch (error) {
    // إرجاع رسالة الخطأ القادمة من الباك إند أو رسالة عامة
    const errorMessage = error.response?.data?.detail || 'فشل الاتصال بالخادم. تأكد من صحة البيانات.';
    throw new Error(errorMessage);
  }
};


// جلب قائمة الطلبات الطبية
export const fetchAidRequests = async () => {
  try {
    const response = await api.get('aid-requests/requests/');
    // استخراج مصفوفة البيانات من كائن الفهرسة (Pagination)
    return response.data.results || [];
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'فشل جلب بيانات الطلبات من الخادم');
  }
};


// ==========================================
// دوال صفحة تفاصيل الطلب (Request Details)
// ==========================================

// 1. جلب تفاصيل الطلب الأساسية
export const fetchAidRequestDetails = async (id) => {
  const response = await api.get(`aid-requests/requests/${id}/`);
  return response.data;
};

// 2. تحديث حالة الطلب (Decision Panel)
export const updateRequestStatus = async (id, status) => {
  const response = await api.patch(`aid-requests/requests/${id}/`, { request_status: status });
  return response.data;
};

// 3. جلب بيانات المريض المرتبط بالطلب
export const fetchPatientDetails = async (patientId) => {
  const response = await api.get(`patients/${patientId}/`);
  return response.data;
};

// 4. جلب أفراد عائلة المريض
export const fetchPatientFamily = async (patientId) => {
  const response = await api.get(`patients/${patientId}/family/`);
  return response.data;
};

// 5. جلب قائمة الجهات الداعمة المتاحة في النظام (للقائمة المنسدلة)
export const fetchAllProviders = async () => {
  const response = await api.get('aid-providers/providers/');
  // الباك إند يُرجع الفهرسة (Pagination)، نستخرج النتائج
  return response.data.results || response.data; 
};

// 6. إضافة مساهمة (ربط جهة داعمة بالطلب)
export const assignProviderToRequest = async (requestId, providerData) => {
  const response = await api.post(`aid-requests/requests/${requestId}/providers/`, providerData);
  return response.data;
};


// ==========================================
// دوال إدارة المستخدمين (Users Management)
// ==========================================

export const fetchUsers = async () => {
  try {
    const response = await api.get('users/');
    return response.data.results || response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'فشل جلب قائمة المستخدمين');
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('users/', userData);
    return response.data;
  } catch (error) {
    // جلب رسائل الخطأ التفصيلية من Django (مثل: الإيميل موجود مسبقاً)
    const errData = error.response?.data;
    const errorMsg = errData ? Object.values(errData).flat().join(' | ') : 'فشل إنشاء المستخدم';
    throw new Error(errorMsg);
  }
};

export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`users/${id}/`, userData);
    return response.data;
  } catch (error) {
    const errData = error.response?.data;
    const errorMsg = errData ? Object.values(errData).flat().join(' | ') : 'فشل تحديث المستخدم';
    throw new Error(errorMsg);
  }
};

export const deleteUserApi = async (id) => {
  try {
    const response = await api.delete(`users/${id}/`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'فشل حذف المستخدم');
  }
};


// ==========================================
// دوال إدخال البيانات المتسلسلة (Doctor Form)
// ==========================================

export const createPatient = async (patientData) => {
  const response = await api.post('patients/', patientData);
  return response.data; // سيعيد بيانات المريض متضمنة الـ id
};

export const createFamilyMember = async (patientId, memberData) => {
  // بناءً على هيكلية الباك إند القياسية لـ Django
  const response = await api.post(`patients/${patientId}/family/`, memberData);
  return response.data;
};

export const createAidRequest = async (requestData) => {
  const response = await api.post('aid-requests/requests/', requestData);
  return response.data;
};


// ==========================================
// دوال إدارة الجهات الداعمة (Aid Providers)
// ==========================================

export const createProvider = async (providerData) => {
  const response = await api.post('aid-providers/providers/', providerData);
  return response.data;
};

export const updateProvider = async (id, providerData) => {
  const response = await api.put(`aid-providers/providers/${id}/`, providerData);
  return response.data;
};

export const deleteProvider = async (id) => {
  const response = await api.delete(`aid-providers/providers/${id}/`);
  return response.data;
};

export default api;