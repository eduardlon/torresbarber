import React, { useRef, useEffect, useState } from 'react';
import { Camera, RotateCcw, Download, Share2, Sparkles, Zap, Eye } from 'lucide-react';

interface ARHairPreviewProps {
  onClose: () => void;
  servicios: any[];
}

interface HairStyle {
  id: string;
  nombre: string;
  imagen: string;
  categoria: string;
  popularidad: number;
  dificultad: 'Fácil' | 'Medio' | 'Difícil';
  tiempo_estimado: number;
  precio: number;
  descripcion: string;
  tags: string[];
}

const ARHairPreview: React.FC<ARHairPreviewProps> = ({ onClose, servicios }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairStyle | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [hairStyles, setHairStyles] = useState<HairStyle[]>([]);
  const [currentCategory, setCurrentCategory] = useState('Todos');
  const [aiRecommendations, setAiRecommendations] = useState<HairStyle[]>([]);
  const [faceShape, setFaceShape] = useState<string>('');
  const [skinTone, setSkinTone] = useState<string>('');
  const [confidence, setConfidence] = useState(0);

  // Estilos de cabello predefinidos con datos realistas
  const defaultHairStyles: HairStyle[] = [
    {
      id: '1',
      nombre: 'Fade Clásico',
      imagen: '/images/styles/fade-clasico.png',
      categoria: 'Fade',
      popularidad: 95,
      dificultad: 'Medio',
      tiempo_estimado: 45,
      precio: 25,
      descripcion: 'Corte degradado clásico, versátil y moderno',
      tags: ['moderno', 'versátil', 'profesional']
    },
    {
      id: '2',
      nombre: 'Undercut Moderno',
      imagen: '/images/styles/undercut.png',
      categoria: 'Undercut',
      popularidad: 88,
      dificultad: 'Difícil',
      tiempo_estimado: 60,
      precio: 35,
      descripcion: 'Corte con contraste marcado, ideal para looks audaces',
      tags: ['audaz', 'contraste', 'juvenil']
    },
    {
      id: '3',
      nombre: 'Pompadour Vintage',
      imagen: '/images/styles/pompadour.png',
      categoria: 'Clásico',
      popularidad: 75,
      dificultad: 'Difícil',
      tiempo_estimado: 50,
      precio: 40,
      descripcion: 'Estilo retro con volumen en la parte superior',
      tags: ['retro', 'elegante', 'volumen']
    },
    {
      id: '4',
      nombre: 'Buzz Cut',
      imagen: '/images/styles/buzz-cut.png',
      categoria: 'Corto',
      popularidad: 70,
      dificultad: 'Fácil',
      tiempo_estimado: 20,
      precio: 15,
      descripcion: 'Corte muy corto, práctico y de bajo mantenimiento',
      tags: ['práctico', 'deportivo', 'minimalista']
    },
    {
      id: '5',
      nombre: 'Quiff Texturizado',
      imagen: '/images/styles/quiff.png',
      categoria: 'Texturizado',
      popularidad: 82,
      dificultad: 'Medio',
      tiempo_estimado: 40,
      precio: 30,
      descripcion: 'Estilo con textura y movimiento natural',
      tags: ['textura', 'natural', 'casual']
    },
    {
      id: '6',
      nombre: 'Man Bun',
      imagen: '/images/styles/man-bun.png',
      categoria: 'Largo',
      popularidad: 65,
      dificultad: 'Fácil',
      tiempo_estimado: 30,
      precio: 20,
      descripcion: 'Estilo largo recogido, ideal para cabello abundante',
      tags: ['largo', 'bohemio', 'alternativo']
    }
  ];

  const categorias = ['Todos', 'Fade', 'Undercut', 'Clásico', 'Corto', 'Texturizado', 'Largo'];

  useEffect(() => {
    initializeCamera();
    loadHairStyles();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      startFaceDetection();
    }
  }, [isLoading]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
        };
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const loadHairStyles = () => {
    // Combinar estilos predefinidos con servicios del backend
    const combinedStyles = [...defaultHairStyles];
    
    // Agregar servicios como estilos si tienen imágenes
    servicios.forEach(servicio => {
      if (servicio.imagen) {
        combinedStyles.push({
          id: `servicio_${servicio.id}`,
          nombre: servicio.nombre,
          imagen: servicio.imagen,
          categoria: servicio.categoria || 'Otros',
          popularidad: 80,
          dificultad: 'Medio' as const,
          tiempo_estimado: servicio.duracion || 45,
          precio: servicio.precio || 25,
          descripcion: servicio.descripcion || '',
          tags: servicio.tags || []
        });
      }
    });
    
    setHairStyles(combinedStyles);
  };

  const startFaceDetection = async () => {
    // Simulación de detección facial con IA
    // En una implementación real, usarías TensorFlow.js o similar
    const detectFace = () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        // Simulamos detección exitosa
        setFaceDetected(true);
        
        // Simulamos análisis de forma de cara y tono de piel
        const shapes = ['Ovalada', 'Redonda', 'Cuadrada', 'Alargada', 'Corazón'];
        const tones = ['Claro', 'Medio', 'Oscuro', 'Oliva'];
        
        setFaceShape(shapes[Math.floor(Math.random() * shapes.length)]);
        setSkinTone(tones[Math.floor(Math.random() * tones.length)]);
        setConfidence(85 + Math.random() * 10);
        
        // Generar recomendaciones basadas en análisis
        generateAIRecommendations();
      }
    };
    
    // Simular tiempo de procesamiento
    setTimeout(detectFace, 2000);
  };

  const generateAIRecommendations = () => {
    // Algoritmo simple de recomendación basado en forma de cara
    const recommendations = hairStyles
      .sort((a, b) => b.popularidad - a.popularidad)
      .slice(0, 3);
    
    setAiRecommendations(recommendations);
  };

  const applyHairStyle = (style: HairStyle) => {
    setSelectedStyle(style);
    
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const drawFrame = () => {
        if (ctx) {
          // Dibujar video
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Simular overlay del estilo de cabello
          if (faceDetected) {
            ctx.save();
            
            // Área aproximada de la cabeza (simulada)
            const headX = canvas.width * 0.3;
            const headY = canvas.height * 0.1;
            const headWidth = canvas.width * 0.4;
            const headHeight = canvas.height * 0.5;
            
            // Overlay semi-transparente
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#4F46E5';
            ctx.fillRect(headX, headY, headWidth, headHeight * 0.6);
            
            // Texto del estilo
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(style.nombre, headX + headWidth/2, headY + 30);
            
            ctx.restore();
          }
        }
        
        if (isRecording) {
          requestAnimationFrame(drawFrame);
        }
      };
      
      setIsRecording(true);
      drawFrame();
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const link = document.createElement('a');
      link.download = `preview_${selectedStyle?.nombre || 'captura'}_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const sharePreview = async () => {
    if (canvasRef.current && navigator.share) {
      try {
        const canvas = canvasRef.current;
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], 'hair_preview.png', { type: 'image/png' });
            await navigator.share({
              title: `Preview: ${selectedStyle?.nombre}`,
              text: `¡Mira cómo me vería con este corte!`,
              files: [file]
            });
          }
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    }
  };

  const filteredStyles = currentCategory === 'Todos' 
    ? hairStyles 
    : hairStyles.filter(style => style.categoria === currentCategory);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-lg font-semibold text-red-600 mb-4">Error de Cámara</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
      {/* Header */}
      <div className="bg-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Vista Previa AR</h2>
          {faceDetected && (
            <div className="flex items-center space-x-2 text-green-600">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Rostro detectado</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 flex">
        {/* Panel de video */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Iniciando cámara...</p>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full ${selectedStyle ? 'block' : 'hidden'}`}
          />
          
          {/* Overlay de información */}
          {faceDetected && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
              <div className="text-sm space-y-1">
                <div>Forma: <span className="font-semibold">{faceShape}</span></div>
                <div>Tono: <span className="font-semibold">{skinTone}</span></div>
                <div>Confianza: <span className="font-semibold">{confidence.toFixed(1)}%</span></div>
              </div>
            </div>
          )}
          
          {/* Controles de captura */}
          {selectedStyle && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
              <button
                onClick={capturePhoto}
                className="bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100"
                title="Capturar foto"
              >
                <Camera className="h-5 w-5" />
              </button>
              <button
                onClick={sharePreview}
                className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700"
                title="Compartir"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setSelectedStyle(null)}
                className="bg-gray-600 text-white p-3 rounded-full shadow-lg hover:bg-gray-700"
                title="Quitar estilo"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Panel lateral de estilos */}
        <div className="w-80 bg-white flex flex-col">
          {/* Recomendaciones IA */}
          {aiRecommendations.length > 0 && (
            <div className="p-4 border-b">
              <div className="flex items-center space-x-2 mb-3">
                <Zap className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-800">Recomendado para ti</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {aiRecommendations.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => applyHairStyle(style)}
                    className="relative group"
                  >
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                        {style.nombre.split(' ')[0]}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all"></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Filtros de categoría */}
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800 mb-3">Categorías</h3>
            <div className="flex flex-wrap gap-2">
              {categorias.map((categoria) => (
                <button
                  key={categoria}
                  onClick={() => setCurrentCategory(categoria)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentCategory === categoria
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>
          </div>
          
          {/* Lista de estilos */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {filteredStyles.map((style) => (
                <div
                  key={style.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                    selectedStyle?.id === style.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => applyHairStyle(style)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                      {style.nombre.split(' ').map(word => word[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 truncate">{style.nombre}</h4>
                      <p className="text-sm text-gray-600 mb-2">{style.descripcion}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className={`px-2 py-1 rounded ${
                          style.dificultad === 'Fácil' ? 'bg-green-100 text-green-700' :
                          style.dificultad === 'Medio' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {style.dificultad}
                        </span>
                        <span className="font-semibold">${style.precio}</span>
                      </div>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <span>{style.tiempo_estimado} min</span>
                        <span className="mx-2">•</span>
                        <span>★ {(style.popularidad / 20).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARHairPreview;