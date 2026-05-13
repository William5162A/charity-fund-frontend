import React from 'react';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'تأكيد الحذف', 
  cancelText = 'تراجع', 
  isDestructive = true, 
  isProcessing = false 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fadeIn">
        <div className={`p-5 border-b ${isDestructive ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
          <h3 className={`text-xl font-black flex items-center gap-2 ${isDestructive ? 'text-red-700' : 'text-gray-800'}`}>
            {isDestructive && <span>⚠️</span>} {title}
          </h3>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 font-bold text-sm leading-relaxed">{message}</p>
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'}`}
          >
            {isProcessing ? 'جاري التنفيذ...' : confirmText}
          </button>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}