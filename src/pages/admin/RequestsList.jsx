import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRequestsData } from '../../data/mockData';
import Sidebar from '../../components/layout/Sidebar';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function RequestsList() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 🌟 تحديد المسار الأساسي بناءً على الصلاحية لضمان التوجيه الصحيح
  const userRole = localStorage.getItem('userRole');
  const basePath = userRole === 'owner' ? '/owner' : '/admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [dataState, setDataState] = useState({ items: [], loading: true });
  const [activeSort, setActiveSort] = useState({ column: null, value: 'default' });

  const isCompletedPage = location.pathname.includes('completed');
  const pageTitle = isCompletedPage ? 'الطلبات المنجزة' : 'الطلبات الواردة الجديدة';

  // 🌟 الحل الجذري لفصل الفلاتر: تصفير الفلتر والبحث تلقائياً عند تغير الرابط
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setActiveSort({ column: null, value: 'default' });
    setSearchTerm('');
  }

  // جلب البيانات
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setDataState(prev => ({ ...prev, loading: true }));
      await new Promise(resolve => setTimeout(resolve, 10));

      const data = getRequestsData();
      const statusFiltered = data.filter(req => 
        isCompletedPage ? req.status === 'مكتمل' : req.status !== 'مكتمل'
      );

      if (isMounted) {
        setDataState({ items: statusFiltered, loading: false });
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [isCompletedPage]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(dataState.items.map(req => req.otherInfo.surgeryType));
    return Array.from(types);
  }, [dataState.items]);

  const handleHeaderClick = (column) => {
    if (activeSort.column !== column) {
      if (column === 'date' || column === 'cost') setActiveSort({ column, value: 'asc' });
      else if (column === 'status') setActiveSort({ column, value: 'مرفوض' });
      else if (column === 'type') setActiveSort({ column, value: uniqueTypes[0] });
    } else {
      let cycle = [];
      if (column === 'date' || column === 'cost') cycle = ['default', 'asc', 'desc'];
      else if (column === 'status') cycle = ['default', 'مرفوض', 'قيد الدراسة', 'فات الموعد'];
      else if (column === 'type') cycle = ['default', ...uniqueTypes];

      const currentIndex = cycle.indexOf(activeSort.value);
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= cycle.length) {
        setActiveSort({ column: null, value: 'default' });
      } else {
        setActiveSort({ column, value: cycle[nextIndex] });
      }
    }
  };

  const processedRequests = useMemo(() => {
    let result = [...dataState.items];

    if (searchTerm) {
      result = result.filter(req =>
        req.beneficiary.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.id.toString().includes(searchTerm)
      );
    }

    if (activeSort.column === 'status' && activeSort.value !== 'default') {
      result = result.filter(req => req.status === activeSort.value);
    }

    if (activeSort.value !== 'default' && activeSort.column !== 'status') {
      result.sort((a, b) => {
        if (activeSort.column === 'date') {
          const dateA = new Date(a.otherInfo?.surgeryDate || a.date).getTime();
          const dateB = new Date(b.otherInfo?.surgeryDate || b.date).getTime();
          return activeSort.value === 'asc' ? dateA - dateB : dateB - dateA;
        } 
        else if (activeSort.column === 'cost') {
          const costA = Number(a.otherInfo.estimatedCost) || 0;
          const costB = Number(b.otherInfo.estimatedCost) || 0;
          return activeSort.value === 'asc' ? costA - costB : costB - costA;
        } 
        else if (activeSort.column === 'type') {
          const typeA = a.otherInfo.surgeryType;
          const typeB = b.otherInfo.surgeryType;
          if (typeA === activeSort.value && typeB !== activeSort.value) return -1;
          if (typeA !== activeSort.value && typeB === activeSort.value) return 1;
          return typeA.localeCompare(typeB, 'ar');
        }
        return 0;
      });
    } else {
      // الترتيب الافتراضي (الأحدث أولاً)
      result.sort((a, b) => {
        const dateA = new Date(a.otherInfo?.surgeryDate || a.date).getTime();
        const dateB = new Date(b.otherInfo?.surgeryDate || b.date).getTime();
        return dateB - dateA;
      });
    }

    return result;
  }, [dataState.items, searchTerm, activeSort]);

  const renderSortIcon = (columnName) => {
    if (activeSort.column !== columnName) {
      if (columnName === 'type') return <div className="w-4 h-4 border-2 border-gray-400 rounded-sm"></div>;
      return <div className="w-4 h-4 bg-gray-300 rounded-full"></div>;
    }

    if (columnName === 'date' || columnName === 'cost') {
      return activeSort.value === 'asc' ? <span>↑</span> : <span>↓</span>;
    }

    if (columnName === 'status') {
      if (activeSort.value === 'مرفوض') return <div className="w-4 h-4 bg-red-500 rounded-full shadow-md"></div>;
      if (activeSort.value === 'قيد الدراسة') return <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-md"></div>;
      if (activeSort.value === 'فات الموعد') return <div className="w-4 h-4 bg-orange-500 rounded-full shadow-md"></div>;
    }

    if (columnName === 'type') {
      return <div className="px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 text-[10px] rounded font-bold">{activeSort.value}</div>;
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen" dir="rtl">
      <Sidebar />
      <div className="flex-1 p-6 md:p-10 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          
          {/* 🌟 التعديل هنا: إضافة العداد بجانب العنوان */}
          <h2 className="text-3xl font-bold text-gray-800 font-serif flex items-center gap-3">
            {pageTitle}
            <span className="bg-blue-100 text-blue-800 text-xl px-4 py-1 rounded-full shadow-inner font-black border-2 border-blue-200">
              {processedRequests.length}
            </span>
          </h2>
          
          <input 
            type="text" 
            placeholder="ابحث برقم الطلب أو اسم المريض..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-80 border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-sm border-b border-gray-200">
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">اسم المريض</th>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleHeaderClick('type')}>
                    <div className="flex items-center gap-2">{renderSortIcon('type')} نوع المساعدة</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleHeaderClick('cost')}>
                    <div className="flex items-center gap-2 justify-center">{renderSortIcon('cost')} التكلفة</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleHeaderClick('date')}>
                    <div className="flex items-center gap-2">{renderSortIcon('date')} التاريخ</div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors text-center" onClick={() => !isCompletedPage && handleHeaderClick('status')}>
                    <div className="flex items-center gap-2 justify-center">{renderSortIcon('status')} الحالة</div>
                  </th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {processedRequests.map((req) => {
                  return (
                    <tr key={req.id} className="hover:bg-blue-50/30 border-b border-gray-100 transition-colors">
                      <td className="p-4 font-mono text-gray-400">#{req.id}</td>
                      <td className="p-4 font-bold text-gray-800">{req.beneficiary.fullName}</td>
                      <td className="p-4 text-gray-600">{req.otherInfo.surgeryType}</td>
                      <td className="p-4 font-bold text-blue-700 text-center">{formatCurrency(req.otherInfo.estimatedCost)}</td>
                      
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className={`${req.status === 'فات الموعد' ? 'text-orange-600 font-bold' : 'text-gray-600'} text-sm`}>
                            {formatDate(req.otherInfo.surgeryDate)}
                          </span>
                          {req.status === 'فات الموعد' && (
                            <span className="text-[10px] text-orange-500 font-bold animate-pulse mt-1">⚠️ فات الموعد</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          req.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          req.status === 'مرفوض' ? 'bg-red-100 text-red-700 border-red-200' : 
                          req.status === 'فات الموعد' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                          'bg-yellow-100 text-yellow-700 border-yellow-200'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => navigate(`${basePath}/request/${req.id}`)} 
                          className="bg-white border border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all duration-200 cursor-pointer"
                        >
                          عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {processedRequests.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-16 text-center text-gray-500 font-bold">لا يوجد نتائج مطابقة للبحث أو الفلتر حالياً.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}