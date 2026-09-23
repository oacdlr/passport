# Estado del proyecto

> Este archivo es el tablero del proyecto. Se actualiza al cerrar cada tanda de trabajo.
> Para entender *cómo* está construido, ver [`docs/DESARROLLO.md`](docs/DESARROLLO.md).

**Última actualización:** 23 de septiembre de 2026
**Rama:** `main` · **Repo:** https://github.com/oacdlr/passport

---

## Dónde estamos

Milestone 1 (**auth con roles + Biblioteca**) está escrito y pasa build, typecheck y lint.
Falta un paso para poder decir que funciona: **nada de la base de datos se ha ejecutado todavía**.

| | |
|---|---|
| Código de la app | ✅ Completo para el milestone 1 |
| Migraciones SQL | ⚠️ Escritas, **sin ejecutar** |
| Verificación end-to-end | ❌ Bloqueada por lo anterior |
| Desplegado | ❌ Todavía no |

---

## 🔴 Bloqueador actual

**Las migraciones de `supabase/` no se han aplicado contra ninguna base.**

Sin esto no se puede confirmar que los permisos funcionen, y los permisos son el punto
entero del milestone: la RLS es lo que hace que la privacidad sea real y no cosmética.

Dos caminos, cualquiera sirve:

- **Local (recomendado para probar sin arriesgar nada):** arrancar Docker Desktop y
  `npx supabase start`. Docker está instalado en la máquina pero el demonio estaba apagado.
- **Hosted:** crear el proyecto en supabase.com y seguir [`README.md`](README.md) § Puesta en marcha.

Una vez haya base, la lista de comprobaciones está en
[`docs/DESARROLLO.md`](docs/DESARROLLO.md) § Cómo verificar.

---

## Milestone 1 — Auth + roles + Biblioteca

### Base y diseño
- [x] Next.js 16 (App Router) + TypeScript + Tailwind v4
- [x] Tokens de color muestreados de `design/*.png` → `src/app/globals.css`
- [x] Tipografía Fraunces + Work Sans
- [x] Primitivas de UI (Button, Card, Badge, DotScale, Field, Slider, TagInput, ConfirmDialog)
- [x] Topbar con navegación, selector ES/EN y menú de usuario
- [x] Arreglar las rutas rotas de `CLAUDE.md` (spec → `docs/`, sketches del PDF → `design/`)

### Base de datos
- [x] `0001` roles, perfiles, triggers (perfil automático, anti-escalada de rol)
- [x] `0002` cafés, orígenes, índices, vista de listado
- [x] `0003` RLS de las tres tablas
- [x] `0004` bucket privado de fotos + policies
- [x] `0005` RPC transaccional de import
- [x] Seed con los seis cafés de los mockups
- [ ] **Ejecutar las migraciones** ← bloqueador
- [ ] Regenerar `src/types/database.ts` desde el esquema real (`npm run db:types`)

### Auth
- [x] Login por magic link, sólo invitación (`shouldCreateUser: false`)
- [x] Callback que cubre magic link (`code`) e invitación (`token_hash`)
- [x] Proxy: refresco de sesión + guard de rutas + locale
- [x] `requireUser` / `requireRole` en cada página protegida
- [x] Pantalla de admin: invitar y cambiar roles
- [ ] Documentar/ejecutar el bootstrap del primer admin (pasos en README, sin probar)

### Biblioteca
- [x] Listado con búsqueda y filtros en la URL
- [x] Ficha de café
- [x] Alta y edición (incl. orígenes múltiples y datos extra)
- [x] Borrado sólo admin, con confirmación
- [x] Subida de foto a bucket privado + signed URLs
- [x] Import CSV: subir → revisar → confirmar, con errores por fila
- [x] Import Excel (.xlsx), por el mismo camino que el CSV
- [x] Plantilla CSV descargable

### i18n
- [x] Rutas `/es` y `/en`
- [x] 152 claves en paridad ES/EN
- [x] Países vía `Intl.DisplayNames` (sin pasar por el traductor)
- [x] La preferencia de idioma se guarda en `profiles.locale`

### Verificación
- [x] `npm run typecheck` limpio
- [x] `npm run lint` limpio
- [x] `npm run build` compila; rutas autenticadas son dinámicas
- [x] **34 tests del import** (Vitest): reglas de negocio, países, encabezados, duplicados, y paridad CSV ↔ Excel
- [x] Smoke test de rutas: `/` → `/es`, ruta protegida → login, ambos idiomas renderizan
- [ ] **Matriz de RLS con tres cuentas reales** ← bloqueador
- [ ] Import CSV contra base real (17 de 20 filas, luego modo omitir → 0)
- [ ] Subida de foto y signed URL en el navegador
- [ ] Revisión en móvil a 390 px

---

## Milestone 2 — Degustación + Historial *(siguiente)*

- [ ] Tablas `tastings`, `tasting_shares` + RLS (privado por defecto, compartible)
- [ ] Bucket `tasting-photos` con policies de dueño/compartido
- [ ] Formulario guiado de 5 pasos con barra de progreso (ver `design/degustacion.png`)
- [ ] Rueda de sabores: tags + texto libre para aromas y sabores
- [ ] Sliders 1–5 de cuerpo, acidez y retrogusto + palabras opcionales
- [ ] Vincular la cata con un café de Biblioteca, o nombre libre
- [ ] Lectura de la foto de la bolsa con IA de visión (primer uso real de `src/lib/ai/`)
- [ ] Historial "Mías / Equipo (compartidas)" con búsqueda (ver `design/historial.png`)
- [ ] Detalle en lectura; editable si es propia
- [ ] Hueco ya reservado en la ficha de café para "tus degustaciones de este café"

## Milestone 3 — Traducción automática de contenido

- [ ] Tabla `content_translations` (cache con `source_hash`)
- [ ] Adaptador de Gemini en `src/lib/ai/providers/`
- [ ] Traducir Biblioteca y Academy bajo demanda, cacheando el resultado
- [ ] Marca visual discreta de "traducción automática"
- [ ] Decidir qué pasa si la traducción falla (¿corrección manual?)

## Milestone 4 — Drafts (copiloto)

- [ ] Decidir: ¿se guardan con historial? ¿privados o compartibles?
- [ ] Editor + panel lateral de chat (ver `design/drafts.png`)
- [ ] Copiloto en vivo con contexto de Biblioteca + degustaciones propias
- [ ] Streaming de respuesta

## Milestone 5 — Academy

- [ ] Decidir estructura (categorías/lecciones, ¿quizzes?)
- [ ] Tablas + RLS (admin/editor cargan, viewer consulta)
- [ ] Tarjetas por tipo: vídeo, artículo, diagrama (ver `design/academy.png`)
- [ ] Filtros por categoría

---

## Deuda técnica conocida

| Qué | Por qué importa | Dónde |
|---|---|---|
| `database.ts` escrito a mano | Puede desincronizarse del esquema real | Se arregla con `npm run db:types` en cuanto haya base enlazada |
| Tests sólo del import | El resto (guards, queries, acciones) se verifica a mano | `src/features/library/import/*.test.ts` es el patrón a seguir |
| Rol en cada request | `is_admin()` consulta `profiles` en cada policy | A esta escala da igual; si molesta, custom access token hook |
| Sin deploy | El equipo todavía no puede probarlo | Vercel + las mismas variables de `.env.example` |

---

## Decisiones cerradas

- **Login:** magic link + invitación de admin; signup público desactivado.
- **Editor vs. admin:** editor crea, edita e importa; **no borra** cafés. Sí puede quitar líneas de origen (eso es editar).
- **Escala cuerpo/acidez:** 1–5 compartida entre Biblioteca y Degustación.
- **i18n:** rutas `/es` y `/en` desde el milestone 1.

## Decisiones pendientes

- ¿Drafts se guardan con historial? ¿privados o compartibles como las degustaciones? *(bloquea el milestone 4)*
- Estructura de Academy: ¿categorías y lecciones? ¿quizzes o progreso? *(bloquea el milestone 5)*
- ¿Qué hacer cuando falla una traducción automática? *(bloquea el milestone 3)*
- Logo definitivo.
