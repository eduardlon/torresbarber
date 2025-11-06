import React from 'react';

const ModalComponent = ({ isOpen, onClose, title, type = 'info', children }) => {
  if (!isOpen) return null;

  const getModalStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-green-500',
          bg: 'bg-green-900/50',
          icon: '✅',
          iconColor: 'text-green-400'
        };
      case 'error':
        return {
          border: 'border-red-500',
          bg: 'bg-red-900/50',
          icon: '❌',
          iconColor: 'text-red-400'
        };
      case 'warning':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-900/50',
          icon: '⚠️',
          iconColor: 'text-yellow-400'
        };
      default:
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-900/50',
          icon: 'ℹ️',
          iconColor: 'text-blue-400'
        };
    }
  };

  const styles = getModalStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-gray-800 rounded-lg max-w-md w-full border ${styles.border} ${styles.bg}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-2xl ${styles.iconColor}`}>{styles.icon}</span>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          
          <div className="mb-6">
            {children}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalComponent;