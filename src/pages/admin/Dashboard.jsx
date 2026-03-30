import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRequestsData } from '../../data/mockData';
import Sidebar from '../../components/layout/Sidebar'; 
import { formatCurrency } from '../../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole'); 
  const basePath = userRole === 'owner' ? '/owner' : '/admin';
  
  // جلب البيانات (ملاحظة: تم حذف getSupportersData لعدم الحاجة لها هنا)
  const [requests] = useState(() => getRequestsData());

  // 1. حساب الإحصائيات العددية للطلبات
  const stats = useMemo(() => {
    return {
      total: requests.length,
      completed: requests.filter(req => req.status === 'مكتمل').length,
      pending: requests.filter(req => req.status === 'قيد الدراسة' || req.status === 'فات الموعد').length,
      rejected: requests.filter(req => req.status === 'مرفوض').length,
    };
  }, [requests]);

  // 2. حساب الإحصائيات المالية الشاملة
  const financialStats = useMemo(() => {
    let totalEstimated = 0;
    let totalContributed = 0;

    requests.forEach(req => {
      totalEstimated += Number(req.otherInfo?.estimatedCost || 0);
      if (req.contributions && req.contributions.length > 0) {
        req.contributions.forEach(c => {
          totalContributed += Number(c.amount || 0);
        });
      }
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

  // 3. حساب واستخراج أكبر 3 داعمين (لوحة الشرف)
  const topSupporters = useMemo(() => {
    const supporterTotals = {};
    
    requests.forEach(req => {
      if (req.contributions && req.contributions.length > 0) {
        req.contributions.forEach(c => {
          const name = c.supporter;
          if (!supporterTotals[name]) {
            supporterTotals[name] = { name, category: c.category, totalAmount: 0, casesCount: 0 };
          }
          supporterTotals[name].totalAmount += Number(c.amount || 0);
          supporterTotals[name].casesCount += 1;
        });
      }
    });

    return Object.values(supporterTotals)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3); // أخذ أول 3 فقط
  }, [requests]);

  return (
    <div className="flex bg-gray-50 min-h-screen" dir="rtl">
      <Sidebar />

      <div className="flex-1 p-6 md:p-10 w-full overflow-y-auto">
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">لوحة القيادة التنفيذية</h2>
          <p className="text-gray-500 mt-2 font-bold">
            مرحباً بك في نظام إدارة الصندوق الطبي. إليك ملخص الأداء الشامل.
          </p>
        </div>
        
        {/* قسم إدارة الحسابات للمالك فقط */}
        {userRole === 'owner' && (
          <div className="bg-linear-to-l from-purple-50 to-white p-6 rounded-xl shadow-sm border-r-4 border-purple-600 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold text-purple-800">إدارة حسابات النظام</h3>
              <p className="text-purple-600 text-sm mt-1">من هنا يمكنك إضافة، تعديل، أو حذف حسابات الأطباء والأدمن.</p>
            </div>
            <button 
              onClick={() => navigate(`${basePath}/users`)} 
              className="bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-purple-800 shadow-md transition-all whitespace-nowrap cursor-pointer"
             >
              إدارة المستخدمين
            </button>
          </div>
        )}

        {/* 1. البطاقات الإحصائية للطلبات (4 كروت) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="إجمالي الطلبات" val={stats.total} color="blue" />
          <StatCard title="المنجزة (المغلقة)" val={stats.completed} color="emerald" onClick={() => navigate(`${basePath}/completed`)} />
          <StatCard title="قيد الدراسة/متأخر" val={stats.pending} color="yellow" onClick={() => navigate(`${basePath}/new-requests`)} />
          <StatCard title="الطلبات المرفوضة" val={stats.rejected} color="red" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* 2. البطاقة المالية الكبرى */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">الملخص المالي العام</h3>
                <p className="text-sm text-gray-500 mt-1 font-bold">نظرة سريعة على حجم الاحتياج ومعدل التغطية المحصلة</p>
              </div>
              <button onClick={() => navigate(`${basePath}/reports`)} className="text-blue-600 bg-blue-50 px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors cursor-pointer">
                التقارير المفصلة &larr;
              </button>
            </div>
            
            <div className="p-8 flex-1 flex flex-col justify-center gap-8">
              <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                
                <div className="text-center md:text-right flex-1">
                  <p className="text-gray-500 font-bold mb-2">إجمالي التكلفة المطلوبة</p>
                  <p className="text-4xl font-black text-gray-800">{formatCurrency(financialStats.totalEstimated)}</p>
                </div>
                
                <div className="hidden md:block w-px h-16 bg-gray-200"></div>
                
                <div className="text-center md:text-right flex-1">
                  <p className="text-emerald-600 font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> إجمالي الدعم المحصل
                  </p>
                  <p className="text-4xl font-black text-emerald-600">{formatCurrency(financialStats.totalContributed)}</p>
                </div>

              </div>

              {/* شريط التقدم المالي */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-sm font-bold text-gray-600">معدل التغطية المالية</p>
                  <p className="text-lg font-black text-blue-700">{financialStats.coverageRate}%</p>
                </div>
                <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full transition-all duration-1500 ease-out ${financialStats.coverageRate >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(financialStats.coverageRate, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* بطاقة العجز / الفائض */}
              <div className={`p-4 rounded-xl flex items-center justify-between border ${financialStats.surplus > 0 ? 'bg-cyan-50 border-cyan-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${financialStats.surplus > 0 ? 'text-cyan-500' : 'text-amber-500'}`}>
                    {financialStats.surplus > 0 ? '📈' : '📉'}
                  </span>
                  <div>
                    <p className={`font-bold ${financialStats.surplus > 0 ? 'text-cyan-800' : 'text-amber-800'}`}>
                      {financialStats.surplus > 0 ? 'الفائض المالي المتاح' : 'العجز المالي المتبقي'}
                    </p>
                    <p className={`text-xs font-bold ${financialStats.surplus > 0 ? 'text-cyan-600' : 'text-amber-600'}`}>
                      {financialStats.surplus > 0 ? 'جاهز لتمويل طلبات أخرى' : 'يحتاج لتغطية عاجلة'}
                    </p>
                  </div>
                </div>
                <p className={`text-xl font-black ${financialStats.surplus > 0 ? 'text-cyan-700' : 'text-amber-700'}`}>
                  {formatCurrency(financialStats.surplus > 0 ? financialStats.surplus : financialStats.deficit)}
                </p>
              </div>

            </div>
          </div>

          {/* 3. لوحة الشرف */}
          <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-linear-to-l from-emerald-600 to-emerald-500 p-6 border-b border-emerald-700 text-white flex justify-between items-center shadow-inner">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2"><span>🏆</span> شركاء العطاء</h3>
                <p className="text-xs text-emerald-100 mt-1 font-bold">أكبر 3 جهات داعمة للصندوق</p>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-4">
              {topSupporters.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                  <span className="text-4xl mb-2 opacity-50">🪙</span>
                  <p className="font-bold text-sm mt-2">لم يتم تسجيل مساهمات مالية حتى الآن</p>
                </div>
              ) : (
                topSupporters.map((supporter, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-emerald-200 transition-colors group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-sm border-2 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-600 border-yellow-200' :
                      index === 1 ? 'bg-gray-100 text-gray-500 border-gray-200' :
                      'bg-orange-50 text-orange-700 border-orange-100'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate" title={supporter.name}>{supporter.name}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-bold">{supporter.category}</span>
                        <span>{supporter.casesCount} حالة</span>
                      </p>
                    </div>
                    <div className="text-left whitespace-nowrap">
                      <p className="text-sm font-black text-emerald-600 group-hover:text-emerald-700 transition-colors">
                        {formatCurrency(supporter.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
               <button onClick={() => navigate(`${basePath}/supporters`)} className="text-gray-500 hover:text-emerald-600 font-bold text-sm transition-colors w-full cursor-pointer">
                 عرض دليل الجهات كاملاً
               </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// مكون فرعي صغير لتقليل التكرار في كروت الإحصائيات
function StatCard({ title, val, color, onClick }) {
  const colors = {
    blue: "border-blue-500 text-blue-700",
    emerald: "border-emerald-500 text-emerald-700",
    yellow: "border-yellow-500 text-yellow-700",
    red: "border-red-500 text-red-700"
  };
  return (
    <div onClick={onClick} className={`bg-white p-6 rounded-2xl shadow-sm border-r-4 ${colors[color]} hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''}`}>
      <p className="text-gray-500 text-xs font-bold mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-black">{val}</p>
    </div>
  );
}