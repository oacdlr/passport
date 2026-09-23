# Pasaporte de Café

App web del equipo de baristas: catálogo de cafés (Biblioteca), degustaciones, copiloto de IA para guiones y contenido educativo. Bilingüe ES/EN, pensada para usarse desde el celular en medio de una cata.

| | |
|---|---|
| 📋 **Qué falta y dónde vamos** | [`TODO.md`](TODO.md) |
| 🛠️ **Cómo está construido** | [`docs/DESARROLLO.md`](docs/DESARROLLO.md) |
| 📄 Spec de producto | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) |
| 🎨 Pantallas de referencia | [`design/`](design/) |

## Estado

**Milestone 1 — Auth + roles + Biblioteca.** Lo que ya está:

- Login por magic link, sólo por invitación (equipo cerrado).
- Roles **admin / editor / viewer** con Row Level Security en Postgres.
- Biblioteca: listado con búsqueda y filtros, ficha, alta, edición, borrado e import CSV.
- Gestión de usuarios para admin.
- Rutas `/es` y `/en` con la interfaz traducida.

Degustación, Historial, Drafts y Academy son milestones posteriores: las pantallas existen como marcador para que la navegación no rompa.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Storage) · next-intl · Zod.

## Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Proyecto de Supabase

Crea un proyecto en [supabase.com](https://supabase.com) (el plan gratuito sobra para ~50 usuarios) y enlázalo:

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npm run db:push        # aplica supabase/migrations/0001..0005
```

En el dashboard, **Authentication → Providers → Email**: desactiva *Allow new users to sign up*. Eso es lo que convierte el equipo en cerrado — a partir de ahí sólo se entra por invitación.

En **Authentication → URL Configuration**, añade `http://localhost:3000/auth/callback` a las *Redirect URLs*.

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena `.env.local` (los nombres están en `.env.example`; los valores de Supabase salen de *Project Settings → API*).

Para la parte de IA — que todavía no se llama desde ningún sitio, pero cuya configuración ya está en su sitio — los valores sugeridos son:

| Variable | Sugerido | Por qué |
|---|---|---|
| `AI_COPILOT_PROVIDER` / `AI_COPILOT_MODEL` | `anthropic` / `claude-haiku-4-5` | Copiloto de Drafts: conversacional y frecuente, Haiku equilibra costo y latencia. |
| `AI_VISION_PROVIDER` / `AI_VISION_MODEL` | `anthropic` / `claude-haiku-4-5` | Leer la foto de la bolsa. Haiku 4.5 tiene visión. |
| `AI_TRANSLATION_PROVIDER` / `AI_TRANSLATION_MODEL` | `google` / un modelo Gemini Flash | Traducción en volumen de Biblioteca y Academy. |

No hay modelos por defecto en el código a propósito: `src/lib/ai/config.ts` los lee siempre del entorno, para poder cambiar de proveedor —o pasar a Ollama en local— sin tocar lógica de negocio.

### 4. Primer admin

El primer usuario no puede invitarse a sí mismo. Créalo a mano una sola vez:

1. En el dashboard, **Authentication → Users → Add user → Send invitation** con tu correo.
2. Abre el enlace del correo para entrar y que el trigger cree tu perfil.
3. En **SQL Editor**, promuévete:

```sql
update public.profiles set role = 'admin' where email = 'tu@correo.com';
```

A partir de ahí el resto del equipo entra desde `/es/admin/usuarios`.

### 5. Datos de ejemplo (opcional)

`supabase/seed.sql` carga los seis cafés que aparecen en los mockups. Pégalo en el SQL Editor, o deja que el CLI lo aplique con `supabase db reset` (esto borra la base: sólo en desarrollo).

### 6. Arrancar

```bash
npm run dev     # http://localhost:3000 -> redirige a /es/biblioteca
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Build de producción. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint. |
| `npm run db:push` | Aplica las migraciones al proyecto enlazado. |
| `npm run db:types` | Regenera `src/types/database.ts` desde el esquema real. |

## Cómo está organizado

```
supabase/migrations/   Esquema, RLS, storage y la RPC de import. Fuente de verdad de los permisos.
src/app/[locale]/      Rutas. (auth) es público; (app) exige sesión.
src/features/          Queries y Server Actions por dominio (auth, library).
src/components/        ui/ primitivas · layout/ navegación · library/ pantallas de Biblioteca.
src/lib/               supabase/ clientes · i18n/ · ai/ · countries.ts · utils.ts
src/messages/          Textos de interfaz ES/EN.
```

Dos decisiones que conviene conocer antes de tocar nada:

- **Los permisos viven en la base de datos.** `supabase/migrations/0003_rls.sql` es lo que realmente decide quién puede qué. Los helpers de `src/features/auth/guards.ts` (`requireRole`, `canEditLibrary`) sólo evitan enseñar botones que van a fallar. Si añades una tabla, escribe su RLS en la misma migración.
- **Los países se guardan en ISO 3166-1 alpha-2**, no por nombre. `Intl.DisplayNames` los traduce a ES/EN gratis, sin pasar por el traductor automático.

## Import CSV

Desde `/es/biblioteca/importar`, en tres pasos: subir → revisar → confirmar. El preview marca fila por fila qué falla y por qué, sin bloquear el resto del lote, y deja elegir si los cafés que ya existen se omiten o se actualizan.

Hay una plantilla descargable en esa misma pantalla. Columnas (también se aceptan los nombres en inglés):

```
nombre, tipo, paises, regiones, productores, fincas, altitudes,
tueste, proceso, cuerpo, acidez, historia, notas_cata,
sabores_complementarios, extra
```

- `tipo`: `single origin` / `mezcla`.
- `paises`, `regiones`, `productores`, `fincas`, `altitudes`: separados por `|` y alineados por posición, para las mezclas.
- `notas_cata`, `sabores_complementarios`: separados por `|`.
- `cuerpo`, `acidez`: 1–5, la misma escala que usará Degustación.
- `extra`: JSON o `clave: valor; otra: cosa`. Cualquier columna que no reconozcamos también acaba aquí, en vez de perderse.

El lote entra en una transacción (`import_coffees`): si una fila falla en la base, no quedan cafés a medias.
