# Pasaporte de Café

App web tipo "pasaporte de café" para un equipo de baristas (~50 usuarios, máx. ~10 concurrentes): catálogo de cafés, formulario de cata, copiloto de IA para guiones/pairings, y contenido educativo.

## Documentación

- @docs/REQUIREMENTS.md — spec completo (funcional + propuesta técnica). Leer antes de tomar decisiones de arquitectura.
- `design/` — capturas de las pantallas de referencia: `biblioteca.png`, `degustacion.png`, `historial.png`, `drafts.png`, `academy.png`.
- README.md — puesta en marcha, scripts y organización del código.

## Identidad visual

REQUIREMENTS.md deja logo y tipografía abiertos, así que los colores de abajo están muestreados directamente de `design/*.png` y viven como tokens en `src/app/globals.css`. Son la referencia: no inventes tonos nuevos.

| Token | Hex | Uso |
|---|---|---|
| `bosque` | `#1F3B2F` | Topbar, títulos, tags activos, sliders |
| `crema` | `#F5F1E6` | Fondo de página |
| `terracota` | `#C2694B` | Acción primaria, avatar |
| `oro` | `#C7A26B` | Nav activa, tarjetas de artículo |
| `salvia` | `#E6F0E8` | Badge single origin |
| `arena` | `#F1E4D1` | Badge mezcla |
| `borde` | `#E2D9C8` | Bordes y divisores |
| `tinta` / `tinta-suave` | `#1F1F1C` / `#65615A` | Texto principal / secundario |

Tipografía: Fraunces (títulos) + Work Sans (cuerpo). Sólo light mode.

## Stack (ya implementado)

- Frontend: Next.js 16 (App Router) + TypeScript + Tailwind v4. i18n con next-intl y rutas `/es` `/en`.
- Backend / DB / Auth / Storage: Supabase (Postgres + Auth + Storage para fotos).
- Permisos: Row Level Security en la base de datos, no solo en la UI. Ver `supabase/migrations/0003_rls.sql`.
- Deploy: Vercel. Desarrollo local con `.env.local`.
- IA: Claude (copiloto de Drafts con Haiku, lectura de fotos por visión) + Gemini (traducción automática). Proveedor y modelo SIEMPRE configurables por variable de entorno — nunca hardcodear, para poder cambiar de proveedor o pasar a un modelo local (Ollama) sin tocar lógica de negocio. El mapa tarea → proveedor/modelo está en `src/lib/ai/config.ts` y no define modelos por defecto.

## Reglas de producto no negociables

- Roles personalizados: **admin** (todo, incl. gestión de usuarios/roles), **editor** (crea/edita Biblioteca y Academy), **viewer** (solo lectura).
- **Degustaciones** y **Drafts**: privados por defecto para quien los crea; compartibles explícitamente con el equipo o con personas específicas.
- Bilingüe ES/EN: el contenido (Biblioteca, Academy) se escribe **una sola vez** y se traduce automáticamente (con cache, para no re-traducir en cada carga).
- Solo light mode. Paleta verde oscuro tipo specialty coffee shop + acentos cálidos (crema/terracota/dorado) — ver `design/`.
- **Degustación** (formulario guiado): foto de la bolsa (se guarda + se lee con IA de visión) → aromas (tags + texto libre) → sabores (tags + texto libre) → cuerpo/acidez/retrogusto (slider + palabras opcionales) → pairing.
- **Historial de degustaciones**: vista "Mis degustaciones" con búsqueda/filtro, más un toggle para ver las que el equipo compartió.
- **Drafts**: panel lateral tipo chat (copiloto en vivo, no un botón de "generar"), da sugerencias de pairing y corrige/mejora el estilo del texto.

## Orden del MVP

1. ~~Auth + roles~~ — hecho
2. ~~Biblioteca (CRUD + import CSV)~~ — hecho. Falta el import de Excel (.xlsx).
3. Degustación + Historial ← siguiente
4. Selector de idioma + traducción automática — el selector ya está; falta traducir el contenido del equipo (tabla `content_translations` + adaptador de Gemini).
5. Drafts (copiloto de IA)
6. Academy

## Entorno

- Variables requeridas en `.env.example` (nombres solamente). Los valores reales van en `.env.local`, nunca se commitean.

## Decisiones ya cerradas (2026-09-23)

- **Login**: magic link (email OTP) + invitación de un admin. El signup público queda desactivado en el dashboard de Supabase: eso es lo que hace real el "equipo cerrado".
- **Editor vs. Admin**: el editor crea, edita e **importa CSV**; **no borra** cafés. Borrar es sólo de admin. (Sí puede quitar líneas de origen de un café: eso es editar, no borrar.)
- **Escala cuerpo/acidez**: 1–5 compartida entre Biblioteca y Degustación — puntos en la tarjeta, slider en la cata.
- **i18n**: rutas `/es` y `/en` desde el primer milestone. La traducción automática del contenido llega en el milestone 4.

## Decisiones todavía abiertas

- ¿Drafts se guarda con historial? ¿privado o compartible como Degustaciones?
- Estructura de Academy (categorías/lecciones, ¿quizzes?).
- Manejo de errores de traducción automática (¿corrección manual?).
- Logo definitivo.

Si alguna de estas decisiones cambia el rumbo de lo que estás construyendo, pregúntale al usuario antes de asumir.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
