# 🧠 Sistema de Cola Inteligente - JP Barber

## 📋 Descripción General

Sistema automático de gestión de turnos que integra las citas agendadas con la cola de espera del barbero. El sistema monitorea continuamente las citas programadas y automáticamente agrega a los clientes a la cola de espera en el momento adecuado.

## ✨ Características Principales

### 1. **Monitoreo Automático de Citas**
- Actualización en tiempo real cada 10 segundos
- Detección automática de citas próximas
- Sincronización entre citas agendadas y cola de espera

### 2. **Sistema de Tres Niveles**

#### 📅 Próximas Citas (30 minutos)
- Muestra citas que llegarán entre 5 y 30 minutos
- Indicador visual del tiempo restante con código de colores:
  - 🟢 Verde: Más de 20 minutos
  - 🟡 Amarillo: Entre 10-20 minutos
  - 🔴 Rojo: Menos de 10 minutos
- Opción de agregar manualmente a la cola antes de tiempo

#### 🔔 Entrada Automática a Cola (5 minutos)
- Citas se agregan automáticamente cuando faltan 5 minutos
- Notificación visual y sonora al barbero
- Prioridad alta automática para citas agendadas

#### 👥 Gestión de Walk-ins
- Agregar clientes sin cita previa
- Prioridad media (después de citas agendadas)
- Campos opcionales: teléfono, servicio

### 3. **Estados de la Cola**
1. **En Espera** 🟡 - Cliente esperando su turno
2. **Llamado** 🔵 - Cliente ha sido llamado
3. **En Silla** 🟣 - Servicio en progreso
4. **Finalizando** 🟢 - Listo para cobrar

### 4. **Sistema de Notificaciones**

#### Notificaciones Visuales
- Panel flotante en esquina superior derecha
- Animaciones suaves de entrada
- Código de colores por tipo de alerta

#### Notificaciones Sonoras
- Alertas audibles para citas urgentes
- Control de activar/silenciar sonido
- Sonido personalizado no intrusivo

#### Notificaciones del Navegador
- Permiso configurable del usuario
- Alertas incluso con pestaña en segundo plano
- Información detallada de cada cita

## 🎯 Flujo de Trabajo

```
1. Cliente agenda cita → Sistema la registra

2. 30 minutos antes → Aparece en "Próximas Citas"
                    → Notificación visual

3. 10 minutos antes → Cambio de color a urgente (amarillo/rojo)
                    → Notificación sonora

4. 5 minutos antes  → Ingreso automático a cola
                    → Notificación sonora + visual
                    → Prioridad alta

5. Barbero gestiona → Llamar → En Silla → Finalizar → Cobrar
```

## 📊 Estadísticas en Tiempo Real

El panel muestra:
- **Próximas**: Citas que entrarán en los próximos 30 min
- **En Cola**: Total de clientes en cola
- **Esperando**: Clientes en estado de espera
- **Llamados**: Clientes que han sido llamados
- **En Silla**: Clientes siendo atendidos
- **Finalizando**: Listos para pago

## 🔧 Componentes del Sistema

### `ColaInteligenteMejorada.tsx`
Componente principal que gestiona:
- Carga de cola y próximas citas
- Detección automática de tiempos
- Agregado automático a cola
- Gestión de estados de turnos

### `NotificacionesCitas.tsx`
Sistema de notificaciones que incluye:
- Notificaciones visuales flotantes
- Alertas sonoras configurables
- Integración con API de Notifications del navegador
- Control de preferencias del usuario

### `PanelBarbero.tsx`
Panel principal integrado con:
- Navegación entre secciones
- Gestión de sesión
- Componente de cola inteligente

## 🎨 Diseño Visual

### Colores de Estado
- **Naranja**: Próximas citas (alerta temprana)
- **Amarillo**: En espera
- **Azul**: Llamado
- **Púrpura**: En silla
- **Verde**: Finalizando

### Prioridades
- **Citas Agendadas**: Fondo amarillo, insignia "⭐ Cita Agendada"
- **Walk-ins**: Fondo gris estándar

## 🚀 Uso

### Para el Barbero

1. **Monitorear Próximas Citas**
   - Revisar el panel naranja de "Próximas Citas"
   - Ver tiempo restante en tiempo real
   - Opción de agregar manualmente si el cliente llega antes

2. **Gestionar Cola Automática**
   - Los clientes con citas entran automáticamente a los 5 minutos
   - Gestionar walk-ins con el botón "Agregar Walk-in"
   - Mover clientes entre estados según el progreso

3. **Responder a Notificaciones**
   - Prestar atención a alertas visuales y sonoras
   - Configurar preferencias de sonido según necesidad
   - Aceptar permisos de notificaciones del navegador

## ⚙️ Configuración

### Tiempos de Alerta (Modificables en el código)
```typescript
// Próximas citas: entre 5 y 30 minutos
esCitaProxima: tiempoRestante > 5 && tiempoRestante <= 30

// Entrada automática a cola: 5 minutos antes
debeAgregarseACola: tiempoRestante <= 5 && tiempoRestante >= -5
```

### Intervalo de Actualización
```typescript
// Actualización cada 10 segundos
const interval = setInterval(cargarDatos, 10000);
```

## 🔐 Seguridad

- Autenticación requerida con token Bearer
- Verificación de permisos de barbero
- Asociación de turnos con barbero específico
- Cookies seguras con SameSite

## 📱 Responsive

- Diseño optimizado para móvil y desktop
- Navegación adaptativa
- Botones y textos escalables
- Grid responsivo de estadísticas

## 🐛 Solución de Problemas

### Las citas no se agregan automáticamente
1. Verificar conexión con backend
2. Revisar que las citas tengan estado 'pendiente' o 'confirmada'
3. Comprobar que la hora de la cita esté correctamente configurada

### No se reproducen las notificaciones sonoras
1. Verificar que el sonido esté habilitado (botón 🔊/🔇)
2. Revisar permisos de audio del navegador
3. Aumentar volumen del sistema

### Notificaciones del navegador no aparecen
1. Otorgar permisos cuando se soliciten
2. Verificar configuración de notificaciones del navegador
3. Comprobar que el sitio no esté en modo "No molestar"

## 🔄 Mejoras Futuras

- [ ] Integración con WebSocket para actualizaciones en tiempo real
- [ ] Estimación de tiempo de espera por cliente
- [ ] Notificaciones SMS para clientes
- [ ] Dashboard de métricas de eficiencia
- [ ] Historial de tiempos promedio por servicio
- [ ] Integración con calendario del barbero

## 📞 Soporte

Para reportar problemas o sugerencias:
- Crear un issue en el repositorio
- Contactar al equipo de desarrollo
- Revisar la documentación del API

---

**Desarrollado para JP Barber** ✂️
*Sistema de gestión inteligente de turnos y citas*
