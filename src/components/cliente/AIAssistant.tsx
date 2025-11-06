import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'suggestion' | 'appointment' | 'service' | 'image';
  data?: any;
  isTyping?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  data?: any;
}

interface AIAssistantProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onToast: (message: string, type: 'success' | 'error') => void;
  onNavigate?: (section: string) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ authenticatedFetch, onToast, onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [conversationContext, setConversationContext] = useState<any>({});
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Inicializar el asistente
  useEffect(() => {
    initializeAI();
    setupVoiceRecognition();
    setupSpeechSynthesis();
  }, []);

  // Auto-scroll al final
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const initializeAI = async () => {
    try {
      const response = await authenticatedFetch('/api/cliente?action=init_ai_assistant');
      const data = await response.json();
      
      if (data.success) {
        setQuickActions(data.quickActions || []);
        setConversationContext(data.context || {});
        
        // Mensaje de bienvenida
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          text: `¡Hola! Soy tu asistente virtual de JP Barber 🤖✂️\n\n¿En qué puedo ayudarte hoy? Puedo ayudarte con:\n\n• Agendar citas\n• Consultar horarios\n• Recomendar servicios\n• Información sobre promociones\n• Consejos de cuidado capilar\n• Y mucho más...`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };
        
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error al inicializar AI:', error);
    }
  };

  const setupVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'es-ES';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = () => {
        setIsListening(false);
        onToast('Error en el reconocimiento de voz', 'error');
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
      setVoiceEnabled(true);
    }
  };

  const setupSpeechSynthesis = () => {
    if ('speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
    }
  };

  const startVoiceRecognition = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  const speakText = (text: string) => {
    if (synthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      synthesis.speak(utterance);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (text?: string, actionData?: any) => {
    const messageText = text || inputText.trim();
    if (!messageText && !actionData) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      type: actionData ? 'suggestion' : 'text',
      data: actionData
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setIsLoading(true);

    try {
      const response = await authenticatedFetch('/api/cliente', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ai_chat',
          message: messageText,
          context: conversationContext,
          actionData: actionData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Simular typing delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'ai',
          timestamp: new Date(),
          type: data.type || 'text',
          data: data.data
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setConversationContext(data.context || conversationContext);
        
        // Hablar la respuesta si está habilitado
        if (data.speak && synthesis) {
          speakText(data.response);
        }
        
        // Actualizar acciones rápidas si se proporcionan
        if (data.quickActions) {
          setQuickActions(data.quickActions);
        }
        
        // Ejecutar acciones especiales
        if (data.action) {
          executeAction(data.action, data.actionData);
        }
      } else {
        throw new Error(data.error || 'Error en la respuesta del AI');
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      onToast('Error al comunicarse con el asistente', 'error');
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

  const executeAction = (action: string, data?: any) => {
    switch (action) {
      case 'navigate':
        if (onNavigate && data?.section) {
          onNavigate(data.section);
          setIsOpen(false);
        }
        break;
      case 'schedule_appointment':
        if (onNavigate) {
          onNavigate('appointments');
          setIsOpen(false);
        }
        break;
      case 'view_services':
        // Mostrar información de servicios
        break;
      case 'show_promotions':
        // Mostrar promociones
        break;
      default:
        console.log('Acción no reconocida:', action);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.label, { action: action.action, ...action.data });
  };

  const clearChat = () => {
    setMessages([]);
    setConversationContext({});
    initializeAI();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (message: Message) => {
    if (message.type === 'appointment' && message.data) {
      return (
        <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-3 mt-2">
          <div className="flex items-center mb-2">
            <span className="text-lg mr-2">📅</span>
            <span className="font-semibold text-purple-300">Cita Sugerida</span>
          </div>
          <div className="text-sm space-y-1">
            <p><strong>Fecha:</strong> {message.data.fecha}</p>
            <p><strong>Hora:</strong> {message.data.hora}</p>
            <p><strong>Barbero:</strong> {message.data.barbero}</p>
            <p><strong>Servicio:</strong> {message.data.servicio}</p>
            <p><strong>Precio:</strong> ${message.data.precio}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => executeAction('schedule_appointment', message.data)}
            className="mt-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
          >
            Agendar Esta Cita
          </motion.button>
        </div>
      );
    }
    
    return (
      <div className="whitespace-pre-wrap">
        {message.text}
      </div>
    );
  };

  return (
    <>
      {/* Botón flotante del asistente */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-2xl z-50 border-2 border-white/20"
        style={{ zIndex: 1000 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isOpen ? '✕' : '🤖'}
        </motion.div>
        
        {/* Indicador de actividad */}
        {(isTyping || isLoading) && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
          />
        )}
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-96 bg-gray-900 rounded-2xl shadow-2xl border border-white/20 flex flex-col z-50"
            style={{ zIndex: 999 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      🤖
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Asistente IA</h3>
                    <p className="text-xs text-gray-400">
                      {isTyping ? 'Escribiendo...' : 'En línea'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {voiceEnabled && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={startVoiceRecognition}
                      disabled={isListening}
                      className={`p-2 rounded-full transition-all ${
                        isListening 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }`}
                    >
                      🎤
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={clearChat}
                    className="p-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-full transition-all"
                  >
                    🗑️
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-full transition-all"
                  >
                    ✕
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
            >
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-white/10 text-gray-100 border border-white/20'
                  }`}>
                    {formatMessage(message)}
                    <div className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-2xl">
                    <div className="flex space-x-1">
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="px-4 py-2 border-t border-white/10">
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickAction(action)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-3 py-1 rounded-full transition-all border border-white/20"
                    >
                      <span className="mr-1">{action.icon}</span>
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? 'Escuchando...' : 'Escribe tu mensaje...'}
                  disabled={isLoading || isListening}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-all"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    '📤'
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;