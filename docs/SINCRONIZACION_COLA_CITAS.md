# Sincronización Automática de Citas con Cola Inteligente

## Objetivo

Cuando un cliente agenda una cita, esta debe aparecer automáticamente en la cola inteligente del barbero 5 minutos antes de la hora programada, con prioridad alta.

---

## Flujo Completo

### 1. Cliente Agenda Cita
```
Cliente → Formulario de Agendamiento
  ↓
  Selecciona: Barbero, Servicio, Fecha, Hora
  ↓
POST /api/citas/agendar
  ↓
Cita guardada en BD con estado "pendiente"
```

### 2. Sistema de Cola Automático (Backend)

El backend debe implementar un **cron job** o **tarea programada** que:

**Frecuencia:** Cada 1 minuto

**Lógica:**
```sql
SELECT id, barbero_id, cliente_nombre, servicio_nombre, fecha_hora
FROM citas
WHERE estado IN ('pendiente', 'confirmada')
  AND fecha_hora BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 5 MINUTE)
  AND id NOT IN (SELECT cita_id FROM turnos_cola WHERE cita_id IS NOT NULL)
```

**Acción:** Por cada cita encontrada:

1. Crear registro en `turnos_cola`:
```sql
INSERT INTO turnos_cola (
  barbero_id,
  numero_turno,
  cliente_nombre,
  cliente_telefono,
  servicio_nombre,
  estado,
  prioridad,
  hora_registro,
  duracion_estimada,
  notas,
  cita_id
) VALUES (
  {cita.barbero_id},
  {siguiente_numero_turno},
  {cita.cliente_nombre},
  {cita.cliente_telefono},
  {cita.servicio_nombre},
  'espera',
  1, -- Prioridad ALTA para citas agendadas
  NOW(),
  {cita.duracion_estimada},
  'Cita agendada - Agregada automáticamente',
  {cita.id}
);
```

2. Actualizar estado de la cita:
```sql
UPDATE citas 
SET estado = 'en_cola'
WHERE id = {cita.id};
```

3. **Notificar al barbero** (opcional pero recomendado):
   - Enviar notificación push/WebSocket
   - Email/SMS al barbero
   - Actualización en tiempo real en panel

---

## Implementación en Backend

### Opción 1: Laravel (Recomendado)

**Archivo:** `app/Console/Commands/SincronizarCitasACola.php`

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Cita;
use App\Models\TurnoCola;
use Carbon\Carbon;

class SincronizarCitasACola extends Command
{
    protected $signature = 'citas:sincronizar-cola';
    protected $description = 'Agrega citas a la cola inteligente 5 minutos antes de su hora programada';

    public function handle()
    {
        $ahora = Carbon::now();
        $limite = $ahora->copy()->addMinutes(5);

        // Buscar citas próximas que no estén en la cola
        $citas = Cita::whereIn('estado', ['pendiente', 'confirmada'])
            ->whereBetween('fecha_hora', [$ahora, $limite])
            ->whereNotExists(function($query) {
                $query->select('id')
                    ->from('turnos_cola')
                    ->whereColumn('turnos_cola.cita_id', 'citas.id');
            })
            ->with(['barbero', 'servicio'])
            ->get();

        foreach ($citas as $cita) {
            try {
                // Obtener siguiente número de turno para el barbero
                $ultimoTurno = TurnoCola::where('barbero_id', $cita->barbero_id)
                    ->whereDate('hora_registro', $ahora)
                    ->max('numero_turno') ?? 0;

                // Crear turno en la cola
                TurnoCola::create([
                    'barbero_id' => $cita->barbero_id,
                    'numero_turno' => $ultimoTurno + 1,
                    'cliente_nombre' => $cita->cliente_nombre,
                    'cliente_telefono' => $cita->cliente_telefono,
                    'servicio_nombre' => $cita->servicio->nombre,
                    'estado' => 'espera',
                    'prioridad' => 1, // Alta prioridad
                    'hora_registro' => $ahora,
                    'duracion_estimada' => $cita->servicio->duracion_estimada,
                    'notas' => 'Cita agendada - Agregada automáticamente',
                    'cita_id' => $cita->id
                ]);

                // Actualizar estado de la cita
                $cita->update(['estado' => 'en_cola']);

                // Notificar al barbero (opcional)
                // event(new CitaAgregadaACola($cita));

                $this->info("Cita #{$cita->id} agregada a la cola del barbero #{$cita->barbero_id}");
                
            } catch (\Exception $e) {
                $this->error("Error procesando cita #{$cita->id}: " . $e->getMessage());
                \Log::error("Error sincronizando cita a cola", [
                    'cita_id' => $cita->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("Proceso completado. {$citas->count()} cita(s) procesada(s).");
        return 0;
    }
}
```

**Registrar comando en Kernel:**

`app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule)
{
    // Ejecutar cada minuto
    $schedule->command('citas:sincronizar-cola')
        ->everyMinute()
        ->withoutOverlapping()
        ->runInBackground();
}
```

**Iniciar el scheduler:**

```bash
# En producción, agregar a crontab:
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1

# En desarrollo:
php artisan schedule:work
```

---

### Opción 2: Node.js/Express

**Archivo:** `services/citasSyncService.js`

```javascript
const cron = require('node-cron');
const db = require('../config/database');

// Ejecutar cada minuto
cron.schedule('* * * * *', async () => {
  console.log('Sincronizando citas a cola...');
  
  try {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + 5 * 60000); // +5 minutos

    // Buscar citas próximas
    const citas = await db.query(`
      SELECT c.*, s.nombre as servicio_nombre, s.duracion_estimada
      FROM citas c
      JOIN servicios s ON c.servicio_id = s.id
      WHERE c.estado IN ('pendiente', 'confirmada')
        AND c.fecha_hora BETWEEN ? AND ?
        AND c.id NOT IN (
          SELECT cita_id FROM turnos_cola 
          WHERE cita_id IS NOT NULL
        )
    `, [ahora, limite]);

    for (const cita of citas) {
      // Obtener siguiente número de turno
      const [ultimoTurno] = await db.query(`
        SELECT COALESCE(MAX(numero_turno), 0) as ultimo
        FROM turnos_cola
        WHERE barbero_id = ?
          AND DATE(hora_registro) = CURDATE()
      `, [cita.barbero_id]);

      const numeroTurno = ultimoTurno.ultimo + 1;

      // Insertar en cola
      await db.query(`
        INSERT INTO turnos_cola (
          barbero_id, numero_turno, cliente_nombre, cliente_telefono,
          servicio_nombre, estado, prioridad, hora_registro,
          duracion_estimada, notas, cita_id
        ) VALUES (?, ?, ?, ?, ?, 'espera', 1, NOW(), ?, ?, ?)
      `, [
        cita.barbero_id,
        numeroTurno,
        cita.cliente_nombre,
        cita.cliente_telefono,
        cita.servicio_nombre,
        cita.duracion_estimada,
        'Cita agendada - Agregada automáticamente',
        cita.id
      ]);

      // Actualizar estado de cita
      await db.query(`
        UPDATE citas SET estado = 'en_cola' WHERE id = ?
      `, [cita.id]);

      console.log(`Cita #${cita.id} agregada a cola del barbero #${cita.barbero_id}`);
    }

    console.log(`Proceso completado. ${citas.length} cita(s) procesada(s).`);
    
  } catch (error) {
    console.error('Error sincronizando citas:', error);
  }
});

module.exports = {};
```

---

## Estados de la Cita

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Cita recién creada, esperando confirmación |
| `confirmada` | Cita confirmada por el barbero o sistema |
| `en_cola` | Cita agregada automáticamente a la cola |
| `en_proceso` | Cliente siendo atendido |
| `completada` | Servicio terminado y pagado |
| `cancelada` | Cita cancelada |
| `no_asistio` | Cliente no se presentó |

---

## Prioridad en la Cola

| Tipo | Prioridad | Descripción |
|------|-----------|-------------|
| Cita Agendada | 1 (Alta) | Cliente que agendó con anticipación |
| Walk-in | 2 (Media) | Cliente que llega sin cita |

**Orden de atención:**
1. Primero se atienden prioridad 1 (citas)
2. Dentro de cada prioridad, por orden de llegada (hora_registro)

---

## Notificaciones (Opcional pero Recomendado)

### Al Barbero:
- 📱 Push notification: "Nueva cita en tu cola: [Cliente] - [Servicio]"
- 📧 Email (si cita es del día siguiente)
- 🔔 Notificación en panel en tiempo real

### Al Cliente:
- 📱 SMS/WhatsApp: "Tu cita está próxima. Por favor dirígete a JP Barber"
- 📧 Email recordatorio (1 hora antes)

---

## API para Frontend

### Endpoint para verificar si cita está en cola

```
GET /api/citas/{id}/estado-cola
```

**Respuesta:**
```json
{
  "cita_id": 123,
  "esta_en_cola": true,
  "turno": {
    "id": 45,
    "numero_turno": 3,
    "estado": "espera",
    "posicion_en_cola": 1,
    "tiempo_estimado_minutos": 15
  }
}
```

---

## Testing

### Pruebas Manuales:

1. **Crear cita para dentro de 3 minutos:**
   ```sql
   INSERT INTO citas (
     barbero_id, cliente_nombre, cliente_telefono,
     servicio_id, fecha_hora, estado
   ) VALUES (
     1, 'Test Cliente', '3001234567',
     1, DATE_ADD(NOW(), INTERVAL 3 MINUTE), 'confirmada'
   );
   ```

2. **Esperar 3 minutos**

3. **Verificar que apareció en turnos_cola:**
   ```sql
   SELECT * FROM turnos_cola WHERE cita_id = {id_cita_creada};
   ```

4. **Verificar estado de la cita:**
   ```sql
   SELECT estado FROM citas WHERE id = {id_cita_creada};
   -- Debe mostrar 'en_cola'
   ```

5. **Ver en panel del barbero:**
   - Abrir panel del barbero
   - Ir a "Cola Inteligente"
   - Verificar que aparece con ⭐ (prioridad alta)

---

## Manejo de Errores

### Si la cita ya pasó:
- No agregar a cola
- Marcar como `no_asistio` después de 15 minutos de la hora programada

### Si hay conflicto de horarios:
- Notificar al barbero
- Cliente más reciente espera su turno en cola

### Si el barbero no está disponible:
- Mantener en cola
- Notificar administrador

---

## Logs Recomendados

```
[2025-10-01 10:25:00] Iniciando sincronización de citas a cola
[2025-10-01 10:25:01] Encontradas 3 citas próximas
[2025-10-01 10:25:02] Cita #456 agregada a cola - Barbero: Juan
[2025-10-01 10:25:02] Cita #457 agregada a cola - Barbero: Pedro
[2025-10-01 10:25:03] Cita #458 agregada a cola - Barbero: Juan
[2025-10-01 10:25:03] Sincronización completada - 3 citas procesadas
```

---

## Consideraciones de Performance

- El cron job debe ser rápido (< 5 segundos)
- Usar índices en tablas:
  ```sql
  CREATE INDEX idx_citas_sync ON citas(estado, fecha_hora);
  CREATE INDEX idx_cola_cita ON turnos_cola(cita_id);
  ```
- Usar transacciones para evitar duplicados
- Implementar lock para evitar ejecuciones concurrentes

---

## Checklist de Implementación

- [ ] Crear comando/servicio de sincronización
- [ ] Configurar cron job (cada 1 minuto)
- [ ] Agregar índices a base de datos
- [ ] Implementar logging
- [ ] Probar con citas de prueba
- [ ] Implementar notificaciones (opcional)
- [ ] Monitorear en producción
- [ ] Documentar para equipo

---

**Última actualización:** 2025-10-01  
**Autor:** Equipo de Desarrollo JP Barber