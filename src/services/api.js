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

api.interceptors.response.use(
  (response) => response, 
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('لا يوجد مفتاح تجديد');
        }

        const res = await axios.post(`${BASE_URL}token/refresh/`, { refresh: refreshToken });
        
        localStorage.setItem('access_token', res.data.access);
        
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return api(originalRequest);

      } catch (refreshError) {
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


export const loginUser = async (email, password) => {
  try {
    const response = await api.post('token/', { email, password });
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || 'فشل الاتصال بالخادم. تأكد من صحة البيانات.';
    throw new Error(errorMessage);
  }
};


export const fetchAidRequests = async () => {
  try {
    const response = await api.get('aid-requests/requests/');
    return response.data.results || [];
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'فشل جلب بيانات الطلبات من الخادم');
  }
};

export const fetchAidRequestDetails = async (id) => {
  const response = await api.get(`aid-requests/requests/${id}/`);
  return response.data;
};

export const updateRequestStatus = async (id, status) => {
  const response = await api.patch(`aid-requests/requests/${id}/`, { request_status: status });
  return response.data;
};

export const fetchPatientDetails = async (patientId) => {
  const response = await api.get(`patients/${patientId}/`);
  return response.data;
};

export const fetchPatientFamily = async (patientId) => {
  const response = await api.get(`patients/${patientId}/family/`);
  return response.data;
};

export const fetchAllProviders = async () => {
  const response = await api.get('aid-providers/providers/');
  return response.data.results || response.data; 
};

export const assignProviderToRequest = async (requestId, providerData) => {
  const response = await api.post(`aid-requests/requests/${requestId}/providers/`, providerData);
  return response.data;
};

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
// 🌟 دوال واجهة الطبيب الجديدة (EMR System)
// ==========================================

// استبدل الدالة القديمة بهذه:
export const searchPatients = async (query, signal) => {
  try {
    // نعتمد على معيار Django القياسي ?search= للبحث في الحروف أو الأرقام
    const response = await api.get(`patients/?search=${query}`, { signal });
    return response.data.results || response.data;
  } catch (error) {
    if (error.name === 'CanceledError') return []; // تجاهل الخطأ إذا تم إلغاء الطلب عمداً
    throw new Error('فشل البحث في قاعدة بيانات المرضى.');
  }
};

// 2. جلب تاريخ طلبات مريض محدد (للإحصائيات)
// 2. جلب تاريخ طلبات مريض محدد (مع درع فلترة صارم)
export const fetchRequestsByPatientId = async (patientId) => {
  try {
    const response = await api.get(`aid-requests/requests/?patient=${patientId}`);
    const results = response.data.results || response.data;
    
    // 🌟 الدرع المعماري: فلترة النتائج إجبارياً في الفرونت إند لأن الباك إند يرسل كل شيء
    const strictResults = results.filter(req => 
      // نتحقق مما إذا كان الباك إند يرسل المريض كرقم (ID) أو ككائن (Object)
      req.patient === patientId || req.patient?.id === patientId
    );
    
    return strictResults;
  } catch (error) {
    console.error('فشل جلب تاريخ المريض:', error);
    return []; // نعيد مصفوفة فارغة كي لا يتعطل النظام
  }
};

export const createPatient = async (patientData) => {
  try {
    const response = await api.post('patients/', patientData);
    return response.data; 
  } catch (error) {
    const errData = error.response?.data;
    // التقاط خطأ التكرار (Unique Constraint) بشكل دقيق
    if (errData?.national_number) {
      throw new Error('الرقم الوطني موجود مسبقاً في النظام. يرجى البحث عن المريض بدلاً من إضافته.');
    }
    const errorMsg = errData ? Object.values(errData).flat().join(' | ') : 'فشل إنشاء ملف المريض';
    throw new Error(errorMsg);
  }
};

export const createFamilyMember = async (patientId, memberData) => {
  const response = await api.post(`patients/${patientId}/family/`, memberData);
  return response.data;
};

export const createAidRequest = async (requestData) => {
  const response = await api.post('aid-requests/requests/', requestData);
  return response.data;
};

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

// --- دوال إدارة تصنيفات الجهات الداعمة (Categories) ---
export const fetchCategories = async (signal) => {
  const response = await api.get('aid-providers/categories/', { signal });
  return response.data.results || response.data;
};

export const createCategory = async (categoryData) => {
  const response = await api.post('aid-providers/categories/', categoryData);
  return response.data;
};

// حذف مساهمة مالية (جهة داعمة) من طلب طبي
export const removeProviderFromRequest = async (contributionId) => {
  const response = await api.delete(`aid-requests/providers/${contributionId}/`);
  return response.data;
};

export default api;