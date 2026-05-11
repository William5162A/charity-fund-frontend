import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { fetchAidRequests } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';

export default function RequestsList() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { user } = useAuth();
  // 🌟 تحديث التوجيه الديناميكي ليطابق المسارات الجديدة تماماً
  const basePath = user?.role === ROLES.ADMIN ? '/admin' : '/processor';

  const [searchTerm, setSearchTerm] = useState('');
  const [dataState, setDataState] = useState({ items: [], loading: true, error: null });
  const [activeSort, setActiveSort] = useState({ column: null, value: 'default' });

  const isCompletedPage = location.pathname.includes('completed');
  const pageTitle = isCompletedPage ? 'الطلبات المنجزة' : 'الطلبات الواردة الجديدة';

  const [prevPath, setPrevPath] = useState(location.pathname);
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setActiveSort({ column: null, value: 'default' });
    setSearchTerm('');
  }

  const STATUS_MAP = {
    'pending': 'قيد الدراسة',
    'processing': 'معالجة',
    'completed': 'مكتمل',
    'rejected': 'مرفوض'
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      setDataState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const rawData = await fetchAidRequests();
        
        if (abortController.signal.aborted) return;

        const statusFiltered = rawData.filter(req => 
          isCompletedPage ? req.request_status === 'completed' : req.request_status !== 'completed'
        );

        setDataState({ items: statusFiltered, loading: false, error: null });
      } catch (err) {
        if (abortController.signal.aborted) return;
        setDataState({ items: [], loading: false, error: err.message });
      }
    };
    
    loadData();
    
    return () => {
      abortController.abort();
    };
  }, [isCompletedPage]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(dataState.items.map(req => req.aid_request_type?.type_name || 'عام'));
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
      else if (column === 'status') cycle = ['default', 'مرفوض', 'قيد الدراسة', 'معالجة', 'فات الموعد'];
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
        (req.patient_full_name && req.patient_full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        req.id.toString().includes(searchTerm)
      );
    }

    if (activeSort.column === 'status' && activeSort.value !== 'default') {
      result = result.filter(req => {
        const isOverdue = new Date(req.date_of_aid) < new Date() && req.request_status !== 'completed';
        const displayStatus = isOverdue ? 'فات الموعد' : STATUS_MAP[req.request_status];
        return displayStatus === activeSort.value;
      });
    }

    if (activeSort.value !== 'default' && activeSort.column !== 'status') {
      result.sort((a, b) => {
        if (activeSort.column === 'date') {
          const dateA = new Date(a.date_of_aid).getTime();
          const dateB = new Date(b.date_of_aid).getTime();
          return activeSort.value === 'asc' ? dateA - dateB : dateB - dateA;
        } 
        else if (activeSort.column === 'cost') {
          const costA = Number(a.estimated_cost) || 0;
          const costB = Number(b.estimated_cost) || 0;
          return activeSort.value === 'asc' ? costA - costB : costB - costA;
        } 
        else if (activeSort.column === 'type') {
          const typeA = a.aid_request_type?.type_name || 'عام';
          const typeB = b.aid_request_type?.type_name || 'عام';
          if (typeA === activeSort.value && typeB !== activeSort.value) return -1;
          if (typeA !== activeSort.value && typeB === activeSort.value) return 1;
          return typeA.localeCompare(typeB, 'ar');
        }
        return 0;
      });
    } else {
      result.sort((a, b) => new Date(b.date_of_aid).getTime() - new Date(a.date_of_aid).getTime());
    }

    return result;
  }, [dataState.items, searchTerm, activeSort]);

  const renderSortIcon = (columnName) => {
    if (activeSort.column !== columnName) {
      if (columnName === 'type') return <div className="w-4 h-4 border-2 border-gray-400 rounded-sm shrink-0"></div>;
      return <div className="w-4 h-4 bg-gray-300 rounded-full shrink-0"></div>;
    }

    if (columnName === 'date' || columnName === 'cost') {
      return activeSort.value === 'asc' ? <span>↑</span> : <span>↓</span>;
    }

    if (columnName === 'status') {
      if (activeSort.value === 'مرفوض') return <div className="w-4 h-4 bg-red-500 rounded-full shadow-md shrink-0"></div>;
      if (activeSort.value === 'قيد الدراسة') return <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-md shrink-0"></div>;
      if (activeSort.value === 'معالجة') return <div className="w-4 h-4 bg-blue-500 rounded-full shadow-md shrink-0"></div>;
      if (activeSort.value === 'فات الموعد') return <div className="w-4 h-4 bg-orange-500 rounded-full shadow-md shrink-0"></div>;
    }

    if (columnName === 'type') {
      return <div className="px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 text-[10px] rounded font-bold whitespace-nowrap">{activeSort.value}</div>;
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen" dir="rtl">
      <Sidebar />
      <div className="flex-1 p-6 lg:p-10 w-full overflow-hidden">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 font-serif flex items-center gap-3">
            {pageTitle}
            <span className="bg-blue-100 text-blue-800 text-xl px-4 py-1 rounded-full shadow-inner font-black border-2 border-blue-200">
              {processedRequests.length}
            </span>
          </h2>
          
          <div className="lg:justify-self-end w-full lg:w-80">
            <input 
              type="text" 
              placeholder="ابحث برقم الطلب أو اسم المريض..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
        </div>

        {dataState.loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-gray-500 font-bold mt-4">جاري جلب الطلبات...</p>
          </div>
        ) : dataState.error ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-red-100 shadow-sm">
             <span className="text-4xl mb-4">⚠️</span>
             <p className="text-red-600 font-bold">{dataState.error}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 text-sm border-b border-gray-200">
                    <th className="p-4 whitespace-nowrap">رقم الطلب</th>
                    <th className="p-4 whitespace-nowrap">اسم المريض</th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => handleHeaderClick('type')}>
                      <div className="flex items-center gap-2">{renderSortIcon('type')} نوع المساعدة</div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => handleHeaderClick('cost')}>
                      <div className="flex items-center gap-2 justify-center">{renderSortIcon('cost')} التكلفة</div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap" onClick={() => handleHeaderClick('date')}>
                      <div className="flex items-center gap-2">{renderSortIcon('date')} التاريخ</div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors text-center whitespace-nowrap" onClick={() => !isCompletedPage && handleHeaderClick('status')}>
                      <div className="flex items-center gap-2 justify-center">{renderSortIcon('status')} الحالة</div>
                    </th>
                    <th className="p-4 text-center whitespace-nowrap">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {processedRequests.map((req) => {
                    const isOverdue = new Date(req.date_of_aid) < new Date() && req.request_status !== 'completed';
                    const displayStatus = isOverdue ? 'فات الموعد' : STATUS_MAP[req.request_status] || req.request_status;
                    const typeName = req.aid_request_type?.type_name || 'عام';

                    return (
                      <tr key={req.id} className="hover:bg-blue-50/30 border-b border-gray-100 transition-colors">
                        <td className="p-4 font-mono text-gray-400">#{req.id}</td>
                        <td className="p-4 font-bold text-gray-800">{req.patient_full_name}</td>
                        <td className="p-4 text-gray-600">{typeName}</td>
                        <td className="p-4 font-bold text-blue-700 text-center">{formatCurrency(req.estimated_cost)}</td>
                        
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className={`${isOverdue ? 'text-orange-600 font-bold' : 'text-gray-600'} text-sm`}>
                              {formatDate(req.date_of_aid)}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] text-orange-500 font-bold animate-pulse mt-1">⚠️ فات الموعد</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                            displayStatus === 'مكتمل' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            displayStatus === 'مرفوض' ? 'bg-red-100 text-red-700 border-red-200' : 
                            displayStatus === 'فات الموعد' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                            displayStatus === 'معالجة' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            'bg-yellow-100 text-yellow-700 border-yellow-200'
                          }`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => navigate(`${basePath}/request/${req.id}`)} 
                            className="bg-white border border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all duration-200 cursor-pointer whitespace-nowrap"
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
        )}
      </div>
    </div>
  );
}