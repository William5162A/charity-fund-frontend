import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { formatCurrency } from '../../utils/formatters';
import { fetchAidRequests } from '../../services/api';

const FilterTab = ({ value, label, currentFilter, onFilterChange }) => {
  const isActive = currentFilter === value;
  return (
    <button
      onClick={() => onFilterChange(value)}
      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
        isActive 
          ? 'bg-blue-600 text-white shadow-xs' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
};

export default function Reports() {
  const [stats, setStats] = useState({
    totalEstimated: 0,
    totalContributed: 0,
    requestsCount: 0,
    completedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    providerTotals: {}
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [timeFilter, setTimeFilter] = useState('all');

  // 🌟 المعالجة النظيفة لدورة الحياة باستخدام AbortController
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadStats = async () => {
      setLoading(true);
      setError(null);

      try {
        let data = await fetchAidRequests(abortController.signal);
        
        if (abortController.signal.aborted) return;

        if (timeFilter !== 'all') {
          const cutoffDate = new Date();
          
          if (timeFilter === '1m') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          else if (timeFilter === '3m') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
          else if (timeFilter === '6m') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
          else if (timeFilter === '1y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
          
          data = data.filter(req => new Date(req.date_of_aid) >= cutoffDate);
        }
        
        let estimated = 0;
        let contributed = 0;
        let completed = 0;
        let pending = 0;
        let rejected = 0;
        const provTotals = {};

        data.forEach(req => {
          estimated += Number(req.estimated_cost || 0);
          
          if (req.request_status === 'completed') completed++;
          else if (req.request_status === 'rejected') rejected++;
          else pending++; 

          if (Array.isArray(req.providers)) {
            req.providers.forEach(p => {
              const amount = Number(p.aid_amount || 0);
              contributed += amount;
              
              if(amount > 0) {
                const name = p.provider_name || 'جهة غير معروفة';
                provTotals[name] = (provTotals[name] || 0) + amount;
              }
            });
          }
        });

        setStats({
          totalEstimated: estimated,
          totalContributed: contributed,
          requestsCount: data.length,
          completedCount: completed,
          pendingCount: pending,
          rejectedCount: rejected,
          providerTotals: provTotals
        });
        setLoading(false);
      } catch (err) {
        if (abortController.signal.aborted || err.name === 'CanceledError') return;
        if (!abortController.signal.aborted) {
          setError(err.message || 'فشل جلب بيانات التقارير');
          setLoading(false);
        }
      }
    };

    loadStats();
    
    return () => {
      abortController.abort(); // 🌟 تدمير الطلب في حال تغيير الفلتر الزمني بسرعة
    };
  }, [timeFilter]);

  const closureRate = stats.requestsCount > 0 
    ? Math.round((stats.completedCount / stats.requestsCount) * 100) 
    : 0;

  const financialCoverageRate = stats.totalEstimated > 0
    ? Math.round((stats.totalContributed / stats.totalEstimated) * 100)
    : 0;

  const deficit = stats.totalEstimated - stats.totalContributed;
  const surplus = stats.totalContributed - stats.totalEstimated;
  const hasSurplus = surplus > 0;

  const C = 528; 
  const totalCases = stats.requestsCount || 1; 
  
  const compDash = (stats.completedCount / totalCases) * C;
  const pendDash = (stats.pendingCount / totalCases) * C;
  const rejDash  = (stats.rejectedCount / totalCases) * C;

  const pendOffset = -compDash;
  const rejOffset  = -(compDash + pendDash);

  return (
    <div className="flex bg-gray-50 min-h-screen" dir="rtl">
      <Sidebar />

      <div className="flex-1 p-6 md:p-10 w-full overflow-y-auto overflow-x-hidden">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">التقارير والإحصائيات المالية</h2>
            <p className="text-gray-500 mt-2 font-bold">نظرة تحليلية شاملة على التدفقات المالية وتوزيع المساهمات</p>
          </div>
          
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-full border border-gray-200 shadow-xs overflow-x-auto w-full xl:w-auto no-scrollbar shrink-0">
            <FilterTab value="all" label="كل الوقت" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
            <FilterTab value="1m" label="آخر شهر" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
            <FilterTab value="3m" label="3 أشهر" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
            <FilterTab value="6m" label="6 أشهر" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
            <FilterTab value="1y" label="آخر سنة" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gray-500 font-bold mt-4">جاري حساب البيانات للمدة المحددة...</p>
          </div>
        ) : error ? (
           <div className="p-8 bg-red-50 border border-red-100 rounded-2xl text-center">
            <p className="text-red-600 font-bold">⚠️ {error}</p>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-blue-600 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 font-bold mb-1">التكاليف المطلوبة (للفترة)</p>
                    <h3 className="text-2xl font-black text-blue-900">{formatCurrency(stats.totalEstimated)}</h3>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 text-xl">📋</div>
                </div>
                <p className="text-xs text-gray-400 mt-3 font-bold">لجميع الطلبات المحددة ({stats.requestsCount})</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-emerald-500 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 font-bold mb-1">الدعم المحصل (للفترة)</p>
                    <h3 className="text-2xl font-black text-emerald-700">{formatCurrency(stats.totalContributed)}</h3>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 text-xl">💰</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.min(financialCoverageRate, 100)}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">{financialCoverageRate}%</span>
                </div>
              </div>

              {hasSurplus ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-cyan-500 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-cyan-600 font-bold mb-1">الفائض المالي (للفترة)</p>
                      <h3 className="text-2xl font-black text-cyan-700">{formatCurrency(surplus)}</h3>
                    </div>
                    <div className="bg-cyan-50 p-2 rounded-lg text-cyan-600 text-xl">📈</div>
                  </div>
                  <p className="text-xs text-cyan-700 mt-3 font-bold bg-cyan-50 inline-block px-2 py-1 rounded">فائض مالي محقق للفترة</p>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-amber-500 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 font-bold mb-1">العجز المالي (للفترة)</p>
                      <h3 className="text-2xl font-black text-amber-700">{formatCurrency(deficit > 0 ? deficit : 0)}</h3>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg text-amber-600 text-xl">📉</div>
                  </div>
                  <p className="text-xs text-amber-600 mt-3 font-bold bg-amber-50 inline-block px-2 py-1 rounded">مبالغ تحتاج لتغطية عاجلة</p>
                </div>
              )}

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col w-full">
                <div className="bg-gray-50 p-5 border-b border-gray-100">
                  <h4 className="font-bold text-gray-800 text-lg">تحليل مصادر الدعم</h4>
                  <p className="text-xs text-gray-500 mt-1 font-bold">يُظهر حجم مساهمة كل جهة من إجمالي الدعم المحصل</p>
                </div>
                <div className="p-0 flex-1 overflow-x-auto">
                  <table className="w-full text-right min-w-[400px]">
                    <thead>
                      <tr className="text-sm text-gray-400 border-b bg-white">
                        <th className="p-4 font-bold whitespace-nowrap">الجهة الداعمة</th>
                        <th className="p-4 font-bold whitespace-nowrap">المبلغ المساهم به</th>
                        <th className="p-4 font-bold text-center whitespace-nowrap">النسبة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(stats.providerTotals)
                        .sort(([, valA], [, valB]) => valB - valA)
                        .map(([provName, val]) => (
                        <tr key={provName} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="p-4 font-bold text-gray-700 flex items-center gap-2 whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:bg-blue-600 transition-colors shrink-0"></span>
                            {provName}
                          </td>
                          <td className="p-4 text-emerald-600 font-bold whitespace-nowrap">{formatCurrency(val)}</td>
                          <td className="p-4 text-center">
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 inline-block whitespace-nowrap">
                              {stats.totalContributed > 0
                                ? ((val / stats.totalContributed) * 100).toFixed(1)
                                : '0.0'}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {Object.keys(stats.providerTotals).length === 0 && (
                        <tr>
                          <td colSpan="3" className="p-10 text-center text-gray-400 font-bold">لم يتم تسجيل مساهمات في هذه الفترة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col justify-center items-center text-center">
                 <h4 className="text-lg font-bold text-gray-800 mb-2 w-full text-right">مؤشر كفاءة إغلاق الحالات</h4>
                 <p className="text-xs text-gray-500 mb-8 w-full text-right border-b pb-4 font-bold">توزيع حالات المرضى ضمن هذه الفترة</p>
                 
                 <div className="relative w-48 h-48 flex items-center justify-center mb-8 shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-gray-100" />
                      
                      {compDash > 0 && (
                        <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="16" fill="transparent" strokeLinecap="round"
                          className="text-emerald-500 transition-all duration-1000 ease-out"
                          strokeDasharray={`${compDash} ${C}`} strokeDashoffset="0" 
                        />
                      )}
                      
                      {pendDash > 0 && (
                        <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="16" fill="transparent" strokeLinecap="round"
                          className="text-yellow-400 transition-all duration-1000 ease-out"
                          strokeDasharray={`${pendDash} ${C}`} strokeDashoffset={pendOffset} 
                        />
                      )}

                      {rejDash > 0 && (
                        <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="16" fill="transparent" strokeLinecap="round"
                          className="text-red-500 transition-all duration-1000 ease-out"
                          strokeDasharray={`${rejDash} ${C}`} strokeDashoffset={rejOffset} 
                        />
                      )}
                    </svg>
                    
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-black text-gray-800">{closureRate}%</span>
                      <span className="text-xs text-gray-400 font-bold mt-1">نسبة الإنجاز</span>
                    </div>
                 </div>
                 
                 <div className="flex w-full justify-between px-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="text-center">
                      <p className="text-2xl font-black text-emerald-600">{stats.completedCount}</p>
                      <p className="text-xs text-gray-500 font-bold mt-1">مكتمل</p>
                    </div>
                    <div className="w-px bg-gray-200"></div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-yellow-500">{stats.pendingCount}</p>
                      <p className="text-xs text-gray-500 font-bold mt-1">قيد الدراسة</p>
                    </div>
                    <div className="w-px bg-gray-200"></div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-red-500">{stats.rejectedCount}</p>
                      <p className="text-xs text-gray-500 font-bold mt-1">مرفوض</p>
                    </div>
                 </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}