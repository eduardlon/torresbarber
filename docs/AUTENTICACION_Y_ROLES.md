# Autenticación y Control de Acceso - JP Barber System

## Tabla de Contenidos

1. [Sistema de Autenticación](#sistema-de-autenticación)
2. [Roles y Permisos](#roles-y-permisos)
3. [Implementación JWT](#implementación-jwt)
4. [Middleware y Guards](#middleware-y-guards)
5. [Seguridad](#seguridad)

---

## Sistema de Autenticación

### Estrategia Recomendada: JWT (JSON Web Tokens)

**Ventajas:**
- ✅ Stateless - No requiere almacenamiento en servidor
- ✅ Escalable - Funciona bien con múltiples servidores
- ✅ Compatible con frontend moderno (React, Astro)
- ✅ Funciona para web y móvil

**Alternativa:** Sesiones tradicionales (si prefieres mayor control)

---

## Flujo de Autenticación

### 1. Login

```
Cliente → POST /api/auth/login
         ↓
    Validar credenciales
         ↓
    Generar JWT Token
         ↓
    Responder con token + datos usuario
         ↓
    Cliente guarda token (localStorage/cookie)
```

### 2. Peticiones Autenticadas

```
Cliente → GET /api/barberos (con header: Authorization: Bearer {token})
         ↓
    Middleware verifica token
         ↓
    Decodifica y valida
         ↓
    Adjunta usuario a request
         ↓
    Continúa con endpoint
```

### 3. Logout

```
Cliente → POST /api/auth/logout
         ↓
    Invalidar token (opcional)
         ↓
    Cliente elimina token
```

---

## Roles y Permisos

### Roles del Sistema

| Rol | Descripción | Nivel |
|-----|-------------|-------|
| **Admin** | Administrador con acceso total al sistema | 🔴 Alto |
| **Barbero** | Barbero que atiende clientes y gestiona su cola | 🟡 Medio |
| **Recepcionista** | Personal que agenda citas y gestiona la recepción | 🟢 Básico |

---

### Matriz de Permisos

| Funcionalidad | Admin | Barbero | Recepcionista |
|---------------|-------|---------|---------------|
| **Dashboard General** | ✅ | ❌ | ❌ |
| **Dashboard Propio** | ✅ | ✅ | ❌ |
| | | | |
| **Gestión de Usuarios** | | | |
| - Crear usuarios | ✅ | ❌ | ❌ |
| - Editar usuarios | ✅ | ❌ | ❌ |
| - Eliminar usuarios | ✅ | ❌ | ❌ |
| - Ver usuarios | ✅ | ❌ | ❌ |
| | | | |
| **Barberos** | | | |
| - Ver todos los barberos | ✅ | ✅ | ✅ |
| - Ver perfil propio | ✅ | ✅ | ❌ |
| - Editar perfil propio | ✅ | ✅ | ❌ |
| - Editar cualquier barbero | ✅ | ❌ | ❌ |
| - Ver horarios | ✅ | ✅ | ✅ |
| - Gestionar horarios propios | ✅ | ✅ | ❌ |
| | | | |
| **Servicios** | | | |
| - Ver servicios | ✅ | ✅ | ✅ |
| - Crear servicios | ✅ | ❌ | ❌ |
| - Editar servicios | ✅ | ❌ | ❌ |
| - Eliminar servicios | ✅ | ❌ | ❌ |
| | | | |
| **Productos** | | | |
| - Ver productos | ✅ | ✅ | ✅ |
| - Crear productos | ✅ | ❌ | ❌ |
| - Editar productos | ✅ | ❌ | ❌ |
| - Actualizar stock | ✅ | ❌ | ❌ |
| - Ver movimientos stock | ✅ | ❌ | ❌ |
| | | | |
| **Gorras** | | | |
| - Ver galería | ✅ | ✅ | ✅ |
| - Agregar gorras | ✅ | ❌ | ❌ |
| - Editar gorras | ✅ | ❌ | ❌ |
| - Marcar como vendida | ✅ | ✅ | ❌ |
| | | | |
| **Citas** | | | |
| - Ver todas las citas | ✅ | ❌ | ✅ |
| - Ver citas propias | ✅ | ✅ | ❌ |
| - Crear citas | ✅ | ❌ | ✅ |
| - Editar citas | ✅ | ✅ | ✅ |
| - Cancelar citas | ✅ | ✅ | ✅ |
| | | | |
| **Cola Inteligente** | | | |
| - Ver cola propia | ✅ | ✅ | ❌ |
| - Ver todas las colas | ✅ | ❌ | ✅ |
| - Agregar turnos | ✅ | ✅ | ✅ |
| - Cambiar estado turnos propios | ✅ | ✅ | ❌ |
| - Eliminar turnos | ✅ | ✅ | ✅ |
| | | | |
| **Ventas** | | | |
| - Ver todas las ventas | ✅ | ❌ | ❌ |
| - Ver ventas propias | ✅ | ✅ | ❌ |
| - Crear venta | ✅ | ✅ | ❌ |
| - Anular venta | ✅ | ❌ | ❌ |
| | | | |
| **Clientes** | | | |
| - Ver clientes | ✅ | ✅ | ✅ |
| - Ver historial cliente | ✅ | ✅ | ✅ |
| - Editar cliente | ✅ | ❌ | ✅ |
| | | | |
| **Reportes** | | | |
| - Reportes generales | ✅ | ❌ | ❌ |
| - Reportes propios | ✅ | ✅ | ❌ |

---

## Implementación JWT

### Estructura del Token

```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "sub": 1,                          // User ID
  "nombre": "Juan Pérez",
  "email": "juan@jpbarber.com",
  "rol": "barbero",
  "barbero_id": 1,                   // Solo si es barbero
  "iat": 1696168800,                 // Issued at
  "exp": 1696255200                  // Expires at (24h después)
}

// Signature
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret_key
)
```

---

### Implementación Backend (Node.js/Express)

#### 1. Instalación

```bash
npm install jsonwebtoken bcryptjs
```

#### 2. Variables de Entorno

`.env`:
```env
JWT_SECRET=tu_clave_secreta_super_segura_cambiar_en_produccion
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10
```

#### 3. Controlador de Autenticación

`controllers/authController.js`:

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Generar JWT Token
const generateToken = (user) => {
  const payload = {
    sub: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  };
  
  // Si es barbero, agregar barbero_id
  if (user.rol === 'barbero' && user.barbero_id) {
    payload.barbero_id = user.barbero_id;
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }
    
    // Buscar usuario
    const [users] = await db.query(`
      SELECT u.*, b.id as barbero_id
      FROM usuarios u
      LEFT JOIN barberos b ON u.id = b.usuario_id
      WHERE u.email = ? AND u.activo = TRUE
    `, [email]);
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    const user = users[0];
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    // Actualizar último acceso
    await db.query(`
      UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?
    `, [user.id]);
    
    // Generar token
    const token = generateToken(user);
    
    // Responder (sin enviar password)
    delete user.password;
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          avatar: user.avatar,
          telefono: user.telefono,
          barbero_id: user.barbero_id
        },
        token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Logout (opcional - cliente elimina token)
exports.logout = async (req, res) => {
  // Si usas blacklist de tokens, agregar aquí
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
};

// Verificar sesión
exports.me = async (req, res) => {
  try {
    // El middleware ya validó y adjuntó user a req
    const [users] = await db.query(`
      SELECT u.id, u.nombre, u.email, u.rol, u.avatar, u.telefono, b.id as barbero_id
      FROM usuarios u
      LEFT JOIN barberos b ON u.id = b.usuario_id
      WHERE u.id = ? AND u.activo = TRUE
    `, [req.user.sub]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: users[0]
    });
    
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// Registrar usuario (solo admin)
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, rol, telefono } = req.body;
    
    // Validar que solo admin puede registrar
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para esta acción'
      });
    }
    
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    
    // Crear usuario
    const [result] = await db.query(`
      INSERT INTO usuarios (nombre, email, password, rol, telefono)
      VALUES (?, ?, ?, ?, ?)
    `, [nombre, email, hashedPassword, rol, telefono]);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        nombre,
        email,
        rol
      },
      message: 'Usuario creado exitosamente'
    });
    
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
    
    console.error('Error en register:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
```

---

### 4. Middleware de Autenticación

`middleware/auth.js`:

```javascript
const jwt = require('jsonwebtoken');

// Verificar JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token no proporcionado'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adjuntar usuario decodificado
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado'
      });
    }
    
    return res.status(403).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

// Verificar roles
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }
    
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para esta acción'
      });
    }
    
    next();
  };
};

// Verificar que es el mismo barbero o admin
const authorizeSelfOrAdmin = (req, res, next) => {
  const barberoId = parseInt(req.params.id);
  
  if (req.user.rol === 'admin') {
    return next();
  }
  
  if (req.user.rol === 'barbero' && req.user.barbero_id === barberoId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    error: 'No tienes permisos para esta acción'
  });
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeSelfOrAdmin
};
```

---

### 5. Rutas Protegidas

`routes/api.js`:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles, authorizeSelfOrAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const barberosController = require('../controllers/barberosController');
const ventasController = require('../controllers/ventasController');

// Rutas públicas (sin autenticación)
router.post('/auth/login', authController.login);

// Rutas autenticadas (requieren token)
router.use(authenticateToken); // Todas las rutas siguientes requieren autenticación

router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

// Rutas solo para admin
router.post('/auth/register', authorizeRoles('admin'), authController.register);
router.post('/servicios', authorizeRoles('admin'), serviciosController.create);
router.put('/productos/:id', authorizeRoles('admin'), productosController.update);

// Rutas para admin y barbero
router.get('/barberos/:id', authorizeSelfOrAdmin, barberosController.show);
router.get('/barberos/:id/estadisticas', authorizeSelfOrAdmin, barberosController.estadisticas);

// Rutas para todos los roles autenticados
router.get('/servicios', serviciosController.index);
router.get('/productos', productosController.index);
router.get('/gorras', gorrasController.index);

// Rutas específicas de barbero
router.get('/turnos/cola/:barbero_id', 
  authorizeRoles('barbero', 'admin'),
  authorizeSelfOrAdmin,
  turnosController.getCola
);

router.post('/ventas',
  authorizeRoles('barbero', 'admin'),
  ventasController.create
);

module.exports = router;
```

---

## Implementación Laravel

### 1. Instalación

```bash
composer require tymon/jwt-auth
```

### 2. Configuración

`config/auth.php`:
```php
'guards' => [
    'api' => [
        'driver' => 'jwt',
        'provider' => 'users',
    ],
],
```

### 3. Modelo User

`app/Models/User.php`:
```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    protected $table = 'usuarios';
    
    protected $fillable = [
        'nombre', 'email', 'password', 'rol', 'telefono', 'avatar'
    ];
    
    protected $hidden = ['password'];
    
    public function getJWTIdentifier() {
        return $this->getKey();
    }
    
    public function getJWTCustomClaims() {
        $claims = [
            'nombre' => $this->nombre,
            'email' => $this->email,
            'rol' => $this->rol,
        ];
        
        if ($this->rol === 'barbero' && $this->barbero) {
            $claims['barbero_id'] = $this->barbero->id;
        }
        
        return $claims;
    }
    
    public function barbero() {
        return $this->hasOne(Barbero::class, 'usuario_id');
    }
}
```

### 4. Controlador

`app/Http/Controllers/AuthController.php`:
```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request) {
        $credentials = $request->only('email', 'password');
        
        if (!$token = auth('api')->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'error' => 'Credenciales inválidas'
            ], 401);
        }
        
        $user = auth('api')->user();
        
        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'token' => $token,
                'expires_at' => now()->addDay()
            ]
        ]);
    }
    
    public function logout() {
        auth('api')->logout();
        
        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada'
        ]);
    }
    
    public function me() {
        return response()->json([
            'success' => true,
            'data' => auth('api')->user()
        ]);
    }
}
```

### 5. Middleware

`routes/api.php`:
```php
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    
    // Solo admin
    Route::middleware('role:admin')->group(function () {
        Route::post('/servicios', [ServiciosController::class, 'store']);
    });
    
    // Admin o barbero
    Route::middleware('role:admin,barbero')->group(function () {
        Route::get('/ventas', [VentasController::class, 'index']);
    });
});
```

`app/Http/Middleware/CheckRole.php`:
```php
<?php

namespace App\Http\Middleware;

use Closure;

class CheckRole
{
    public function handle($request, Closure $next, ...$roles)
    {
        if (!auth('api')->check()) {
            return response()->json([
                'success' => false,
                'error' => 'No autenticado'
            ], 401);
        }
        
        $userRole = auth('api')->user()->rol;
        
        if (!in_array($userRole, $roles)) {
            return response()->json([
                'success' => false,
                'error' => 'No tienes permisos'
            ], 403);
        }
        
        return $next($request);
    }
}
```

---

## Frontend (React/Astro)

### Guardar Token

```javascript
// Después del login exitoso
const handleLogin = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Guardar token
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    // Redirigir según rol
    if (data.data.user.rol === 'barbero') {
      window.location.href = '/panel-barbero';
    } else if (data.data.user.rol === 'admin') {
      window.location.href = '/admin/dashboard';
    }
  }
};
```

### Interceptor de Peticiones (Axios)

```javascript
import axios from 'axios';

// Configurar interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Manejar errores 401
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado - logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Seguridad

### Best Practices

1. **HTTPS:** Siempre usar HTTPS en producción
2. **Secret Key:** Usar clave secreta fuerte y única
3. **Expiración:** Tokens con tiempo de vida limitado (24h)
4. **Refresh Tokens:** Implementar si se requiere sesión larga
5. **Rate Limiting:** Limitar intentos de login
6. **Blacklist:** Lista de tokens revocados (opcional)
7. **CORS:** Configurar correctamente
8. **Password:** Requisitos mínimos (8 chars, mayúsculas, números)

### Protección contra ataques

```javascript
// Rate limiting (Express)
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de login. Intenta en 15 minutos.'
});

router.post('/auth/login', loginLimiter, authController.login);
```

---

**Última actualización:** 2025-10-01  
**Versión:** 1.0.0