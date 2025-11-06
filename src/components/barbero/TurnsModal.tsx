import React, { useEffect } from 'react';

const TurnsModal = ({ 
  turns, 
  title, 
  status, 
  onClose, 
  onCallTurn, 
  onStartTurn, 
  onFinishingTurn, 
  onReadyToPayTurn, 
  onFinishTurn, 
  onViewClient, 
  getStatusColor, 
  getStatusText, 
  formatTime 
}) => {

  useEffect(() => {
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'waiting':
      case 'en_espera': 
        return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'called':
      case 'llamado': 
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case 'in_progress':
      case 'en_progreso': 
        return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'finishing':
      case 'finalizando':
      case 'ready_to_pay': 
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      case 'completed':
      case 'completado': 
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
      case 'cancelled':
      case 'cancelado': 
        return 'bg-red-500/20 text-red-300 border-red-400/30';
      default: 
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const getClientName = (turn) => {
    return turn.guest_name || turn.client_name || turn.client?.name || turn.client?.nombre || 'Cliente sin nombre';
  };

  const getServiceName = (turn) => {
    return turn.service_name || turn.service?.name || turn.service?.nombre || 'Servicio no especificado';
  };

  const getTurnActions = (turn) => {
    const actions = [];
    
    switch (turn.status) {
      case 'waiting':
      case 'en_espera':
        actions.push({
          label: 'Llamar',
          action: () => onCallTurn(turn.id),
          className: 'bg-yellow-500 hover:bg-yellow-600 text-white'
        });
        break;
      case 'called':
      case 'llamado':
        actions.push({
          label: 'Iniciar Corte',
          action: () => onStartTurn(turn),
          className: 'bg-green-500 hover:bg-green-600 text-white'
        });
        break;
      case 'in_progress':
      case 'en_progreso':
        actions.push({
          label: 'Finalizando',
          action: () => onFinishingTurn(turn.id),
          className: 'bg-purple-500 hover:bg-purple-600 text-white'
        });
        break;
      case 'finishing':
      case 'finalizando':
        actions.push({
          label: 'Listo para Pagar',
          action: () => onReadyToPayTurn(turn.id),
          className: 'bg-blue-500 hover:bg-blue-600 text-white'
        });
        break;
      case 'ready_to_pay':
        actions.push({
          label: 'Finalizar Turno',
          action: () => onFinishTurn(turn),
          className: 'bg-gray-500 hover:bg-gray-600 text-white'
        });
        break;
    }
    
    actions.push({
      label: 'Ver Cliente',
      action: () => onViewClient(turn),
      className: 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white border border-blue-400/30 hover:border-blue-400/50 backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/20 transform hover:scale-[1.02] transition-all duration-300'
    });
    
    return actions;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-none sm:rounded-2xl shadow-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden border-0 sm:border border-white/20 flex flex-col">
        {/* Header - Fijo en móvil */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/20 bg-gradient-to-br from-gray-900 to-black sticky top-0 z-10">
          <h2 className="text-base sm:text-xl font-semibold text-white flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              status === 'waiting' ? 'bg-blue-400' :
              status === 'called' ? 'bg-yellow-400' :
              status === 'in_progress' ? 'bg-green-400' :
              status === 'finishing' ? 'bg-purple-400' :
              'bg-gray-400'
            }`}></div>
            <span className="truncate text-sm sm:text-xl">{title}</span>
            <span className="text-xs sm:text-sm text-white/60 bg-white/10 px-2 py-1 rounded-full flex-shrink-0">
              {turns.length} {turns.length === 1 ? 'turno' : 'turnos'}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto pb-20 sm:pb-6">
          {turns.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-white/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-white/80 text-base sm:text-lg font-medium">No hay turnos en este estado</p>
              <p className="text-white/60 mt-2 text-sm sm:text-base">Los turnos aparecerán aquí cuando cambien de estado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg sm:rounded-xl p-3 sm:p-5 hover:bg-white/15 transition-all duration-200 hover:scale-[1.01] sm:hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                        <span className="text-white font-bold text-xs sm:text-sm">
                          #{turn.queue_number || turn.turn_number || 'N/A'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white text-sm sm:text-lg truncate">
                          {getClientName(turn)}
                        </h3>
                        <p className="text-white/70 text-xs sm:text-sm truncate">
                          {getServiceName(turn)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusBadgeColor(turn.status)}`}>
                      {getStatusText(turn.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-white/80 truncate">
                        Creado: {formatTime(turn.created_at)}
                      </span>
                    </div>
                    
                    {turn.start_time && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white/80 truncate">
                          Iniciado: {formatTime(turn.start_time)}
                        </span>
                      </div>
                    )}
                    
                    {turn.end_time && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white/80 truncate">
                          Finalizado: {formatTime(turn.end_time)}
                        </span>
                      </div>
                    )}
                  </div>

                  {turn.estimated_duration && (
                    <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs sm:text-sm text-white/80">
                        <div className="flex items-center space-x-2">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white/60 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          <span>Duración estimada: {turn.estimated_duration} min</span>
                        </div>
                        {turn.actual_duration && (
                          <span className="text-green-300 ml-4 sm:ml-0">
                            Real: {turn.actual_duration} min
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {turn.notes && (
                    <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs sm:text-sm text-white/80">
                        <span className="font-medium text-white">Notas:</span> {turn.notes}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1 sm:gap-2 pt-2 sm:pt-3 border-t border-white/20">
                    {getTurnActions(turn).map((action, index) => (
                      <button
                        key={index}
                        onClick={action.action}
                        className={`px-2 py-1 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs font-medium transition-all duration-200 ${action.className}`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Fijo en móvil */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 sm:p-6 border-t border-white/20 space-y-2 sm:space-y-0 bg-gradient-to-br from-gray-900 to-black sticky bottom-0 z-10">
          <div className="text-white/60 text-xs sm:text-sm">
            Mostrando {turns.length} {turns.length === 1 ? 'turno' : 'turnos'}
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:px-6 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200 border border-white/30 font-medium text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurnsModal;