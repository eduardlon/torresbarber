import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HairStyle {
  id: string;
  name: string;
  category: 'classic' | 'modern' | 'trendy' | 'beard';
  image: string;
  description: string;
  price: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  faceShapes: string[];
  aiRecommended?: boolean;
}

interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  landmarks: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  faceShape: 'oval' | 'round' | 'square' | 'heart' | 'diamond';
  skinTone: 'light' | 'medium' | 'dark';
}

interface AIAnalysis {
  faceShape: string;
  skinTone: string;
  hairType: string;
  recommendedStyles: string[];
  confidence: number;
}

const VirtualHairTryOn: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<HairStyle | null>(null);
  const [faceDetection, setFaceDetection] = useState<FaceDetection | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const animationFrameRef = useRef<number>();

  const hairStyles: HairStyle[] = [
    {
      id: 'fade-classic',
      name: 'Fade Clásico',
      category: 'classic',
      image: '/images/styles/fade-classic.svg',
      description: 'Corte degradado tradicional, elegante y versátil',
      price: 25000,
      duration: 45,
      difficulty: 'medium',
      faceShapes: ['oval', 'round', 'square'],
      aiRecommended: true
    },
    {
      id: 'undercut-modern',
      name: 'Undercut Moderno',
      category: 'modern',
      image: '/images/styles/undercut-modern.svg',
      description: 'Estilo contemporáneo con contraste marcado',
      price: 30000,
      duration: 60,
      difficulty: 'hard',
      faceShapes: ['oval', 'square', 'diamond']
    },
    {
      id: 'buzz-cut',
      name: 'Buzz Cut',
      category: 'classic',
      image: '/images/styles/buzz-cut.svg',
      description: 'Corte muy corto, práctico y masculino',
      price: 15000,
      duration: 20,
      difficulty: 'easy',
      faceShapes: ['oval', 'square', 'round']
    },
    {
      id: 'pompadour',
      name: 'Pompadour',
      category: 'trendy',
      image: '/images/styles/pompadour.svg',
      description: 'Estilo vintage con volumen en la parte superior',
      price: 35000,
      duration: 75,
      difficulty: 'hard',
      faceShapes: ['oval', 'heart']
    },
    {
      id: 'beard-full',
      name: 'Barba Completa',
      category: 'beard',
      image: '/images/styles/beard-full.svg',
      description: 'Barba completa con arreglo profesional',
      price: 20000,
      duration: 30,
      difficulty: 'medium',
      faceShapes: ['oval', 'round', 'square', 'heart', 'diamond']
    },
    {
      id: 'textured-crop',
      name: 'Textured Crop',
      category: 'trendy',
      image: '/images/styles/textured-crop.svg',
      description: 'Corte texturizado con acabado natural',
      price: 28000,
      duration: 50,
      difficulty: 'medium',
      faceShapes: ['oval', 'round', 'diamond']
    }
  ];

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsActive(true);
        startFaceDetection();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Simulación de detección facial con IA
    // En una implementación real, usarías TensorFlow.js o similar
    const mockFaceDetection: FaceDetection = {
      x: video.videoWidth * 0.25,
      y: video.videoHeight * 0.2,
      width: video.videoWidth * 0.5,
      height: video.videoHeight * 0.6,
      landmarks: {
        leftEye: { x: video.videoWidth * 0.35, y: video.videoHeight * 0.35 },
        rightEye: { x: video.videoWidth * 0.65, y: video.videoHeight * 0.35 },
        nose: { x: video.videoWidth * 0.5, y: video.videoHeight * 0.5 },
        mouth: { x: video.videoWidth * 0.5, y: video.videoHeight * 0.65 }
      },
      faceShape: 'oval',
      skinTone: 'medium'
    };

    setFaceDetection(mockFaceDetection);

    // Dibujar overlay del rostro detectado
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      mockFaceDetection.x,
      mockFaceDetection.y,
      mockFaceDetection.width,
      mockFaceDetection.height
    );

    // Dibujar puntos de referencia
    ctx.fillStyle = '#ff0000';
    Object.values(mockFaceDetection.landmarks).forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Aplicar estilo de cabello si está seleccionado
    if (selectedStyle) {
      await applyHairStyle(ctx, mockFaceDetection, selectedStyle);
    }
  }, [selectedStyle]);

  const applyHairStyle = async (ctx: CanvasRenderingContext2D, face: FaceDetection, style: HairStyle) => {
    // Simulación de aplicación de estilo
    // En una implementación real, usarías modelos de IA para mapear el estilo
    
    const hairOverlay = new Path2D();
    
    if (style.category === 'beard') {
      // Dibujar barba
      ctx.fillStyle = 'rgba(101, 67, 33, 0.8)';
      ctx.fillRect(
        face.landmarks.mouth.x - 40,
        face.landmarks.mouth.y + 10,
        80,
        60
      );
    } else {
      // Dibujar cabello
      ctx.fillStyle = 'rgba(101, 67, 33, 0.8)';
      
      switch (style.id) {
        case 'fade-classic':
          // Fade clásico
          ctx.fillRect(face.x, face.y - 20, face.width, 40);
          break;
        case 'undercut-modern':
          // Undercut
          ctx.fillRect(face.x + 20, face.y - 30, face.width - 40, 50);
          break;
        case 'buzz-cut':
          // Buzz cut
          ctx.fillRect(face.x + 10, face.y - 15, face.width - 20, 30);
          break;
        case 'pompadour':
          // Pompadour
          ctx.fillRect(face.x, face.y - 40, face.width, 60);
          break;
        case 'textured-crop':
          // Textured crop
          ctx.fillRect(face.x + 5, face.y - 25, face.width - 10, 45);
          break;
      }
    }
  };

  const startFaceDetection = useCallback(() => {
    const detect = () => {
      detectFace();
      animationFrameRef.current = requestAnimationFrame(detect);
    };
    detect();
  }, [detectFace]);

  const analyzeWithAI = async () => {
    if (!faceDetection) return;
    
    setIsAnalyzing(true);
    
    // Simulación de análisis con IA
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockAnalysis: AIAnalysis = {
      faceShape: faceDetection.faceShape,
      skinTone: faceDetection.skinTone,
      hairType: 'straight',
      recommendedStyles: ['fade-classic', 'undercut-modern', 'textured-crop'],
      confidence: 0.92
    };
    
    setAiAnalysis(mockAnalysis);
    setShowRecommendations(true);
    setIsAnalyzing(false);
  };

  const capturePhoto = () => {
    if (!canvasRef.current) return;
    
    const dataURL = canvasRef.current.toDataURL('image/png');
    setCapturedPhoto(dataURL);
  };

  const sharePhoto = async () => {
    if (!capturedPhoto) return;
    
    if (navigator.share) {
      try {
        // Convertir dataURL a blob
        const response = await fetch(capturedPhoto);
        const blob = await response.blob();
        const file = new File([blob], 'mi-nuevo-look.png', { type: 'image/png' });
        
        await navigator.share({
          title: 'Mi nuevo look en JP Barber',
          text: `¡Mira cómo me vería con este corte en JP Barber! ${selectedStyle?.name}`,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: descargar imagen
      const link = document.createElement('a');
      link.download = 'mi-nuevo-look.png';
      link.href = capturedPhoto;
      link.click();
    }
  };

  const getRecommendedStyles = () => {
    if (!aiAnalysis) return hairStyles;
    
    return hairStyles.filter(style => 
      aiAnalysis.recommendedStyles.includes(style.id)
    ).map(style => ({ ...style, aiRecommended: true }));
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          Probador Virtual AR
        </h2>
        <p className="text-gray-600">Usa tu cámara para probar diferentes estilos con inteligencia artificial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cámara y Canvas */}
        <div className="space-y-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            {!isActive ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={startCamera}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Iniciando cámara...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                      </svg>
                      Activar Cámara
                    </div>
                  )}
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                />
                
                {/* Controles de cámara */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  <button
                    onClick={capturePhoto}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </button>
                  
                  <button
                    onClick={analyzeWithAI}
                    disabled={isAnalyzing}
                    className="bg-purple-600/80 backdrop-blur-sm hover:bg-purple-700/80 text-white px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analizando...
                      </div>
                    ) : (
                      'Analizar con IA'
                    )}
                  </button>
                  
                  <button
                    onClick={stopCamera}
                    className="bg-red-600/80 backdrop-blur-sm hover:bg-red-700/80 text-white p-3 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Información de detección */}
          {faceDetection && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="font-medium text-green-800">Rostro detectado</span>
              </div>
              <div className="text-sm text-green-700">
                <p>Forma del rostro: <span className="font-medium">{faceDetection.faceShape}</span></p>
                <p>Tono de piel: <span className="font-medium">{faceDetection.skinTone}</span></p>
              </div>
            </motion.div>
          )}

          {/* Análisis de IA */}
          {aiAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-50 border border-purple-200 rounded-lg p-4"
            >
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
                <span className="font-medium text-purple-800">Análisis IA</span>
                <span className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                  {Math.round(aiAnalysis.confidence * 100)}% confianza
                </span>
              </div>
              <div className="text-sm text-purple-700">
                <p>Tipo de cabello: <span className="font-medium">{aiAnalysis.hairType}</span></p>
                <p>Estilos recomendados: <span className="font-medium">{aiAnalysis.recommendedStyles.length}</span></p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Estilos disponibles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Estilos Disponibles</h3>
            {showRecommendations && (
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {showRecommendations ? 'Ver todos' : 'Solo recomendados'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {(showRecommendations ? getRecommendedStyles() : hairStyles).map((style) => (
              <motion.div
                key={style.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStyle(style)}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedStyle?.id === style.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 bg-white'
                }`}
              >
                {style.aiRecommended && (
                  <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                    IA
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{style.name}</h4>
                    <p className="text-sm text-gray-600">${style.price.toLocaleString()}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        style.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        style.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {style.difficulty === 'easy' ? 'Fácil' : 
                         style.difficulty === 'medium' ? 'Medio' : 'Difícil'}
                      </span>
                      <span className="text-xs text-gray-500">{style.duration} min</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-2">{style.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Foto capturada */}
      <AnimatePresence>
        {capturedPhoto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setCapturedPhoto(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Foto Capturada</h3>
                <button
                  onClick={() => setCapturedPhoto(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <img src={capturedPhoto} alt="Foto capturada" className="w-full rounded-lg mb-4" />
              
              {selectedStyle && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">Estilo aplicado:</p>
                  <p className="font-medium">{selectedStyle.name}</p>
                  <p className="text-sm text-gray-600">${selectedStyle.price.toLocaleString()} - {selectedStyle.duration} min</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={sharePhoto}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Compartir
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = 'mi-nuevo-look.png';
                    link.href = capturedPhoto;
                    link.click();
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Descargar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VirtualHairTryOn;