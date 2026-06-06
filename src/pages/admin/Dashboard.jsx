import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar'; 
import { formatCurrency } from '../../utils/formatters';
import { fetchAidRequests } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext'; // 🌟 استخدام السياق بدلاً من التخزين المحلي

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth(); // 🌟 مصدر الحقيقة الوحيد
  
  // تحديد البادئة بناءً على الرتب الجديدة والمسارات الجديدة
  const basePath = user?.role === ROLES.ADMIN ? '/admin' : '/processor';
  
  const [dataState, setDataState] = useState({ items: [], loading: true, error: null });

  useEffect(() => {
    const abortController = new AbortController();
    
    const loadDashboardData = async () => {
      try {
        const data = await fetchAidRequests(abortController.signal);
        if (!abortController.signal.aborted) {
          setDataState({ items: data, loading: false, error: null });
        }
      } catch (err) {
        if (abortController.signal.aborted || err.name === 'CanceledError') return;
        if (!abortController.signal.aborted) {
          setDataState({ items: [], loading: false, error: err.message });
        }
      }
    };
    
    loadDashboardData();
    return () => abortController.abort(); // 🌟 منع تسرب الذاكرة
  }, []);

  const requests = dataState.items;

  // إحصائيات الطلبات
  const stats = useMemo(() => {
    return { 
      total: requests.length,
      completed: requests.filter(req => req.request_status === 'completed').length,
      pending: requests.filter(req => ['pending', 'processing'].includes(req.request_status)).length,
      rejected: requests.filter(req => req.request_status === 'rejected').length,
    };
  }, [requests]);

  // الإحصائيات المالية
  const financialStats = useMemo(() => {
    let totalEstimated = 0;
    let totalContributed = 0;

    requests.forEach(req => {
      totalEstimated += Number(req.estimated_cost || 0);
      totalContributed += Number(req.total_provided_amount || 0);
    });

    const deficit = totalEstimated - totalContributed;
    return { 
      totalEstimated, 
      totalContributed, 
      deficit: deficit > 0 ? deficit : 0,
      surplus: deficit < 0 ? Math.abs(deficit) : 0,
      coverageRate: totalEstimated > 0 ? Math.round((totalContributed / totalEstimated) * 100) : 0
    };
  }, [requests]);

  // لوحة الشرف (الداعمين)
  const topSupporters = useMemo(() => {
    const supporterTotals = {};
    requests.forEach(req => {
      if (Array.isArray(req.providers)) {
        req.providers.forEach(p => {
          const name = p.provider_name;
          if (!supporterTotals[name]) {
            supporterTotals[name] = { name, totalAmount: 0, casesCount: 0 };
          }
          supporterTotals[name].totalAmount += Number(p.aid_amount || 0);
          supporterTotals[name].casesCount += 1;
        });
      }
    });

    return Object.values(supporterTotals)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3);
  }, [requests]);

  return (
    <div className="flex bg-gray-50 min-h-screen" dir="rtl">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-10 w-full overflow-y-auto">
        
        <header className="mb-8 animate-fadeIn">
          <h2 className="text-3xl font-bold text-gray-800 font-serif">لوحة القيادة التنفيذية</h2>
          <p className="text-gray-500 mt-2 font-bold max-w-2xl">
            نظام إدارة الصندوق الطبي. تم تحليل {stats.total} طلباً نشطاً من قاعدة البيانات المركزية.
          </p>
        </header>
        
        {/* قسم إدارة المستخدمين - يظهر فقط للمدير العام (Admin) */}
        {user?.role === ROLES.ADMIN && (
          <section className="bg-linear-to-l from-purple-50 to-white p-6 rounded-2xl shadow-xs border-r-4 border-purple-600 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slideIn">
            <div>
              <h3 className="text-xl font-bold text-purple-800">إدارة صلاحيات النظام</h3>
              <p className="text-purple-600 text-sm mt-1 font-bold">لديك الصلاحية الكاملة لإدارة حسابات الأطباء ومعالجي البيانات.</p>
            </div>
            <button 
              onClick={() => navigate(`${basePath}/users`)} 
              className="bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-800 shadow-md transition-all whitespace-nowrap cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
            >
              إدارة المستخدمين ⚙️
            </button>
          </section>
        )}

        {dataState.loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gray-500 font-bold mt-4">جاري مزامنة الإحصائيات المالية...</p>
          </div>
        ) : dataState.error ? (
          <div className="p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
            <p className="text-red-600 font-bold">⚠️ خطأ في مزامنة البيانات: {dataState.error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold">إعادة الاتصال</button>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {/* البطاقات الرقمية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="إجمالي الطلبات" val={stats.total} color="blue" />
              <StatCard title="المنجزة" val={stats.completed} color="emerald" onClick={() => navigate(`${basePath}/completed`)} />
              <StatCard title="قيد المعالجة" val={stats.pending} color="yellow" onClick={() => navigate(`${basePath}/new-requests`)} />
              <StatCard title="المرفوضة" val={stats.rejected} color="red" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* الرصيد المالي */}
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-xs border border-gray-100 flex flex-col overflow-hidden">
                <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-800">التدفق المالي التراكمي</h3>
                  <button onClick={() => navigate(`${basePath}/reports`)} className="text-blue-700 bg-blue-50 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors cursor-pointer">
                    التقارير المالية &larr;
                  </button>
                </div>
                
                <div className="p-8 flex-1 flex flex-col justify-center gap-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="text-center md:text-right">
                      <p className="text-gray-400 font-bold text-sm mb-1">المبلغ المطلوب (تقديري)</p>
                      <p className="text-4xl font-black text-gray-800">{formatCurrency(financialStats.totalEstimated)}</p>
                    </div>
                    <div className="text-center md:text-right border-r-0 md:border-r border-gray-100 md:pr-8">
                      <p className="text-emerald-500 font-bold text-sm mb-1">إجمالي الدعم الفعلي</p>
                      <p className="text-4xl font-black text-emerald-600">{formatCurrency(financialStats.totalContributed)}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <p className="text-sm font-bold text-gray-600">نسبة التغطية من الداعمين</p>
                      <p className="text-lg font-black text-blue-700">{financialStats.coverageRate}%</p>
                    </div>
                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${financialStats.coverageRate >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(financialStats.coverageRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl flex items-center justify-between border ${financialStats.surplus > 0 ? 'bg-cyan-50 border-cyan-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{financialStats.surplus > 0 ? '💰' : '📉'}</span>
                      <div>
                        <p className={`font-black ${financialStats.surplus > 0 ? 'text-cyan-900' : 'text-amber-900'}`}>
                          {financialStats.surplus > 0 ? 'الفائض النقدي' : 'فجوة التمويل'}
                        </p>
                        {/* <p className="text-xs font-bold opacity-60">تحديث لحظي من الباك إند</p> */}
                      </div>
                    </div>
                    <p className={`text-2xl font-black ${financialStats.surplus > 0 ? 'text-cyan-700' : 'text-amber-700'}`}>
                      {formatCurrency(financialStats.surplus > 0 ? financialStats.surplus : financialStats.deficit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* لوحة الشرف */}
              <div className="xl:col-span-1 bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden flex flex-col">
                <div className="bg-linear-to-br from-emerald-700 to-emerald-500 p-6 text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2 font-serif"><span>🏆</span> شركاء العطاء</h3>
                  <p className="text-xs text-emerald-100 mt-1 font-bold">أكبر الجهات مساهمة في الدعم الطبي</p>
                </div>

                <div className="p-6 flex-1 flex flex-col gap-4">
                  {topSupporters.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-50 rounded-2xl text-center">
                      <p className="font-bold text-sm">لم يتم تسجيل مساهمات مالية بعد</p>
                    </div>
                  ) : (
                    topSupporters.map((supporter, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-all group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate">{supporter.name}</p>
                          <p className="text-xs text-gray-500 font-bold">{supporter.casesCount} حالات مدعومة</p>
                        </div>
                        <p className="text-sm font-black text-emerald-600">{formatCurrency(supporter.totalAmount)}</p>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                   <button onClick={() => navigate(`${basePath}/supporters`)} className="text-gray-500 hover:text-emerald-700 font-bold text-sm transition-colors w-full cursor-pointer">
                      عرض دليل الداعمين الكامل &larr;
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, val, color, onClick }) {
  const colors = {
    blue: "border-blue-600 text-blue-700",
    emerald: "border-emerald-600 text-emerald-700",
    yellow: "border-yellow-600 text-yellow-700",
    red: "border-red-600 text-red-700"
  };
  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-2xl shadow-xs border-r-4 ${colors[color]} hover:shadow-md transition-all group ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}>
      <p className="text-gray-400 text-[10px] font-black mb-1 uppercase tracking-widest group-hover:text-gray-600">{title}</p>
      <p className="text-3xl font-black">{val}</p>
    </div>
  );
}