/**
 * 🎮 Sistema de Logros y Gamificación
 * Componente revolucionario para engagement del usuario
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  category: 'visits' | 'spending' | 'referrals' | 'sustainability' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
  reward?: {
    type: 'discount' | 'service' | 'product' | 'badge';
    value: string;
  };
}

interface UserLevel {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  title: string;
  benefits: string[];
}

interface Challenge {
  id: number;
  title: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  progress: number;
  maxProgress: number;
  reward: {
    xp: number;
    points: number;
    items?: string[];
  };
  expiresAt: string;
  completed: boolean;
}

const AchievementSystem: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>({
    level: 1,
    currentXP: 0,
    nextLevelXP: 100,
    title: 'Novato',
    benefits: []
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnlockAnimation, setShowUnlockAnimation] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    setLoading(true);
    try {
      // Simular datos de gamificación (en producción vendría de la API)
      const mockAchievements: Achievement[] = [
        {
          id: 1,
          title: 'Primera Visita',
          description: 'Completa tu primera cita en JP Barber',
          icon: '🎉',
          category: 'visits',
          rarity: 'common',
          points: 50,
          progress: 1,
          maxProgress: 1,
          unlocked: true,
          unlockedAt: '2024-01-15',
          reward: { type: 'discount', value: '10% en próxima visita' }
        },
        {
          id: 2,
          title: 'Cliente Frecuente',
          description: 'Visita JP Barber 10 veces',
          icon: '⭐',
          category: 'visits',
          rarity: 'rare',
          points: 200,
          progress: 7,
          maxProgress: 10,
          unlocked: false
        },
        {
          id: 3,
          title: 'Eco Warrior',
          description: 'Elige 5 servicios con productos ecológicos',
          icon: '🌱',
          category: 'sustainability',
          rarity: 'epic',
          points: 300,
          progress: 3,
          maxProgress: 5,
          unlocked: false
        },
        {
          id: 4,
          title: 'Influencer',
          description: 'Refiere 5 amigos que completen una cita',
          icon: '📱',
          category: 'referrals',
          rarity: 'legendary',
          points: 500,
          progress: 2,
          maxProgress: 5,
          unlocked: false,
          reward: { type: 'service', value: 'Corte premium gratis' }
        },
        {
          id: 5,
          title: 'Big Spender',
          description: 'Gasta $500 en total',
          icon: '💰',
          category: 'spending',
          rarity: 'rare',
          points: 250,
          progress: 350,
          maxProgress: 500,
          unlocked: false
        },
        {
          id: 6,
          title: 'Social Media Star',
          description: 'Comparte 3 fotos en redes sociales',
          icon: '📸',
          category: 'social',
          rarity: 'common',
          points: 100,
          progress: 1,
          maxProgress: 3,
          unlocked: false
        }
      ];

      const mockUserLevel: UserLevel = {
        level: 5,
        currentXP: 750,
        nextLevelXP: 1000,
        title: 'Cliente VIP',
        benefits: [
          'Descuento 15% permanente',
          'Reservas prioritarias',
          'Productos exclusivos'
        ]
      };

      const mockChallenges: Challenge[] = [
        {
          id: 1,
          title: 'Desafío Diario',
          description: 'Reserva una cita para hoy',
          icon: '📅',
          type: 'daily',
          progress: 0,
          maxProgress: 1,
          reward: { xp: 50, points: 25 },
          expiresAt: '2024-01-20T23:59:59',
          completed: false
        },
        {
          id: 2,
          title: 'Semana Verde',
          description: 'Usa solo productos ecológicos esta semana',
          icon: '🌿',
          type: 'weekly',
          progress: 2,
          maxProgress: 5,
          reward: { xp: 200, points: 100, items: ['Shampoo ecológico gratis'] },
          expiresAt: '2024-01-26T23:59:59',
          completed: false
        },
        {
          id: 3,
          title: 'Mes del Referido',
          description: 'Refiere 3 amigos este mes',
          icon: '👥',
          type: 'monthly',
          progress: 1,
          maxProgress: 3,
          reward: { xp: 500, points: 250, items: ['Corte gratis', 'Producto premium'] },
          expiresAt: '2024-01-31T23:59:59',
          completed: false
        }
      ];

      setAchievements(mockAchievements);
      setUserLevel(mockUserLevel);
      setChallenges(mockChallenges);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-600 to-gray-700 border-gray-500';
      case 'rare': return 'from-blue-600 to-blue-700 border-blue-500';
      case 'epic': return 'from-purple-600 to-purple-700 border-purple-500';
      case 'legendary': return 'from-yellow-600 to-yellow-700 border-yellow-500';
      default: return 'from-gray-600 to-gray-700 border-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'visits': return '🏪';
      case 'spending': return '💰';
      case 'referrals': return '👥';
      case 'sustainability': return '🌱';
      case 'social': return '📱';
      default: return '🏆';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'weekly': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'monthly': return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      case 'special': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'Todos', icon: '🏆' },
    { id: 'visits', name: 'Visitas', icon: '🏪' },
    { id: 'spending', name: 'Gastos', icon: '💰' },
    { id: 'referrals', name: 'Referidos', icon: '👥' },
    { id: 'sustainability', name: 'Eco', icon: '🌱' },
    { id: 'social', name: 'Social', icon: '📱' }
  ];

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">🎮 Cargando sistema de logros...</p>
          </div>
        </div>
      </div>
    );
  }

  const levelProgress = (userLevel.currentXP / userLevel.nextLevelXP) * 100;

  return (
    <div className="space-y-6">
      {/* Header con nivel del usuario */}
      <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-2xl border border-purple-600/30 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              🏆
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Sistema de Logros</h2>
              <p className="text-purple-400">Nivel {userLevel.level} - {userLevel.title}</p>
            </div>
          </div>
          
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/70 text-sm">Progreso al siguiente nivel</span>
              <span className="text-purple-400 text-sm font-medium">
                {userLevel.currentXP}/{userLevel.nextLevelXP} XP
              </span>
            </div>
            <div className="w-full bg-purple-900/30 rounded-full h-3">
              <motion.div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
        
        {userLevel.benefits.length > 0 && (
          <div className="mt-4 p-4 bg-purple-900/20 rounded-xl border border-purple-600/20">
            <h4 className="text-white font-semibold mb-2">🎁 Beneficios de tu nivel:</h4>
            <div className="flex flex-wrap gap-2">
              {userLevel.benefits.map((benefit, index) => (
                <span key={index} className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-lg text-sm">
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desafíos activos */}
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          ⚡ Desafíos Activos
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {challenges.map((challenge) => (
            <motion.div
              key={challenge.id}
              className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/30 hover:border-purple-600/30 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-2xl">{challenge.icon}</div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${getTypeColor(challenge.type)}`}>
                  {challenge.type}
                </div>
              </div>
              
              <h4 className="font-semibold text-white mb-2">{challenge.title}</h4>
              <p className="text-white/70 text-sm mb-3">{challenge.description}</p>
              
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60">Progreso</span>
                  <span className="text-xs text-white/60">
                    {challenge.progress}/{challenge.maxProgress}
                  </span>
                </div>
                <div className="w-full bg-zinc-700/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(challenge.progress / challenge.maxProgress) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <div className="text-purple-400">
                  +{challenge.reward.xp} XP, +{challenge.reward.points} pts
                </div>
                <div className="text-white/50">
                  {new Date(challenge.expiresAt).toLocaleDateString('es-ES')}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filtros de categorías */}
      <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-2xl border border-zinc-700/50 p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-700/50 text-white/70 hover:bg-zinc-600/50'
              }`}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* Grid de logros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredAchievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`relative bg-gradient-to-br ${getRarityColor(achievement.rarity)} rounded-xl p-4 border-2 ${
                  achievement.unlocked ? 'opacity-100' : 'opacity-60'
                } hover:scale-105 transition-all duration-300 cursor-pointer`}
                whileHover={{ y: -5 }}
              >
                {achievement.unlocked && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                
                <div className="text-center mb-3">
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <h4 className="font-bold text-white text-lg">{achievement.title}</h4>
                  <p className="text-white/80 text-sm">{achievement.description}</p>
                </div>
                
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/70">Progreso</span>
                    <span className="text-xs text-white/70">
                      {achievement.progress}/{achievement.maxProgress}
                    </span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-2">
                    <div 
                      className="bg-white/80 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-sm">⭐ {achievement.points}</span>
                    <span className="text-xs text-white/60 capitalize">{achievement.rarity}</span>
                  </div>
                  <div className="text-lg">{getCategoryIcon(achievement.category)}</div>
                </div>
                
                {achievement.reward && (
                  <div className="mt-3 p-2 bg-black/20 rounded-lg">
                    <div className="text-xs text-white/80">
                      🎁 {achievement.reward.value}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Estadísticas de logros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-xl border border-zinc-700/50 p-4 text-center">
          <div className="text-2xl mb-2">🏆</div>
          <div className="text-2xl font-bold text-white">
            {achievements.filter(a => a.unlocked).length}
          </div>
          <div className="text-sm text-white/60">Logros Desbloqueados</div>
        </div>
        
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-xl border border-zinc-700/50 p-4 text-center">
          <div className="text-2xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-yellow-400">
            {achievements.filter(a => a.unlocked).reduce((acc, a) => acc + a.points, 0)}
          </div>
          <div className="text-sm text-white/60">Puntos Totales</div>
        </div>
        
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-xl border border-zinc-700/50 p-4 text-center">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-2xl font-bold text-purple-400">
            {challenges.filter(c => c.completed).length}/{challenges.length}
          </div>
          <div className="text-sm text-white/60">Desafíos Completados</div>
        </div>
        
        <div className="bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 rounded-xl border border-zinc-700/50 p-4 text-center">
          <div className="text-2xl mb-2">👑</div>
          <div className="text-2xl font-bold text-blue-400">
            {achievements.filter(a => a.rarity === 'legendary' && a.unlocked).length}
          </div>
          <div className="text-sm text-white/60">Logros Legendarios</div>
        </div>
      </div>
    </div>
  );
};

export default AchievementSystem;