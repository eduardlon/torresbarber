import React from 'react';

interface ConfirmActionModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/95 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-2xl">⚠️</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-red-400">Confirmar acción</p>
            <h2 className="mt-1 text-xl font-bold text-white">{title}</h2>
          </div>
        </div>
        <p className="text-sm text-zinc-300">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-400 hover:text-white sm:w-auto"
            disabled={isProcessing}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="w-full rounded-xl border border-red-500/60 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isProcessing ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
