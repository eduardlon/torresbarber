import React, { useState, useEffect, useRef } from 'react';

interface ClienteAIAssistantProps {
  onToast: (message: string, type?: 'success' | 'error') => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'action';
  metadata?: any;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  description: string;
}

interface AIInsight {
  type: 'recommendation' | 'trend' | 'reminder' | 'tip';
  title: string;
  content: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
}

export const ClienteAIAssistant: React.FC<ClienteAIAssistantProps> = ({
  onToast,
  authenticatedFetch
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'schedule',
      label: 'Agendar Cita',
      icon: '📅',
      action: '¿Puedes ayudarme a agendar una cita?',
      description: 'Te ayudo a encontrar el mejor horario'
    },
    {
      id: 'services',
      label: 'Servicios',
      icon: '✂️',
      action: '¿Qué servicios ofrecen y cuáles me recomiendas?',
      description: 'Conoce nuestros servicios y recomendaciones'
    },
    {
      id: 'history',
      label: 'Mi Historial',
      icon: '📊',
      action: 'Muéstrame mi historial de visitas y estadísticas',
      description: 'Revisa tu progreso y estadísticas'
    },
    {
      id: 'rewards',
      label: 'Recompensas',
      icon: '🏆',
      action: '¿Cómo puedo ganar más puntos y recompensas?',
      description: 'Maximiza tus beneficios y logros'
    },
    {
      id: 'tips',
      label: 'Consejos',
      icon: '💡',
      action: 'Dame consejos para el cuidado del cabello',
      description: 'Tips personalizados para tu tipo de cabello'
    },
    {
      id: 'promotions',
      label: 'Promociones',
      icon: '🎉',
      action: '¿Hay promociones o descuentos disponibles?',
      description: 'No te pierdas nuestras ofertas especiales'
    }
  ];

  useEffect(() => {
    loadInsights();
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = () => {
    const welcomeMessage: Message = {
      id: 'welcome',
      content: '¡Hola! Soy tu asistente personal de JP Barber. Estoy aquí para ayudarte con citas, recomendaciones, consejos de cuidado capilar y mucho más. ¿En qué puedo ayudarte hoy?',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages([welcomeMessage]);
  };

  const loadInsights = async () => {
    try {
      const response = await authenticatedFetch('/cliente/ai-insights');
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.data || []);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);
    setIsTyping(true);

    try {
      const response = await authenticatedFetch('/cliente/ai-chat', {
        method: 'POST',
        body: JSON.stringify({ 
          mensaje: content,
          contexto: 'cliente_panel',
          historial: messages.slice(-5) // Enviar últimos 5 mensajes para contexto
        })
      });

      const data = await response.json();
      
      setIsTyping(false);
      
      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.respuesta,
          sender: 'ai',
          timestamp: new Date(),
          type: data.tipo || 'text',
          metadata: data.metadata
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Si hay acciones sugeridas, agregarlas
        if (data.acciones_sugeridas && data.acciones_sugeridas.length > 0) {
          const suggestionsMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: 'Acciones sugeridas:',
            sender: 'ai',
            timestamp: new Date(),
            type: 'suggestion',
            metadata: { suggestions: data.acciones_sugeridas }
          };
          setMessages(prev => [...prev, suggestionsMessage]);
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo o reformula tu pregunta.',
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Error de conexión. Por favor verifica tu conexión a internet e intenta de nuevo.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.action);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputMessage);
    }
  };

  const executeAction = async (action: string, params?: any) => {
    try {
      const response = await authenticatedFetch('/cliente/ai-action', {
        method: 'POST',
        body: JSON.stringify({ action, params })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onToast(data.message || 'Acción ejecutada exitosamente');
        
        // Agregar mensaje de confirmación
        const confirmMessage: Message = {
          id: Date.now().toString(),
          content: data.message || 'Acción completada exitosamente.',
          sender: 'ai',
          timestamp: new Date(),
          type: 'action'
        };
        setMessages(prev => [...prev, confirmMessage]);
      } else {
        onToast(data.message || 'Error al ejecutar la acción', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      onToast('Error de conexión', 'error');
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return '💡';
      case 'trend': return '📈';
      case 'reminder': return '⏰';
      case 'tip': return '✨';
      default: return '💡';
    }
  };

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20';
      case 'low': return 'border-blue-500 bg-blue-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      {!isLoadingInsights && insights.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <span className="mr-2">🧠</span>
            Insights Personalizados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getInsightColor(insight.priority)}`}>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                  <div>
                    <h4 className="text-white font-medium mb-1">{insight.title}</h4>
                    <p className="text-gray-300 text-sm">{insight.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg p-3 transition-all group"
              title={action.description}
            >
              <div className="text-center">
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <div className="text-white text-xs font-medium">
                  {action.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
        {/* Chat Header */}
        <div className="bg-white/5 px-6 py-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Asistente IA JP Barber</h3>
              <p className="text-gray-300 text-sm">
                {isTyping ? 'Escribiendo...' : 'En línea'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white border border-white/20'
              }`}>
                {message.type === 'suggestion' && message.metadata?.suggestions ? (
                  <div>
                    <p className="mb-2">{message.content}</p>
                    <div className="space-y-1">
                      {message.metadata.suggestions.map((suggestion: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => executeAction(suggestion.action, suggestion.params)}
                          className="block w-full text-left bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm transition-colors"
                        >
                          {suggestion.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white/5 px-6 py-4 border-t border-white/10">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje aquí..."
              disabled={isSending}
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isSending}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '📤'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Features Info */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">🚀</span>
          Capacidades del Asistente IA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2 flex items-center">
              <span className="mr-2">🎯</span>
              Recomendaciones Personalizadas
            </h4>
            <p className="text-gray-300 text-sm">
              Sugerencias basadas en tu historial, preferencias y tendencias actuales.
            </p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2 flex items-center">
              <span className="mr-2">📊</span>
              Análisis Inteligente
            </h4>
            <p className="text-gray-300 text-sm">
              Insights sobre tus patrones de visita, gastos y progreso en gamificación.
            </p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2 flex items-center">
              <span className="mr-2">⚡</span>
              Acciones Automáticas
            </h4>
            <p className="text-gray-300 text-sm">
              Ejecuta acciones como agendar citas, ver horarios y gestionar recompensas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteAIAssistant;