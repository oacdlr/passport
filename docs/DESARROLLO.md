# Guía de desarrollo

Cómo está construido el Pasaporte de Café y qué conviene saber antes de tocarlo.

- Para **arrancar el proyecto** → [`README.md`](../README.md)
- Para **saber qué falta** → [`TODO.md`](../TODO.md)
- Para el **spec de producto** → [`REQUIREMENTS.md`](REQUIREMENTS.md)

---

## Las tres ideas que explican el resto

### 1. Los permisos viven en la base de datos, no en la interfaz

Es el requisito no negociable del spec: *"implementar permisos a nivel de fila, no solo en
la capa de UI, para que la privacidad sea real y no solo cosmética"*.

Quien decide de verdad quién puede qué es
[`supabase/migrations/0003_rls.sql`](../supabase/migrations/0003_rls.sql). Los helpers de
`src/features/auth/guards.ts` (`requireRole`, `canEditLibrary`, `canDeleteLibrary`) **no son
la barrera** — sólo evitan enseñar botones que van a fallar.

Consecuencia práctica: si añades una tabla, su RLS se escribe en la misma migración. Una
tabla con `enable row level security` y sin policies queda inaccesible para todos, que es el
fallo seguro correcto.

```
Petición → proxy (¿hay sesión?) → página (requireRole: ¿enseño esto?) → Postgres (RLS: ¿lo permito?)
                                                                          ↑ la única que manda
```

### 2. Todo lo que ve el usuario pasa por el cliente con su sesión

`src/lib/supabase/` tiene tres clientes y elegir mal es el error caro:

| Cliente | Cuándo | RLS |
|---|---|---|
| `server.ts` → `createClient()` | **Por defecto.** Server Components y Server Actions | ✅ Sí |
| `client.ts` → `createClient()` | Componentes cliente | ✅ Sí |
| `admin.ts` → `createAdminClient()` | **Sólo** invitar usuarios (`auth.admin.*`) | ❌ **La salta entera** |

El cliente admin usa el service role key. Hoy se usa en un solo sitio
(`inviteUser`, que necesita privilegios de administración de Auth) y cada llamada va
precedida de `requireRole("admin")`. Si te ves usándolo para otra cosa, casi seguro que lo
que quieres es `server.ts`.

Detalle que no es obvio: **cambiar el rol de un usuario usa el cliente normal, no el admin.**
El trigger `prevent_role_escalation` necesita ver `auth.uid()` para saber quién lo pide; con
el service role key no hay sesión que mirar.

### 3. El idioma no es sólo traducir cadenas

- La interfaz vive en `src/messages/{es,en}.json`. **Las dos deben tener las mismas claves.**
- Los **países se guardan en ISO 3166-1 alpha-2** (`CO`, `ET`), nunca por nombre.
  `Intl.DisplayNames` los muestra traducidos gratis — sin LLM, sin cache, sin tabla que mantener.
  Esa decisión está en `src/lib/countries.ts` y vale la pena preservarla.
- El contenido que escribe el equipo (historias de café, Academy) **todavía no se traduce**:
  eso es el milestone 3. La columna `coffees.source_locale` ya está puesta esperándolo.

---

## Mapa del código

```
supabase/migrations/   Esquema, RLS, storage y RPC. Fuente de verdad de los permisos.
supabase/seed.sql      Los seis cafés de los mockups.

src/proxy.ts           Sesión + locale + guard de rutas. (Next 16: se llama proxy, no middleware.)

src/app/[locale]/
  (auth)/              Público: login, revisa-tu-correo
  (app)/               Exige sesión: layout con requireUser() + TopNav
src/app/auth/callback/ Fuera de [locale]: la URL la construye Supabase, no el router

src/features/          Lógica por dominio. Se reutiliza entre pantallas.
  auth/      guards.ts (quién eres) · actions.ts (login, invitar, cambiar rol)
  library/   queries.ts (lecturas) · actions.ts (CRUD) · schema.ts (Zod) ·
             import-actions.ts (RPC) · import/ (ver abajo)

src/components/
  ui/        Primitivas sin lógica de negocio
  layout/    Navegación y sesión
  library/   Pantallas de Biblioteca

src/lib/
  supabase/  Los tres clientes
  i18n/      routing · request · navigation
  ai/        Contratos y mapa tarea → proveedor/modelo (sin llamadas todavía)
  countries.ts · utils.ts · env.ts

src/messages/          ES/EN de la interfaz
src/types/database.ts  Tipos del esquema
```

**Por qué `features/` está separado de `components/`:** las queries de Biblioteca las va a
usar Degustación (vincular café ↔ cata) y Drafts (el copiloto lee la Biblioteca). Si vivieran
dentro de los componentes habría que refactorizar en el milestone 2.

---

## Convenciones

**Rutas en español, código en inglés.** Las URLs son `/es/biblioteca/nuevo`; los identificadores
del código son `coffees`, `createCoffee`. Los comentarios y los textos de usuario, en español.

**Mutaciones con Server Actions**, no API routes. Patrón de todas ellas:

```ts
export async function algo(_prev: State, formData: FormData): Promise<State> {
  await requireRole("admin", "editor");        // 1. quién eres
  const parsed = schema.safeParse(...);        // 2. valida (Zod)
  if (!parsed.success) return { error: ... };
  const supabase = await createClient();       // 3. cliente CON sesión → RLS
  ...
  revalidatePath(...);                         // 4. refresca
}
```

**Un solo esquema de Zod para formulario e import.** `src/features/library/schema.ts` lo usan
las dos entradas, así que las reglas de negocio (cuerpo 1–5, un single origin lleva un país)
no pueden divergir entre pantallas.

**El import está partido por capas, no por formato.** `import/readers.ts` convierte CSV o
XLSX en `RawRow[]`; de ahí en adelante `import/parser.ts` los trata igual. Así las reglas de
negocio no pueden divergir entre formatos, y los tests lo comprueban explícitamente. Ojo con
la frontera cliente/servidor: `import/index.ts` es la superficie segura para el navegador y
`import/server.ts` la que arrastra Node (`fs`); mezclarlas rompe el build con un
`Can't resolve 'fs'`.

**El estado de los filtros vive en la URL**, no en `useState`. Así un filtro se puede pegar en
un chat y sobrevive a recargar.

**Las fotos se guardan como *key* del objeto, nunca como URL.** El bucket es privado; la URL se
firma al renderizar y caduca. Por eso las imágenes usan `<img>` y no `next/image`: el
optimizador no puede cachear una URL que expira.

---

## Cómo añadir cosas

### Un campo nuevo a un café

1. Migración nueva (`0006_...sql`) con el `alter table`. **No edites migraciones ya aplicadas.**
2. `src/types/database.ts` — o `npm run db:types` si hay base enlazada.
3. `src/features/library/schema.ts` — el campo en el Zod.
4. `coffeeInputFromFormData()` en el mismo archivo.
5. `src/features/library/actions.ts` — en el insert y en el update.
6. `src/components/library/coffee-form.tsx` — el control.
7. Ficha y/o tarjeta, si se muestra.
8. `src/messages/es.json` **y** `en.json`.
9. Si tiene que llegar por CSV/Excel: alias de columna en `import/parser.ts` y la columna en `import/template.ts`.

### Una pantalla nueva protegida

Cuélgala de `src/app/[locale]/(app)/`: el layout ya exige sesión y pinta la navegación.
Llama a `setRequestLocale(locale)` al principio (lo necesita next-intl) y a `requireRole(...)`
si es de un rol concreto. Añádela a `items` en `src/components/layout/top-nav.tsx`.

### Un módulo nuevo (Degustación, Academy…)

1. Migración con tablas **y sus policies**.
2. `src/features/<modulo>/` con `queries.ts`, `actions.ts`, `schema.ts`.
3. Componentes en `src/components/<modulo>/`.
4. Rutas bajo `(app)/`.
5. Claves en los dos catálogos de mensajes.

Para Degustación hay dos cosas ya preparadas: `coffees.body`/`acidity` usan la escala 1–5
compartida, y la ficha de café tiene reservado el hueco de "tus degustaciones de este café".

### Enchufar un proveedor de IA

`src/lib/ai/types.ts` define los contratos (`CopilotAdapter`, `VisionAdapter`,
`TranslationAdapter`) y `config.ts` lee del entorno el mapa tarea → proveedor/modelo.

**No hay modelos por defecto en el código, a propósito.** `CLAUDE.md` exige que proveedor y
modelo sean siempre configurables para poder cambiar de proveedor — o pasar a Ollama local —
sin tocar lógica de negocio. Los valores sugeridos están en el README, no en el código.

Para añadir un proveedor: crea `src/lib/ai/providers/<nombre>.ts` implementando el contrato de
la tarea, y despáchalo desde un factory según `aiConfig(task).provider`. La lógica de negocio
sigue hablando sólo con las interfaces.

---

## Cómo verificar

### Rápido, sin base de datos

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Los 34 tests de `src/features/library/import/` cubren el import entero — reglas de negocio,
países, encabezados, duplicados y la paridad CSV ↔ Excel — sin tocar la base de datos. Los
fixtures de Excel se construyen a mano en el propio test (un .xlsx es un zip de XML), para no
depender de una librería de escritura sólo para probar.

### Completo, con base de datos *(pendiente — ver `TODO.md`)*

**Permisos.** Es la prueba que de verdad importa, porque es lo único que hace real la
privacidad. Con tres cuentas (admin, editor, viewer):

| Prueba | Esperado |
|---|---|
| Viewer inserta en `coffees` | Rechazado por RLS |
| Editor inserta y edita | Funciona |
| Editor borra un café | **Rechazado** |
| Editor quita una línea de origen | Funciona (eso es editar) |
| Admin borra | Funciona |
| Viewer se pone `role='admin'` | El trigger lanza excepción |

Probarlo desde el SQL Editor, **no sólo desde la interfaz** — la interfaz esconde botones, que
no es lo mismo que denegar:

```sql
set local role authenticated;
set request.jwt.claims = '{"sub":"<uuid del viewer>"}';
insert into public.coffees (slug, name, kind) values ('x','X','single_origin');
-- debe fallar
```

**Import CSV.** Un archivo de ~20 filas con 3 rotas a propósito (cuerpo = 9, tipo desconocido,
nombre vacío): el preview marca las 3 con su motivo e importa 17. Repetir el mismo archivo en
modo "omitir duplicados" → 0 insertados.

**Resto.** Subir una foto y comprobar que se ve tras recargar; cambiar a EN y ver que la ruta,
la interfaz y los nombres de país cambian y que la preferencia persiste; revisar
`/es/biblioteca` a 390 px sin scroll horizontal.

---

## Cosas que sorprenden

**Es Next.js 16, no el que recuerdas.** El archivo de middleware se llama `proxy.ts` y exporta
`proxy()`. `params` y `searchParams` son promesas (`const { locale } = await params`). Los tipos
`PageProps<"/ruta">` los genera Next: si añades una ruta y TypeScript no la reconoce, corre
`npx next typegen`. Hay guías en `node_modules/next/dist/docs/`.

**No hay `src/app/layout.tsx`.** El layout raíz vive en `src/app/[locale]/layout.tsx` para poder
fijar `<html lang>` según el idioma. Es el patrón de next-intl.

**Las vistas de Postgres necesitan `security_invoker = true`.** Sin eso una vista corre con los
permisos de su dueño y **se salta la RLS** de las tablas de debajo. `coffees_with_origins` lo
lleva puesto; cualquier vista nueva también debe llevarlo.

**Los helpers de rol son `security definer` a propósito.** Es lo que evita la recursión infinita
cuando una policy sobre `profiles` necesita consultar `profiles`.

**El import va por una RPC y no por inserts sueltos.** El cliente JS de Supabase no puede
envolver N inserts en una transacción; `import_coffees` sí. Si la fila 180 falla, no quedan 179
cafés a medias. Es `security invoker`, así que un viewer que llame a la RPC a mano sigue
rebotando contra la RLS.

**El equipo es cerrado por una casilla del dashboard.** *Authentication → Providers → Email →
Allow new users to sign up* tiene que estar **desactivado**. El código pide magic link con
`shouldCreateUser: false`, pero esa casilla es el cierre de verdad.

**Los backslashes de las expresiones regulares.** Al escribir archivos desde la shell de este
entorno se pierden; si ves una regex rara, compárala con el original antes de "arreglarla".
