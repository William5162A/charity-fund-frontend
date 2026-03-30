import React, { useState, useEffect, useMemo } from 'react';
import { getRequestsData, getSupportersData, getGeneralFundBalance } from '../../data/mockData';
import Sidebar from '../../components/layout/Sidebar';
import { formatCurrency } from '../../utils/formatters';

// 🌟 الحل: نقلنا المكون إلى خارج الدالة الرئيسية
const FilterTab = ({ value, label, currentFilter, onFilterChange }) => {
  const isActive = currentFilter === value;
  return (
    <button
      onClick={() => onFilterChange(value)}
      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
        isActive 
          ? 'bg-emerald-600 text-white shadow-md' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
};

export default function Supporters() {
  const [supporterStats, setSupporterStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [fundBalance, setFundBalance] = useState(0); 

  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const baseSupporters = getSupportersData();
      let requests = getRequestsData();
      const currentFundBalance = getGeneralFundBalance(); 

      if (timeFilter !== 'all') {
        const cutoffDate = new Date();
        
        if (timeFilter === '1m') cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        else if (timeFilter === '3m') cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        else if (timeFilter === '6m') cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        else if (timeFilter === '1y') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        
        requests = requests.filter(req => new Date(req.date) >= cutoffDate);
      }

      const stats = {};
      Object.keys(baseSupporters).forEach(category => {
        stats[category] = {};
        baseSupporters[category].forEach(name => {
          stats[category][name] = { totalAmount: 0, casesCount: 0 };
        });
      });

      requests.forEach(req => {
        if (req.contributions && req.contributions.length > 0) {
          req.contributions.forEach(contrib => {
            const cat = contrib.category;
            const name = contrib.supporter;
            const amount = Number(contrib.amount || 0);

            if (amount > 0) {
              if (!stats[cat]) stats[cat] = {};
              if (!stats[cat][name]) stats[cat][name] = { totalAmount: 0, casesCount: 0 };

              stats[cat][name].totalAmount += amount;
              stats[cat][name].casesCount += 1;
            }
          });
        }
      });

      if (isMounted) {
        setSupporterStats(stats);
        setFundBalance(currentFundBalance);
        setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [timeFilter]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return Object.keys(supporterStats);
    return Object.keys(supporterStats).filter(category => {
      const supportersInCat = Object.keys(supporterStats[category]);
      return supportersInCat.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [searchTerm, supporterStats]);

  return (
    <div className="flex bg-gray-50 min-h-screen" dir="rtl">
      <Sidebar />

      <div className="flex-1 p-6 md:p-10 w-full overflow-y-auto">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6 border-b border-gray-200 pb-6">
          
          <div>
            <h2 className="text-3xl font-bold text-gray-800">دليل الجهات الداعمة</h2>
            <p className="text-gray-500 mt-2 font-bold">نظرة تفصيلية لشركاء الصندوق الطبي وحجم مساهماتهم</p>
          </div>
          
          <div className="flex flex-col gap-4 w-full xl:w-auto">
            <div className="flex flex-col md:flex-row items-center gap-4 justify-between xl:justify-end w-full">
              
              <div className="bg-indigo-600 text-white px-5 py-2 rounded-xl shadow-lg flex items-center gap-3">
                 <span className="text-2xl">🏦</span>
                 <div>
                    <p className="text-[10px] font-bold opacity-80 uppercase">رصيد الصندوق العام الحالي</p>
                    <p className="text-lg font-black">{formatCurrency(fundBalance)}</p>
                 </div>
              </div>

              {/* استخدام المكون الجديد بشكل صحيح */}
              <div className="flex items-center gap-1 bg-white p-1.5 rounded-full border border-gray-200 shadow-sm overflow-x-auto w-full md:w-auto no-scrollbar">
                <FilterTab value="all" label="كل الوقت" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
                <FilterTab value="1m" label="آخر شهر" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
                <FilterTab value="3m" label="3 أشهر" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
                <FilterTab value="6m" label="6 أشهر" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
                <FilterTab value="1y" label="آخر سنة" currentFilter={timeFilter} onFilterChange={setTimeFilter} />
              </div>
              
            </div>

            <div className="relative w-full">
              <span className="absolute inset-y-0 right-3 flex items-center text-gray-400">🔍</span>
              <input 
                type="text" 
                placeholder="ابحث عن اسم جهة داعمة..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
             <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gray-500 font-bold mt-4">جاري تحليل مساهمات الشركاء...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center animate-fadeIn">
            <span className="text-5xl mb-4 opacity-50">🤝</span>
            <p className="text-gray-500 font-bold text-xl">لا توجد مساهمات في هذه الفترة، أو لا توجد جهة تطابق بحثك.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map(category => {
              const supportersInCat = Object.keys(supporterStats[category]).filter(name => 
                name.toLowerCase().includes(searchTerm.toLowerCase())
              );

              supportersInCat.sort((a, b) => supporterStats[category][b].totalAmount - supporterStats[category][a].totalAmount);

              if (supportersInCat.length === 0) return null;

              return (
                <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
                  <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex items-center gap-3">
                    <span className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">{supportersInCat.length} جهات</span>
                    <h3 className="text-xl font-bold text-emerald-900">{category}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-gray-100">
                    {supportersInCat.map(name => {
                      const s = supporterStats[category][name];
                      return (
                        <div key={name} className="p-5 hover:bg-gray-50 transition-colors">
                          <h4 className="font-bold text-gray-800 mb-4">{name}</h4>
                          <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-gray-500">إجمالي الدعم للفترة:</span>
                            <span className={`font-black ${s.totalAmount > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {formatCurrency(s.totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">عدد الحالات:</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${s.casesCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              {s.casesCount} حالة
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}