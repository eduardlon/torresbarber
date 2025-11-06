import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Lightbulb, 
  Send, 
  Loader2,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface AIResponse {
  type: string;
  title: string;
  data: Record<string, any>;
  insights: string[];
  recommendations: string[];
  [key: string]: any;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  aiResponse?: AIResponse;
}

const PredictiveAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const analysisTypes = [
    { id: 'general', label: 'General', icon: BarChart3, color: 'bg-blue-500' },
    { id: 'sales', label: 'Ventas', icon: DollarSign, color: 'bg-green-500' },
    { id: 'appointments', label: 'Citas', icon: Calendar, color: 'bg-purple-500' },
    { id: 'customers', label: 'Clientes', icon: Users, color: 'bg-orange-500' },
    { id: 'financial', label: 'Financiero', icon: TrendingUp, color: 'bg-red-500' }
  ];

  const quickQuestions = [
    "¿Cómo van las ventas este mes?",
    "¿Cuál es la tendencia de citas?",
    "¿Qué clientes están en riesgo?",
    "Análisis financiero del negocio",
    "¿Cuáles son mis mejores barberos?"
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/backend/api/admin/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: content,
          type: selectedAnalysisType
        })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response.title,
          timestamp: new Date(),
          aiResponse: data.response
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.message || 'Error en el análisis');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor intenta de nuevo.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const renderAIResponse = (response: AIResponse) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{response.title}</h3>
        </div>

        {/* Data Cards */}
        {response.data && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Object.entries(response.data).map(([key, value]) => {
              const isMonetary = key.includes('revenue') || key.includes('profit') || key.includes('sales') || key.includes('value') || key.includes('expenses');
              const isPercentage = key.includes('rate') || key.includes('margin') || key.includes('growth');
              
              return (
                <div key={key} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1 capitalize">
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-800">
                      {isMonetary ? formatNumber(value as number) : 
                       isPercentage ? `${(value as number).toFixed(1)}%` : 
                       value}
                    </span>
                    {isPercentage && getGrowthIcon(value as number)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Insights */}
        {response.insights && response.insights.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Insights Clave
            </h4>
            <div className="space-y-2">
              {response.insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{insight}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {response.recommendations && response.recommendations.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Recomendaciones
            </h4>
            <div className="space-y-2">
              {response.recommendations.map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{recommendation}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Data */}
        {response.top_services && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Servicios Más Populares</h4>
            <div className="space-y-2">
              {response.top_services.map((service: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="font-medium">{service.nombre}</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{service.cantidad} servicios</div>
                    <div className="font-semibold">{formatNumber(service.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {response.top_barber && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Barbero Destacado</h4>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium">{response.top_barber.nombre}</span>
                <div className="text-right">
                  <div className="font-semibold">{formatNumber(response.top_barber.total_sales)}</div>
                  <div className="text-sm text-gray-600">{response.top_barber.total_services} servicios</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">IA Predictiva</h2>
            <p className="text-gray-600 text-sm">Análisis inteligente de tu negocio</p>
          </div>
        </div>

        {/* Analysis Type Selector */}
        <div className="flex flex-wrap gap-2">
          {analysisTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedAnalysisType(type.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedAnalysisType === type.id
                    ? `${type.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">¡Hola! Soy tu asistente de IA</h3>
            <p className="text-gray-500 mb-6">Pregúntame sobre el rendimiento de tu barbería</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-sm"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-4xl ${message.type === 'user' ? 'ml-12' : 'mr-12'}`}>
                {message.type === 'user' ? (
                  <div className="bg-blue-500 text-white rounded-lg px-4 py-2 inline-block">
                    {message.content}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {message.aiResponse ? (
                      renderAIResponse(message.aiResponse)
                    ) : (
                      <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2 inline-block">
                        {message.content}
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-gray-600">Analizando datos...</span>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputValue)}
            placeholder="Pregúntame sobre ventas, citas, clientes o finanzas..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAI;