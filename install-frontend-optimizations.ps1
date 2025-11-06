# Script de Optimización Frontend - Astro + React
# Ejecutar en PowerShell desde el directorio del frontend

Write-Host "🚀 Iniciando optimizaciones del frontend Astro + React..." -ForegroundColor Green

# Verificar si estamos en el directorio correcto
if (-not (Test-Path "astro.config.mjs")) {
    Write-Host "❌ Error: No se encontró astro.config.mjs. Ejecuta este script desde el directorio del frontend." -ForegroundColor Red
    exit 1
}

# Función para verificar si un comando existe
function Test-Command($command) {
    try {
        Get-Command $command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Verificar Node.js y npm
Write-Host "🔍 Verificando dependencias..." -ForegroundColor Yellow

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm no está instalado" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Node.js versión: $nodeVersion" -ForegroundColor Green

# Fase 1: Herramientas de Desarrollo
Write-Host "\n📦 Fase 1: Instalando herramientas de desarrollo..." -ForegroundColor Cyan
try {
    npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier vitest @testing-library/react @testing-library/jest-dom jsdom rollup-plugin-visualizer
    Write-Host "✅ Herramientas de desarrollo instaladas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error instalando herramientas de desarrollo: $_" -ForegroundColor Yellow
}

# Fase 2: Optimizaciones de Rendimiento
Write-Host "\n⚡ Fase 2: Instalando optimizaciones de rendimiento..." -ForegroundColor Cyan
try {
    npm install --save-dev @astrojs/compress vite-plugin-pwa @astrojs/image sharp workbox-webpack-plugin
    Write-Host "✅ Optimizaciones de rendimiento instaladas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error instalando optimizaciones de rendimiento: $_" -ForegroundColor Yellow
}

# Fase 3: Mejoras de UX/UI
Write-Host "\n🎨 Fase 3: Instalando mejoras de UX/UI..." -ForegroundColor Cyan
try {
    npm install framer-motion @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast @headlessui/react @tailwindcss/forms @tailwindcss/container-queries
    Write-Host "✅ Mejoras de UX/UI instaladas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error instalando mejoras de UX/UI: $_" -ForegroundColor Yellow
}

# Fase 4: Gestión de Estado y Datos
Write-Host "\n🔄 Fase 4: Instalando gestión de estado y datos..." -ForegroundColor Cyan
try {
    npm install zustand @tanstack/react-query @tanstack/react-query-devtools axios socket.io-client
    Write-Host "✅ Gestión de estado y datos instalada" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error instalando gestión de estado: $_" -ForegroundColor Yellow
}

# Fase 5: Formularios y Validación
Write-Host "\n📝 Fase 5: Instalando herramientas de formularios..." -ForegroundColor Cyan
try {
    npm install react-hook-form zod @hookform/resolvers dompurify @types/dompurify
    Write-Host "✅ Herramientas de formularios instaladas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error instalando herramientas de formularios: $_" -ForegroundColor Yellow
}

# Fase 6: Utilidades y Accesibilidad
Write-Host "\n♿ Fase 6: Instalando utilidades y accesibilidad..." -ForegroundColor Cyan
try {
    npm install clsx tailwind-merge @axe-core/react focus-trap-react
    Write-Host "✅ Utilidades y accesibilidad instaladas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error instalando utilidades: $_" -ForegroundColor Yellow
}

Write-Host "\n🔧 Creando archivos de configuración..." -ForegroundColor Yellow

# Crear .eslintrc.js
$eslintConfig = @'
/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  ignorePatterns: ['dist/', 'node_modules/', '.astro/']
};
'@

Set-Content -Path ".eslintrc.js" -Value $eslintConfig
Write-Host "✅ .eslintrc.js creado" -ForegroundColor Green

# Crear .prettierrc
$prettierConfig = @'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
'@

Set-Content -Path ".prettierrc" -Value $prettierConfig
Write-Host "✅ .prettierrc creado" -ForegroundColor Green

# Crear vitest.config.ts
$vitestConfig = @'
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  }
});
'@

Set-Content -Path "vitest.config.ts" -Value $vitestConfig
Write-Host "✅ vitest.config.ts creado" -ForegroundColor Green

# Crear directorio de test y setup
if (-not (Test-Path "src/test")) {
    New-Item -ItemType Directory -Path "src/test" -Force
}

$testSetup = @'
import '@testing-library/jest-dom';
'@

Set-Content -Path "src/test/setup.ts" -Value $testSetup
Write-Host "✅ Configuración de testing creada" -ForegroundColor Green

# Actualizar package.json con nuevos scripts
Write-Host "\n📝 Actualizando scripts en package.json..." -ForegroundColor Yellow

$packageJson = Get-Content "package.json" | ConvertFrom-Json

# Agregar nuevos scripts
$packageJson.scripts | Add-Member -NotePropertyName "lint" -NotePropertyValue "eslint . --ext .ts,.tsx,.astro" -Force
$packageJson.scripts | Add-Member -NotePropertyName "lint:fix" -NotePropertyValue "eslint . --ext .ts,.tsx,.astro --fix" -Force
$packageJson.scripts | Add-Member -NotePropertyName "format" -NotePropertyValue "prettier --write ." -Force
$packageJson.scripts | Add-Member -NotePropertyName "format:check" -NotePropertyValue "prettier --check ." -Force
$packageJson.scripts | Add-Member -NotePropertyName "test" -NotePropertyValue "vitest" -Force
$packageJson.scripts | Add-Member -NotePropertyName "test:ui" -NotePropertyValue "vitest --ui" -Force
$packageJson.scripts | Add-Member -NotePropertyName "test:coverage" -NotePropertyValue "vitest --coverage" -Force
$packageJson.scripts | Add-Member -NotePropertyName "analyze" -NotePropertyValue "npm run build && npx vite-bundle-analyzer dist" -Force
$packageJson.scripts | Add-Member -NotePropertyName "dev:https" -NotePropertyValue "astro dev --host 0.0.0.0 --https" -Force

$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
Write-Host "✅ Scripts actualizados en package.json" -ForegroundColor Green

# Mostrar resumen
Write-Host "\n🎉 ¡Optimizaciones del frontend completadas!" -ForegroundColor Green
Write-Host "" 
Write-Host "📋 Resumen de optimizaciones instaladas:" -ForegroundColor Cyan
Write-Host "   ✅ ESLint + Prettier (calidad de código)" -ForegroundColor White
Write-Host "   ✅ Vitest + Testing Library (testing)" -ForegroundColor White
Write-Host "   ✅ PWA + Service Workers (app nativa)" -ForegroundColor White
Write-Host "   ✅ Compresión + optimización de imágenes" -ForegroundColor White
Write-Host "   ✅ Framer Motion (animaciones)" -ForegroundColor White
Write-Host "   ✅ Radix UI + Headless UI (componentes)" -ForegroundColor White
Write-Host "   ✅ Zustand + React Query (estado y datos)" -ForegroundColor White
Write-Host "   ✅ React Hook Form + Zod (formularios)" -ForegroundColor White
Write-Host "   ✅ Socket.io (tiempo real)" -ForegroundColor White
Write-Host "   ✅ Herramientas de accesibilidad" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Comandos útiles:" -ForegroundColor Cyan
Write-Host "   npm run lint          # Verificar código" -ForegroundColor White
Write-Host "   npm run format        # Formatear código" -ForegroundColor White
Write-Host "   npm run test          # Ejecutar tests" -ForegroundColor White
Write-Host "   npm run analyze       # Analizar bundle" -ForegroundColor White
Write-Host "   npm run dev:https     # Servidor HTTPS" -ForegroundColor White
Write-Host ""
Write-Host "📖 Lee FRONTEND_OPTIMIZATIONS.md para más detalles" -ForegroundColor Yellow
Write-Host ""

# Preguntar si ejecutar linting
$runLint = Read-Host "¿Deseas ejecutar el linting del código ahora? (y/N)"
if ($runLint -eq "y" -or $runLint -eq "Y") {
    Write-Host "🔍 Ejecutando linting..." -ForegroundColor Green
    npm run lint:fix
    npm run format
} else {
    Write-Host "💡 Puedes ejecutar el linting más tarde con: npm run lint" -ForegroundColor Yellow
}

Write-Host "✨ ¡Disfruta de tu frontend Astro + React optimizado!" -ForegroundColor Green