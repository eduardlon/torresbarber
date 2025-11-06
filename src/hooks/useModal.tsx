import { useState } from 'react';

// Tipos para el modal
type ModalType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface ModalConfig {
  type: ModalType;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
}

interface ModalColors {
  border: string;
  button: string;
}

export const useModal = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const showInfoModal = (title: string, message: string): void => {
    setModalConfig({
      type: 'info',
      title,
      message,
      onConfirm: null,
      onCancel: null
    });
    setShowModal(true);
  };

  const showSuccessModal = (title: string, message: string): void => {
    setModalConfig({
      type: 'success',
      title,
      message,
      onConfirm: null,
      onCancel: null
    });
    setShowModal(true);
  };

  const showWarningModal = (title: string, message: string): void => {
    setModalConfig({
      type: 'warning',
      title,
      message,
      onConfirm: null,
      onCancel: null
    });
    setShowModal(true);
  };

  const showErrorModal = (title: string, message: string): void => {
    setModalConfig({
      type: 'error',
      title,
      message,
      onConfirm: null,
      onCancel: null
    });
    setShowModal(true);
  };

  const showConfirmModal = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel: (() => void) | null = null
  ): void => {
    setModalConfig({
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel
    });
    setShowModal(true);
  };

  const hideModal = (): void => {
    setShowModal(false);
    setModalConfig({
      type: 'info',
      title: '',
      message: '',
      onConfirm: null,
      onCancel: null
    });
  };

  const getModalIcon = (): string => {
    switch (modalConfig.type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'confirm':
        return '❓';
      default:
        return 'ℹ️';
    }
  };

  const getModalColors = (): ModalColors => {
    switch (modalConfig.type) {
      case 'success':
        return {
          border: 'border-green-600/40',
          button: 'bg-green-600/20 border-green-600/40 hover:bg-green-600/30'
        };
      case 'warning':
        return {
          border: 'border-yellow-600/40',
          button: 'bg-yellow-600/20 border-yellow-600/40 hover:bg-yellow-600/30'
        };
      case 'error':
        return {
          border: 'border-red-600/40',
          button: 'bg-red-600/20 border-red-600/40 hover:bg-red-600/30'
        };
      case 'confirm':
        return {
          border: 'border-blue-600/40',
          button: 'bg-blue-600/20 border-blue-600/40 hover:bg-blue-600/30'
        };
      default:
        return {
          border: 'border-gray-600/40',
          button: 'bg-gray-600/20 border-gray-600/40 hover:bg-gray-600/30'
        };
    }
  };

  const ModalComponent: React.FC = () => {
    if (!showModal) return null;

    const colors = getModalColors();

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
        <div className={`bg-gradient-to-br from-gray-900 to-black border ${colors.border} rounded-xl p-4 sm:p-6 w-full max-w-xs sm:max-w-md lg:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide`}>
          <div className="text-center mb-4 sm:mb-6">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{getModalIcon()}</div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{modalConfig.title}</h3>
            <p className="text-sm sm:text-base text-gray-300">{modalConfig.message}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
            {modalConfig.type === 'confirm' ? (
              <>
                <button
                  onClick={() => {
                    modalConfig.onCancel?.();
                    hideModal();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-600/20 text-white rounded-lg border border-gray-600/40 hover:bg-gray-600/30 transition-all duration-200 text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    modalConfig.onConfirm?.();
                    hideModal();
                  }}
                  className={`w-full sm:w-auto px-4 py-2 text-white rounded-lg border transition-all duration-200 text-sm sm:text-base ${colors.button}`}
                >
                  Confirmar
                </button>
              </>
            ) : (
              <button
                onClick={hideModal}
                className={`w-full sm:w-auto px-4 py-2 text-white rounded-lg border transition-all duration-200 text-sm sm:text-base ${colors.button}`}
              >
                Aceptar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return {
    showModal,
    modalConfig,
    showInfoModal,
    showSuccessModal,
    showWarningModal,
    showErrorModal,
    showConfirmModal,
    hideModal,
    ModalComponent
  };
};