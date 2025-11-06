import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, X, Minimize2, MessageCircle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: string[];
  metadata?: {
    intent?: string;
    confidence?: number;
    actions?: Array<{
      type: string;
      label: string;
      data: any;
    }>;
  };
}

interface ChatbotProps {
  apiBaseUrl?: string;
  className?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ 
  apiBaseUrl = 'http://localhost:8000/api',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Cargar historial al abrir el chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen]);

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/chatbot/history?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } else {
          // Mensaje de bienvenida si no hay historial
          setMessages([{
            id: 'welcome',
            content: '¡Hola! Soy el asistente virtual de JP Barber. ¿En qué puedo ayudarte hoy?',
            sender: 'bot',
            timestamp: new Date(),
            suggestions: [
              'Agendar una cita',
              'Ver horarios disponibles',
              'Conocer nuestros servicios',
              'Información de contacto'
            ]
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Mensaje de bienvenida por defecto
      setMessages([{
        id: 'welcome',
        content: '¡Hola! Soy el asistente virtual de JP Barber. ¿En qué puedo ayudarte hoy?',
        sender: 'bot',
        timestamp: new Date(),
        suggestions: [
          'Agendar una cita',
          'Ver horarios disponibles',
          'Conocer nuestros servicios',
          'Información de contacto'
        ]
      }]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: content.trim(),
          session_id: sessionId,
          context: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        content: data.response || 'Lo siento, no pude procesar tu mensaje.',
        sender: 'bot',
        timestamp: new Date(),
        suggestions: data.suggestions,
        metadata: data.metadata
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleActionClick = async (action: any) => {
    try {
      const response = await fetch(`${apiBaseUrl}/chatbot/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: action.type,
          data: action.data,
          session_id: sessionId
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.redirect_url) {
          window.open(result.redirect_url, '_blank');
        }
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch(`${apiBaseUrl}/chatbot/history?session_id=${sessionId}`, {
        method: 'DELETE'
      });
      setMessages([]);
      loadChatHistory();
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Chat Window */}
      {isOpen && (
        <div
          className={`bg-white rounded-lg shadow-2xl border border-gray-200 ${
            isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'
          } flex flex-col transition-all duration-300 mb-4`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">JP Barber Assistant</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.sender === 'user'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.sender === 'bot' && (
                          <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        {message.sender === 'user' && (
                          <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-red-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {message.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="block w-full text-left text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Actions */}
                      {message.metadata?.actions && message.metadata.actions.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {message.metadata.actions.map((action, index) => (
                            <button
                              key={index}
                              onClick={() => handleActionClick(action)}
                              className="block w-full text-left text-xs bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 transition-colors"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
                      <Bot className="w-4 h-4" />
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-600">Escribiendo...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(inputValue);
                      }
                    }}
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => sendMessage(inputValue)}
                    disabled={isLoading || !inputValue.trim()}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                
                {messages.length > 1 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-500 hover:text-gray-700 mt-2 transition-colors"
                  >
                    Limpiar conversación
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

export default Chatbot;