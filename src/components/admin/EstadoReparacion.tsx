import React, { useState } from 'react';

interface RepairStage {
  id: number;
  name: string;
  icon: string;
  key: 'recepcion' | 'diagnostico' | 'cotizacion' | 'reparacion' | 'entrega';
}

interface EstadoReparacionProps {
  currentStage?: 'recepcion' | 'diagnostico' | 'cotizacion' | 'reparacion' | 'entrega';
  onStageChange?: (stage: string) => void;
  disabled?: boolean;
}

const EstadoReparacion: React.FC<EstadoReparacionProps> = ({
  currentStage = 'recepcion',
  onStageChange,
  disabled = false
}) => {
  const [activeStage, setActiveStage] = useState(currentStage);

  const stages: RepairStage[] = [
    { id: 1, name: 'Recepción', icon: '📦', key: 'recepcion' },
    { id: 2, name: 'Diagnóstico', icon: '🔍', key: 'diagnostico' },
    { id: 3, name: 'Cotización', icon: '📋', key: 'cotizacion' },
    { id: 4, name: 'Reparación', icon: '🔧', key: 'reparacion' },
    { id: 5, name: 'Entrega', icon: '📤', key: 'entrega' }
  ];

  const handleStageClick = (stage: RepairStage) => {
    if (disabled) return;
    setActiveStage(stage.key);
    if (onStageChange) {
      onStageChange(stage.key);
    }
  };

  const getStageIndex = (key: string) => {
    return stages.findIndex(s => s.key === key);
  };

  const currentIndex = getStageIndex(activeStage);

  const getStageStatus = (stage: RepairStage) => {
    const stageIndex = getStageIndex(stage.key);
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full bg-gradient-to-br from-black/40 to-black/20 rounded-xl border border-red-500/30 p-4 sm:p-6">
      {/* Estado visual badge */}
      <div className="flex justify-end mb-4">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-500/20 text-pink-400 border border-pink-500/30">
          {activeStage === 'entrega' ? 'Entregada' : 'En proceso'}
        </span>
      </div>

      {/* Stages Container */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-8 left-0 w-full h-1 bg-gray-700/50"
             style={{
               marginLeft: '2rem',
               width: 'calc(100% - 4rem)'
             }}>
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-in-out"
            style={{
              width: `${(currentIndex / (stages.length - 1)) * 100}%`
            }}
          />
        </div>

        {/* Stages */}
        <div className="relative flex justify-between items-start">
          {stages.map((stage) => {
            const status = getStageStatus(stage);
            const isActive = status === 'active';
            const isCompleted = status === 'completed';
            const isPending = status === 'pending';

            return (
              <div
                key={stage.id}
                className={`flex flex-col items-center flex-1 ${
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                } group`}
                onClick={() => handleStageClick(stage)}
              >
                {/* Icon Circle */}
                <div className="relative mb-3">
                  <div
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center text-2xl
                      border-2 transition-all duration-300 z-10 relative
                      ${isActive
                        ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-400 shadow-lg shadow-red-500/50 scale-110'
                        : isCompleted
                        ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-400'
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600'
                      }
                      ${!disabled && 'group-hover:scale-105 group-hover:shadow-xl'}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className={`${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {stage.icon}
                      </span>
                    )}
                  </div>

                  {/* Pulsing effect for active stage */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                  )}
                </div>

                {/* Stage Name */}
                <div className="text-center">
                  <p
                    className={`
                      text-xs sm:text-sm font-medium transition-colors duration-300
                      ${isActive
                        ? 'text-red-400 font-bold'
                        : isCompleted
                        ? 'text-green-400'
                        : 'text-gray-500'
                      }
                    `}
                  >
                    {stage.id}. {stage.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Description */}
      <div className="mt-6 p-4 bg-black/40 rounded-lg border border-red-500/20">
        <p className="text-gray-300 text-sm">
          <span className="font-semibold text-red-400">Etapa actual:</span>{' '}
          {stages.find(s => s.key === activeStage)?.name || 'Recepción'}
        </p>
      </div>
    </div>
  );
};

export default EstadoReparacion;
