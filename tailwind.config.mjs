/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
		'./public/**/*.html',
	],
	darkMode: 'class', // Soporte para modo oscuro
	theme: {
		extend: {
			// Fuentes personalizadas
			fontFamily: {
				'roboto': ['Roboto', 'sans-serif'],
				'montserrat': ['Montserrat', 'sans-serif'],
				'inter': ['Inter', 'system-ui', 'sans-serif'],
			},
			
			// Colores personalizados para la barbería
			colors: {
				primary: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					900: '#0f172a',
					950: '#020617',
				},
				barber: {
					gold: '#d4af37',
					bronze: '#cd7f32',
					dark: '#1a1a1a',
					light: '#f5f5f5',
				},
				success: {
					50: '#f0fdf4',
					500: '#22c55e',
					600: '#16a34a',
				},
				warning: {
					50: '#fffbeb',
					500: '#f59e0b',
					600: '#d97706',
				},
				error: {
					50: '#fef2f2',
					500: '#ef4444',
					600: '#dc2626',
				},
			},
			
			// Espaciado personalizado
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem',
			},
			
			// Animaciones personalizadas
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
				'slide-up': 'slideUp 0.3s ease-out',
				'slide-down': 'slideDown 0.3s ease-out',
				'bounce-gentle': 'bounceGentle 2s infinite',
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'spin-slow': 'spin 3s linear infinite',
				'wiggle': 'wiggle 1s ease-in-out infinite',
			},
			
			// Keyframes para animaciones
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideUp: {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				slideDown: {
					'0%': { transform: 'translateY(-100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				bounceGentle: {
					'0%, 100%': { transform: 'translateY(-5%)' },
					'50%': { transform: 'translateY(0)' },
				},
				wiggle: {
					'0%, 100%': { transform: 'rotate(-3deg)' },
					'50%': { transform: 'rotate(3deg)' },
				},
			},
			
			// Sombras personalizadas
			boxShadow: {
				'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
				'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 10px -2px rgba(0, 0, 0, 0.05)',
				'glow': '0 0 20px rgba(212, 175, 55, 0.3)',
				'glow-strong': '0 0 30px rgba(212, 175, 55, 0.5)',
			},
			
			// Bordes redondeados personalizados
			borderRadius: {
				'4xl': '2rem',
				'5xl': '2.5rem',
			},
			
			// Gradientes personalizados
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
				'barber-gradient': 'linear-gradient(135deg, #d4af37 0%, #cd7f32 100%)',
				'dark-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
			},
			
			// Tamaños de pantalla personalizados
			screens: {
				'xs': '475px',
				'3xl': '1680px',
				'4xl': '2560px',
			},
			
			// Transiciones personalizadas
			transitionDuration: {
				'400': '400ms',
				'600': '600ms',
			},
			
			// Z-index personalizado
			zIndex: {
				'60': '60',
				'70': '70',
				'80': '80',
				'90': '90',
				'100': '100',
			},
		},
	},
	plugins: [
		// Plugin para formularios
		require('@tailwindcss/forms')({
			strategy: 'class',
		}),
		
		// Plugin para tipografía
		require('@tailwindcss/typography'),
		
		// Plugin para container queries
		require('@tailwindcss/container-queries'),
		
		// Plugin personalizado para utilidades de barbería
		function({ addUtilities, addComponents, theme }) {
			// Utilidades personalizadas
			addUtilities({
				'.text-balance': {
					'text-wrap': 'balance',
				},
				'.text-pretty': {
					'text-wrap': 'pretty',
				},
				'.scrollbar-hide': {
					'-ms-overflow-style': 'none',
					'scrollbar-width': 'none',
					'&::-webkit-scrollbar': {
						display: 'none',
					},
				},
				'.glass': {
					'backdrop-filter': 'blur(16px) saturate(180%)',
					'background-color': 'rgba(255, 255, 255, 0.75)',
					'border': '1px solid rgba(255, 255, 255, 0.125)',
				},
				'.glass-dark': {
					'backdrop-filter': 'blur(16px) saturate(180%)',
					'background-color': 'rgba(0, 0, 0, 0.75)',
					'border': '1px solid rgba(255, 255, 255, 0.125)',
				},
			});
			
			// Componentes personalizados
			addComponents({
				'.btn-primary': {
					'@apply bg-barber-gold hover:bg-barber-bronze text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-medium hover:shadow-strong': {},
				},
				'.btn-secondary': {
					'@apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-all duration-300': {},
				},
				'.card': {
					'@apply bg-white rounded-xl shadow-soft border border-gray-100 p-6 transition-all duration-300 hover:shadow-medium': {},
				},
				'.card-dark': {
					'@apply bg-gray-800 rounded-xl shadow-soft border border-gray-700 p-6 transition-all duration-300 hover:shadow-medium': {},
				},
				'.input-field': {
					'@apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-barber-gold focus:border-transparent transition-all duration-200': {},
				},
				'.badge': {
					'@apply inline-flex items-center px-3 py-1 rounded-full text-sm font-medium': {},
				},
				'.badge-success': {
					'@apply badge bg-success-50 text-success-600': {},
				},
				'.badge-warning': {
					'@apply badge bg-warning-50 text-warning-600': {},
				},
				'.badge-error': {
					'@apply badge bg-error-50 text-error-600': {},
				},
			});
		},
	],
	
	// Configuración de purge para optimización
	safelist: [
		// Clases que siempre deben incluirse
		'animate-fade-in',
		'animate-slide-up',
		'animate-slide-down',
		'glass',
		'glass-dark',
		{
			pattern: /bg-(success|warning|error)-(50|500|600)/,
		},
		{
			pattern: /text-(success|warning|error)-(500|600)/,
		},
	],
};