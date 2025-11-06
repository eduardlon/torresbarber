#!/usr/bin/env node

/**
 * Script de verificación para JP Barber
 * Verifica que todas las configuraciones estén correctas
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.blue}🔍 ${msg}${colors.reset}`)
};

// Verificaciones
const checks = {
  // Verificar archivos esenciales
  checkEssentialFiles: () => {
    log.title('Verificando archivos esenciales...');
    
    const essentialFiles = [
      'package.json',
      'astro.config.mjs',
      'tailwind.config.mjs',
      'tsconfig.json',
      '.env.example',
      'src/layouts/Layout.astro',
      'src/utils/config.js',
      'src/utils/network.js',
      'src/utils/init.js',
      'src/utils/api.js',
      'src/components/ui/NotificationSystem.jsx',
      'src/components/ui/LoadingScreen.jsx',
      'src/components/ui/OptimizedImage.tsx'
    ];

    let allFilesExist = true;

    essentialFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        log.success(`${file} existe`);
      } else {
        log.error(`${file} no encontrado`);
        allFilesExist = false;
      }
    });

    return allFilesExist;
  },

  // Verificar configuración de package.json
  checkPackageJson: () => {
    log.title('Verificando package.json...');
    
    try {
      const packagePath = path.join(__dirname, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Verificar dependencias críticas
      const criticalDeps = [
        '@astrojs/react',
        '@astrojs/tailwind',
        'astro',
        'react',
        'react-dom',
        'tailwindcss',
        'typescript'
      ];

      let allDepsPresent = true;
      criticalDeps.forEach(dep => {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          log.success(`Dependencia ${dep} encontrada`);
        } else {
          log.error(`Dependencia ${dep} faltante`);
          allDepsPresent = false;
        }
      });

      // Verificar scripts
      const requiredScripts = ['dev', 'build', 'preview'];
      requiredScripts.forEach(script => {
        if (packageJson.scripts?.[script]) {
          log.success(`Script ${script} configurado`);
        } else {
          log.warning(`Script ${script} no encontrado`);
        }
      });

      return allDepsPresent;
    } catch (error) {
      log.error(`Error leyendo package.json: ${error.message}`);
      return false;
    }
  },

  // Verificar configuración de Astro
  checkAstroConfig: () => {
    log.title('Verificando astro.config.mjs...');
    
    try {
      const configPath = path.join(__dirname, 'astro.config.mjs');
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Verificar configuraciones importantes
      const checks = [
        { pattern: /process\.env\.API_URL/, name: 'Variable de entorno API_URL' },
        { pattern: /@astrojs\/react/, name: 'Integración React' },
        { pattern: /@astrojs\/tailwind/, name: 'Integración Tailwind' },
        { pattern: /VitePWA/, name: 'Configuración PWA' },
        { pattern: /host.*0\.0\.0\.0/, name: 'Configuración de host' }
      ];

      let allConfigsPresent = true;
      checks.forEach(check => {
        if (check.pattern.test(configContent)) {
          log.success(`${check.name} configurado`);
        } else {
          log.warning(`${check.name} no encontrado`);
          allConfigsPresent = false;
        }
      });

      return allConfigsPresent;
    } catch (error) {
      log.error(`Error leyendo astro.config.mjs: ${error.message}`);
      return false;
    }
  },

  // Verificar archivos de utilidades
  checkUtilityFiles: () => {
    log.title('Verificando archivos de utilidades...');
    
    const utilityFiles = [
      { file: 'src/utils/config.js', checks: ['APP_CONFIG', 'getApiUrl', 'clearAuthCookies'] },
      { file: 'src/utils/network.js', checks: ['detectNetworkConfig', 'setupApiUrl'] },
      { file: 'src/utils/init.js', checks: ['initializeApp', 'reinitializeApp'] },
      { file: 'src/utils/api.js', checks: ['authenticatedFetch', 'login', 'logout'] }
    ];

    let allUtilitiesValid = true;

    utilityFiles.forEach(({ file, checks }) => {
      try {
        const filePath = path.join(__dirname, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        log.info(`Verificando ${file}...`);
        checks.forEach(check => {
          if (content.includes(check)) {
            log.success(`  ${check} encontrado`);
          } else {
            log.error(`  ${check} no encontrado`);
            allUtilitiesValid = false;
          }
        });
      } catch (error) {
        log.error(`Error leyendo ${file}: ${error.message}`);
        allUtilitiesValid = false;
      }
    });

    return allUtilitiesValid;
  },

  // Verificar componentes UI
  checkUIComponents: () => {
    log.title('Verificando componentes UI...');
    
    const components = [
      { file: 'src/components/ui/NotificationSystem.jsx', checks: ['NotificationProvider', 'useNotifications'] },
      { file: 'src/components/ui/LoadingScreen.jsx', checks: ['LoadingScreen', 'AppInitializationLoader'] },
      { file: 'src/components/ui/OptimizedImage.tsx', checks: ['OptimizedImage', 'OptimizedAvatar'] }
    ];

    let allComponentsValid = true;

    components.forEach(({ file, checks }) => {
      try {
        const filePath = path.join(__dirname, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        log.info(`Verificando ${file}...`);
        checks.forEach(check => {
          if (content.includes(check)) {
            log.success(`  ${check} encontrado`);
          } else {
            log.error(`  ${check} no encontrado`);
            allComponentsValid = false;
          }
        });
      } catch (error) {
        log.error(`Error leyendo ${file}: ${error.message}`);
        allComponentsValid = false;
      }
    });

    return allComponentsValid;
  },

  // Verificar estructura de directorios
  checkDirectoryStructure: () => {
    log.title('Verificando estructura de directorios...');
    
    const requiredDirs = [
      'src',
      'src/components',
      'src/components/ui',
      'src/layouts',
      'src/pages',
      'src/utils',
      'src/styles',
      'public'
    ];

    let allDirsExist = true;

    requiredDirs.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        log.success(`Directorio ${dir}/ existe`);
      } else {
        log.error(`Directorio ${dir}/ no encontrado`);
        allDirsExist = false;
      }
    });

    return allDirsExist;
  }
};

// Función principal
async function runVerification() {
  console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════════════════╗
║                    JP BARBER - VERIFICACIÓN                  ║
║                  Sistema de Gestión de Barbería              ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const results = {
    essentialFiles: checks.checkEssentialFiles(),
    packageJson: checks.checkPackageJson(),
    astroConfig: checks.checkAstroConfig(),
    utilityFiles: checks.checkUtilityFiles(),
    uiComponents: checks.checkUIComponents(),
    directoryStructure: checks.checkDirectoryStructure()
  };

  console.log('\n' + '='.repeat(60));
  log.title('RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(60));

  const allPassed = Object.values(results).every(result => result);

  Object.entries(results).forEach(([check, passed]) => {
    const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
    if (passed) {
      log.success(`${checkName}: CORRECTO`);
    } else {
      log.error(`${checkName}: REQUIERE ATENCIÓN`);
    }
  });

  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    log.success('🎉 TODAS LAS VERIFICACIONES PASARON');
    console.log(`${colors.green}
Tu aplicación JP Barber está correctamente configurada.
Puedes ejecutar 'npm run dev' para iniciar el desarrollo.
${colors.reset}`);
  } else {
    log.error('❌ ALGUNAS VERIFICACIONES FALLARON');
    console.log(`${colors.yellow}
Revisa los errores anteriores y corrige los problemas identificados.
Consulta el archivo CORRECCIONES_Y_MEJORAS.md para más detalles.
${colors.reset}`);
  }

  console.log(`${colors.blue}
📚 Documentación adicional:
   - CORRECCIONES_Y_MEJORAS.md
   - FRONTEND_OPTIMIZATIONS.md
   - README.md

🚀 Comandos útiles:
   - npm install          (instalar dependencias)
   - npm run dev          (desarrollo local)
   - npm run build        (construir para producción)
   - npm run preview      (previsualizar build)
${colors.reset}`);

  process.exit(allPassed ? 0 : 1);
}

// Ejecutar verificación
runVerification().catch(error => {
  log.error(`Error durante la verificación: ${error.message}`);
  process.exit(1);
});