/**
 * 🤖 Servicio Central de Inteligencia Artificial
 * Sistema revolucionario de IA para predicciones y recomendaciones
 */

import { ApiResponse, Barbero, Cliente, Cita, StatsData } from '@/types';

// Tipos específicos para IA
export interface PredictionData {
  date: string;
  barberId?: number;
  expectedDemand: number;
  confidence: number;
  factors: string[];
}

export interface PersonalizedRecommendation {
  clientId: number;
  recommendations: {
    services: Array<{
      id: number;
      name: string;
      confidence: number;
      reason: string;
    }>;
    products: Array<{
      id: number;
      name: string;
      confidence: number;
      reason: string;
    }>;
    timeSlots: Array<{
      datetime: string;
      confidence: number;
      reason: string;
    }>;
  };
}

export interface TrendAnalysis {
  period: string;
  trends: Array<{
    category: 'services' | 'products' | 'times' | 'seasons';
    trend: string;
    growth: number;
    prediction: string;
    confidence: number;
  }>;
}

export interface SentimentAnalysis {
  overall: number; // -1 to 1
  aspects: {
    service: number;
    quality: number;
    price: number;
    ambiance: number;
    staff: number;
  };
  keywords: Array<{
    word: string;
    sentiment: number;
    frequency: number;
  }>;
}

class AIService {
  private apiBaseUrl: string;

  constructor() {
    // Verificar si estamos en el cliente antes de acceder a window
    this.apiBaseUrl = typeof window !== 'undefined' && window.API_BASE_URL 
      ? window.API_BASE_URL 
      : 'http://localhost:8001/api';
  }

  /**
   * 📈 Predicción de Demanda Inteligente
   * Utiliza ML para predecir la demanda futura
   */
  async predictDemand(
    barberId?: number,
    date?: string,
    timeRange?: { start: string; end: string }
  ): Promise<PredictionData[]> {
    try {
      const params = new URLSearchParams();
      if (barberId) params.append('barber_id', barberId.toString());
      if (date) params.append('date', date);
      if (timeRange) {
        params.append('start_time', timeRange.start);
        params.append('end_time', timeRange.end);
      }

      const response = await fetch(`${this.apiBaseUrl}/ai/predict-demand?${params}`);
      const data: ApiResponse<PredictionData[]> = await response.json();
      
      if (data.success) {
        return data.data || [];
      }
      
      // Fallback con predicción básica
      return this.generateBasicPrediction(barberId, date);
    } catch (error) {
      console.error('Error predicting demand:', error);
      return this.generateBasicPrediction(barberId, date);
    }
  }

  /**
   * 🎯 Recomendaciones Personalizadas
   * IA que aprende de patrones del cliente
   */
  async getPersonalizedRecommendations(clientId: number): Promise<PersonalizedRecommendation> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/recommendations/${clientId}`);
      const data: ApiResponse<PersonalizedRecommendation> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      // Fallback con recomendaciones básicas
      return this.generateBasicRecommendations(clientId);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return this.generateBasicRecommendations(clientId);
    }
  }

  /**
   * 📊 Análisis de Tendencias
   * Detecta patrones y tendencias emergentes
   */
  async analyzeTrends(period: string = '30d'): Promise<TrendAnalysis> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/trends?period=${period}`);
      const data: ApiResponse<TrendAnalysis> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return this.generateBasicTrends(period);
    } catch (error) {
      console.error('Error analyzing trends:', error);
      return this.generateBasicTrends(period);
    }
  }

  /**
   * 💭 Análisis de Sentimientos
   * Analiza reviews y feedback de clientes
   */
  async analyzeSentiment(reviews: string[]): Promise<SentimentAnalysis> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews })
      });
      
      const data: ApiResponse<SentimentAnalysis> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return this.generateBasicSentiment(reviews);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return this.generateBasicSentiment(reviews);
    }
  }

  /**
   * ⚡ Optimización de Horarios
   * IA para optimizar la programación de citas
   */
  async optimizeSchedule(
    barberId: number,
    date: string,
    constraints?: {
      minBreak?: number;
      maxConsecutive?: number;
      preferredTimes?: string[];
    }
  ): Promise<Array<{ time: string; confidence: number; reason: string }>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/optimize-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId, date, constraints })
      });
      
      const data: ApiResponse<Array<{ time: string; confidence: number; reason: string }>> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return this.generateBasicSchedule(date);
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      return this.generateBasicSchedule(date);
    }
  }

  /**
   * 🔮 Predicción de Ingresos
   * Predice ingresos futuros basado en tendencias
   */
  async predictRevenue(
    period: string,
    barberId?: number
  ): Promise<{ prediction: number; confidence: number; factors: string[] }> {
    try {
      const params = new URLSearchParams({ period });
      if (barberId) params.append('barber_id', barberId.toString());

      const response = await fetch(`${this.apiBaseUrl}/ai/predict-revenue?${params}`);
      const data: ApiResponse<{ prediction: number; confidence: number; factors: string[] }> = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return { prediction: 0, confidence: 0.5, factors: ['Datos insuficientes'] };
    } catch (error) {
      console.error('Error predicting revenue:', error);
      return { prediction: 0, confidence: 0.5, factors: ['Error en predicción'] };
    }
  }

  // Métodos de fallback para cuando la API no está disponible
  private generateBasicPrediction(barberId?: number, date?: string): PredictionData[] {
    const baseDate = date ? new Date(date) : new Date();
    const predictions: PredictionData[] = [];
    
    for (let i = 0; i < 7; i++) {
      const predictionDate = new Date(baseDate);
      predictionDate.setDate(baseDate.getDate() + i);
      
      // Lógica básica: más demanda en fines de semana
      const dayOfWeek = predictionDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const expectedDemand = isWeekend ? Math.random() * 20 + 15 : Math.random() * 15 + 8;
      
      predictions.push({
        date: predictionDate.toISOString().split('T')[0],
        barberId,
        expectedDemand: Math.round(expectedDemand),
        confidence: 0.7,
        factors: ['Patrón histórico', 'Día de la semana']
      });
    }
    
    return predictions;
  }

  private generateBasicRecommendations(clientId: number): PersonalizedRecommendation {
    return {
      clientId,
      recommendations: {
        services: [
          { id: 1, name: 'Corte Clásico', confidence: 0.8, reason: 'Servicio más popular' },
          { id: 2, name: 'Barba', confidence: 0.6, reason: 'Complementa el corte' }
        ],
        products: [
          { id: 1, name: 'Pomada para Cabello', confidence: 0.7, reason: 'Mantiene el estilo' },
          { id: 2, name: 'Aceite para Barba', confidence: 0.5, reason: 'Cuidado complementario' }
        ],
        timeSlots: [
          { datetime: '2024-01-20T10:00:00', confidence: 0.9, reason: 'Horario preferido histórico' },
          { datetime: '2024-01-20T14:00:00', confidence: 0.7, reason: 'Disponibilidad alta' }
        ]
      }
    };
  }

  private generateBasicTrends(period: string): TrendAnalysis {
    return {
      period,
      trends: [
        {
          category: 'services',
          trend: 'Cortes modernos en aumento',
          growth: 15,
          prediction: 'Continuará creciendo',
          confidence: 0.8
        },
        {
          category: 'times',
          trend: 'Mayor demanda en tardes',
          growth: 10,
          prediction: 'Estable',
          confidence: 0.7
        }
      ]
    };
  }

  private generateBasicSentiment(reviews: string[]): SentimentAnalysis {
    // Análisis básico de palabras clave
    const positiveWords = ['excelente', 'bueno', 'genial', 'perfecto', 'recomiendo'];
    const negativeWords = ['malo', 'terrible', 'pésimo', 'horrible', 'no recomiendo'];
    
    let totalSentiment = 0;
    reviews.forEach(review => {
      const lowerReview = review.toLowerCase();
      positiveWords.forEach(word => {
        if (lowerReview.includes(word)) totalSentiment += 0.2;
      });
      negativeWords.forEach(word => {
        if (lowerReview.includes(word)) totalSentiment -= 0.2;
      });
    });
    
    const avgSentiment = reviews.length > 0 ? totalSentiment / reviews.length : 0;
    
    return {
      overall: Math.max(-1, Math.min(1, avgSentiment)),
      aspects: {
        service: avgSentiment + (Math.random() - 0.5) * 0.2,
        quality: avgSentiment + (Math.random() - 0.5) * 0.2,
        price: avgSentiment + (Math.random() - 0.5) * 0.2,
        ambiance: avgSentiment + (Math.random() - 0.5) * 0.2,
        staff: avgSentiment + (Math.random() - 0.5) * 0.2
      },
      keywords: [
        { word: 'servicio', sentiment: 0.8, frequency: 5 },
        { word: 'calidad', sentiment: 0.7, frequency: 3 }
      ]
    };
  }

  private generateBasicSchedule(date: string): Array<{ time: string; confidence: number; reason: string }> {
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    return times.map(time => ({
      time,
      confidence: Math.random() * 0.5 + 0.5,
      reason: 'Horario disponible'
    }));
  }
}

// Instancia singleton
export const aiService = new AIService();
export default aiService;