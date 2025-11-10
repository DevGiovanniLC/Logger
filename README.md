# @giodev/logger
<img width="605" height="177" alt="image" src="https://github.com/user-attachments/assets/d33cef0d-51e2-491b-aa17-5d5d848cdea8" />
<img width="604" height="185" alt="image" src="https://github.com/user-attachments/assets/33be268f-ecdc-492a-8fca-06998b1115e6" />

## English

### Overview
`@giodev/logger` is a logging toolkit written in TypeScript that honors the RFC 5424 severity levels and prioritizes composability. It offers contextual logging, interchangeable transports/formatters, synchronous and reactive dispatch strategies, plus optional metrics.

### Features
- RFC 5424 levels (`Emergency` through `Debug`) with typed helpers.
- Contextual API (`Logger.for(ctx)`) and an `AppLogger` singleton for fast initialization.
- Available dispatchers: `SyncDispatcher` (deterministic emission) and `ReactiveDispatcher` (async batching with auto-shutdown on inactivity).
- Included transports: console with level routing and memory with a bounded buffer; both configurable via `TransportResolver`.
- `DefaultFormatter` with emoji/ASCII headers, ANSI colors, and localized timestamps.
- Metrics (`built`, `dispatched`, `filtered`, `transportErrors`) with a live callback.
- Utilities to normalize messages, build and throw errors, and style text.

### Repository Structure
- `packages/logger`: source code, tests, and package build.
- Root scripts: `build`, `pack`, `start`, `test`, `clean`, `update`.

### Installation & Scripts
```bash
npm install
npm run build    # Builds @giodev/logger with tsup
npm run pack     # Builds + packs the library
npm run test     # Runs Vitest under packages/logger
```

### Usage Example
```ts
import { Logger, Level } from '@giodev/logger'
import { MemoryTransport } from '@giodev/logger/Transport'

const memory = new MemoryTransport({ maxBufferSize: 200 })
const logger = new Logger({
  minLevel: Level.Debug,
  transports: [memory, 'console'],
  dispatcher: 'reactive',
  metrics: { enabled: true, onUpdate: console.log },
})

const authLogger = logger.for('AuthService')
authLogger.info('Started')
authLogger.critical(Error, 'Boom') // throws the error
```

### AppLogger Singleton
```ts
import { AppLogger } from '@giodev/logger'

AppLogger.init({ transports: ['console'], metrics: { enabled: true } })
AppLogger.warn('Warming up cache')
console.log(AppLogger.metrics)
```

### Dispatchers & Transports
| Dispatcher | When to use it | Highlights |
|------------|----------------|------------|
| `sync` | CLIs or services that need strict ordering | Immediate emission, no buffering |
| `reactive` | Web apps or high-throughput services | MessageChannel/timer scheduling, batching, auto-dispose on inactivity, `drain()` |

Transports:
- `ConsoleTransport`: uses the console channel by level and honors formatter settings.
- `MemoryTransport`: stores formatted strings, supports limits, and exposes `logs`, `snapshot()`, and `clear()`.

Extending transports means inheriting from `LogTransport` and defining `performEmit`.

### Formatting
`DefaultFormatter` options:
- `withEmojis`: switch between emoji and ASCII.
- `color`: enable ANSI colors.
- `localeDate`: set the timestamp locale.

You can inject custom formatters via `TransportParams`.

### Metrics & Observability
Enable with `metrics: { enabled: true, onUpdate?: (snapshot) => void }`. Counters:
- `built`: logs constructed.
- `dispatched`: emitted after passing the filter.
- `filtered`: discarded because of `minLevel`.
- `transportErrors`: failures while emitting through transports.

### Testing & Quality
- `npm run test` runs Vitest (`packages/logger/tests/logger.spec.ts`).
- `ReactiveDispatcher` exposes `drain()` to ensure deterministic results.
- Add new tests under `packages/logger/tests`.

### Build & Publication
- `npm run build`: creates CJS/ESM/d.ts bundles in `dist` with tsup.
- `npm run pack`: generates `giodev-logger-1.0.0.tgz`.

### Roadmap
- Implement `HttpTransport`.
- Expand test coverage (transports, dispatchers, formats).
- Review full RFC 5424 compliance (structured data, facility codes).

---

## Español

### Descripcion General
`@giodev/logger` es un toolkit de logging escrito en TypeScript que respeta los niveles de severidad del RFC 5424 y prioriza la componibilidad. Ofrece logging contextual, transportes/formatters intercambiables, estrategias de dispatch sincronicas y reactivas, ademas de metricas opcionales.

### Caracteristicas
- Niveles RFC 5424 (`Emergency` a `Debug`) con helpers tipados.
- API contextual (`Logger.for(ctx)`) y un singleton `AppLogger` para inicializaciones rapidas.
- Dispatchers disponibles: `SyncDispatcher` (emision deterministica) y `ReactiveDispatcher` (batch asincrono con auto-apagado por inactividad).
- Transportes incluidos: consola con ruteo por nivel y memoria con buffer limitado; ambos configurables via `TransportResolver`.
- `DefaultFormatter` con headers emoji/ASCII, colores ANSI y timestamps localizados.
- Metricas (`built`, `dispatched`, `filtered`, `transportErrors`) con callback en vivo.
- Utilidades para normalizar mensajes, construir y lanzar errores y estilizar texto.

### Estructura del Repositorio
- `packages/logger`: codigo fuente, pruebas y build del paquete.
- Scripts raiz: `build`, `pack`, `start`, `test`, `clean`, `update`.

### Instalacion y Scripts
```bash
npm install
npm run build    # Compila @giodev/logger con tsup
npm run pack     # Compila + empaqueta
npm run test     # Ejecuta Vitest en packages/logger
```

### Ejemplo de Uso
```ts
import { Logger, Level } from '@giodev/logger'
import { MemoryTransport } from '@giodev/logger/Transport'

const memoria = new MemoryTransport({ maxBufferSize: 200 })
const logger = new Logger({
  minLevel: Level.Debug,
  transports: [memoria, 'console'],
  dispatcher: 'reactive',
  metrics: { enabled: true, onUpdate: console.log },
})

const authLogger = logger.for('AuthService')
authLogger.info('Iniciado')
authLogger.critical(Error, 'Boom') // lanza el error
```

### Singleton AppLogger
```ts
import { AppLogger } from '@giodev/logger'

AppLogger.init({ transports: ['console'], metrics: { enabled: true } })
AppLogger.warn('Calentando caché')
console.log(AppLogger.metrics)
```

### Dispatchers y Transportes
| Dispatcher | Cuando usarlo | Destacados |
|------------|----------------|------------|
| `sync` | CLIs o servicios que necesitan orden estricto | Emision inmediata, sin buffering |
| `reactive` | Apps web o servicios de alto throughput | Programacion con MessageChannel/timers, batching, auto-dispose por inactividad, `drain()` |

Transportes:
- `ConsoleTransport`: usa el canal de consola segun el nivel y respeta la configuracion del formatter.
- `MemoryTransport`: almacena strings formateadas, admite limite y expone `logs`, `snapshot()` y `clear()`.

Extender transportes implica heredar de `LogTransport` y definir `performEmit`.

### Formateo
Opciones de `DefaultFormatter`:
- `withEmojis`: alterna entre emoji y ASCII.
- `color`: habilita colores ANSI.
- `localeDate`: define la localizacion del timestamp.

Puedes inyectar formatters propios mediante `TransportParams`.

### Metricas y Observabilidad
Activa con `metrics: { enabled: true, onUpdate?: (snapshot) => void }`. Contadores:
- `built`: logs construidos.
- `dispatched`: emitidos tras pasar el filtro.
- `filtered`: descartados por `minLevel`.
- `transportErrors`: fallos al emitir en transportes.

### Pruebas y Calidad
- `npm run test` corre Vitest (`packages/logger/tests/logger.spec.ts`).
- `ReactiveDispatcher` expone `drain()` para asegurar resultados deterministas.
- Agrega nuevas pruebas bajo `packages/logger/tests`.

### Build y Publicación
- `npm run build`: crea bundles CJS/ESM/d.ts en `dist` con tsup.
- `npm run pack`: genera `giodev-logger-1.0.0.tgz`.

### Hoja de Ruta
- Implementar `HttpTransport`.
- Expandir cobertura de pruebas (transportes, dispatchers, formatos).
- Revisar cumplimiento completo de RFC 5424 (structured data, facility codes).
