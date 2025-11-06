module.exports = {
  // Configuración básica
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  
  // Indentación y espaciado
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  
  // Configuración específica para diferentes tipos de archivos
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
        printWidth: 100,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        bracketSpacing: true,
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: ['*.tsx', '*.jsx'],
      options: {
        printWidth: 90,
        jsxSingleQuote: false,
        bracketSameLine: false,
        htmlWhitespaceSensitivity: 'css',
      },
    },
    {
      files: ['*.ts', '*.js'],
      options: {
        printWidth: 85,
        singleQuote: true,
        semi: true,
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false,
        trailingComma: 'none',
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        singleQuote: false,
        trailingComma: 'none',
      },
    },
    {
      files: '*.css',
      options: {
        printWidth: 100,
        singleQuote: true,
      },
    },
    {
      files: '*.scss',
      options: {
        printWidth: 100,
        singleQuote: true,
      },
    },
    {
      files: '*.html',
      options: {
        printWidth: 120,
        htmlWhitespaceSensitivity: 'ignore',
        bracketSameLine: true,
      },
    },
    {
      files: '*.yml',
      options: {
        printWidth: 80,
        singleQuote: true,
        tabWidth: 2,
      },
    },
    {
      files: '*.yaml',
      options: {
        printWidth: 80,
        singleQuote: true,
        tabWidth: 2,
      },
    },
    {
      files: 'package.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
        singleQuote: false,
        trailingComma: 'none',
      },
    },
    {
      files: '*.config.{js,ts,mjs}',
      options: {
        printWidth: 100,
        singleQuote: true,
        semi: true,
        trailingComma: 'es5',
      },
    },
  ],
  
  // Plugins
  plugins: [
    'prettier-plugin-astro',
    'prettier-plugin-tailwindcss', // Debe ser el último para ordenar clases
  ],
  
  // Configuración específica para Tailwind CSS
  tailwindConfig: './tailwind.config.mjs',
  tailwindFunctions: ['clsx', 'cn', 'cva'],
  
  // Configuración para HTML
  htmlWhitespaceSensitivity: 'css',
  
  // Configuración para Vue/Astro
  vueIndentScriptAndStyle: false,
  
  // Configuración experimental
  experimentalTernaries: false,
};