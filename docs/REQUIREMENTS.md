# Pasaporte de Café — Requerimientos de Producto y Propuesta Técnica

_Última actualización: 22 de septiembre, 2026_

## Resumen del proyecto

**Pasaporte de Café** es una aplicación web para un equipo de baristas (\~50 usuarios registrados, máximo \~10 concurrentes) donde llevan un registro colaborativo de cafés conocidos, degustaciones formales, borradores de guiones y pairings asistidos por IA, y contenido educativo. El sitio opera en español e inglés con selector de idioma, y debe funcionar bien en celular para usarse en el momento de una cata.

**Objetivos principales:**

- Centralizar el conocimiento de café del equipo (*Biblioteca*).
- Estandarizar y enriquecer el proceso de cata con un formulario guiado (*Degustación*).
- Facilitar la creación de guiones y sugerencias de pairing con ayuda de un copiloto de IA (*Drafts*).
- Formar al equipo con contenido de barismo (*Academy*).

**Naturaleza de este documento:** mezcla requerimientos funcionales (fijos, definidos por el dueño del producto) con una propuesta técnica (sugerida, ajustable). Pensado para pasarse a agentes de código (ej. Claude Code) como brief de arranque.

## Alcance, roles y permisos

**Usuarios y escala**

- Equipo cerrado (no público): requiere cuentas con login.
- \~50 usuarios registrados, máximo \~10 concurrentes — no requiere infraestructura de alta concurrencia.

**Roles personalizados**

- **Admin**: control total; gestiona usuarios y roles; edita Biblioteca y Academy; puede ver degustaciones compartidas.
- **Editor**: crea/edita contenido de Biblioteca y Academy (no gestiona usuarios ni roles — alcance exacto a confirmar).
- **Viewer**: solo lectura de Biblioteca y Academy.

**Privacidad de contenido personal**

- Las **Degustaciones** son privadas por defecto para quien las crea, con opción explícita de compartir con el equipo o con usuarios específicos.
- **Drafts**: se asume, por consistencia, el mismo modelo (privado por defecto, compartible) — *pendiente de confirmar con el usuario*.

> Nota técnica: implementar permisos a nivel de fila (Row Level Security) en la base de datos, no solo en la capa de UI, para que la privacidad sea real y no solo cosmética.

## Módulo Biblioteca

Repositorio central de cafés conocidos, cargado y mantenido por Admin/Editor.

**Campos por café:**

- Tipo: single origin vs. mezcla (blend)
- País(es) de origen (uno o varios, según el tipo)
- Historia / descripción
- Nivel de tueste
- Procesamiento (lavado, honey, natural, etc.)
- Cuerpo
- Acidez
- Notas de cata
- Sabores complementarios
- Datos extra (campo flexible/abierto para información adicional no estructurada)

**Funcionalidad:**

- Alta individual de cafés.
- Importación masiva desde CSV/Excel.
- Los registros deben poder vincularse posteriormente con Degustaciones (relación café ↔ degustaciones).

> Abierto: definir si "cuerpo" y "acidez" aquí usan la misma escala (slider + palabras) que en Degustación, para mantener consistencia entre módulos.

## Módulo Degustación

Formulario guiado que sigue el proceso real de cata, paso a paso:

1. **Identificación del café**: foto de la bolsa — se guarda como referencia visual **y** se procesa con IA de visión para extraer texto/datos y autocompletar nombre/origen; o selección manual desde la Biblioteca / registro de nombre libre.
2. **Aromas**: registro mediante rueda de sabores con categorías (tags) **y** texto libre.
3. **Sabores**: mismo esquema — tags + texto libre.
4. **Características**: cuerpo, acidez y retrogusto — cada una con slider (valor cuantitativo) más palabras descriptivas como campo complementario.
5. **Cierre**: qué se probó como pairing (texto/selección).

Cada degustación queda guardada como un registro fechado en el "pasaporte" personal del barista (historial tipo diario/bitácora).

**Privacidad**: privada por defecto; el usuario puede compartirla con el equipo o con personas específicas (ver sección de Alcance y roles).

**Historial de degustaciones**

- Vista "Mis degustaciones": lista de degustaciones propias ordenadas por fecha, con búsqueda/filtro por café, fecha y pairing.
- Toggle para ver también las degustaciones que el equipo ha compartido contigo, respetando siempre la privacidad definida en cada registro (ver Alcance y roles).
- Cada entrada del historial abre el detalle completo (foto, aromas, sabores, características y pairing) en modo lectura; si es propia, se puede editar.

## Módulo Drafts (copiloto de IA)

Espacio donde el barista redacta guiones de presentación y piensa pairings, con asistencia de IA en un **panel lateral tipo chat** — no un botón de "generar" aislado, sino una experiencia de copiloto en vivo (estilo GitHub Copilot Chat).

**La IA debe:**

- Dar sugerencias de pairing.
- Ayudar con corrección y mejora de estilo del texto que el barista está escribiendo.
- Basarse tanto en los datos guardados (Biblioteca + Degustaciones del barista) como en lo que se escribe en el momento en el draft.

**Modelo sugerido**: Claude Haiku, por su balance de costo/latencia para una experiencia conversacional frecuente (ver sección de IA para el manejo de proveedores y keys).

> Abierto: ¿los drafts se guardan como historial? ¿son privados o compartibles, igual que las degustaciones?

## Módulo Academy

Contenido educativo sobre métodos de extracción, historia del café y temas relacionados.

- Ya existe parte del contenido (lo aporta el dueño del producto).
- Formatos soportados: texto, imágenes, diagramas y videos (embebidos o subidos).
- Gestión de contenido con los mismos roles que Biblioteca (Admin/Editor cargan, Viewer consulta).

> Abierto: ¿estructura en categorías/lecciones? ¿incluye quizzes o seguimiento de progreso? No se pidió como requisito, pero queda como candidato natural para una fase 2.

## Internacionalización y traducción

- El sitio completo (interfaz + contenido) debe estar disponible en español e inglés, con selector de idioma.
- El contenido (Biblioteca, Academy) se carga **una sola vez**, en un idioma, y se traduce automáticamente — no se espera que el usuario escriba cada campo dos veces.
- Sugerencia: usar un LLM (Gemini, ver sección de IA) para traducir bajo demanda, con **cacheo** de la traducción generada para no re-traducir en cada carga de página.
- Recomendado: distinguir visualmente cuándo un texto es traducción automática (nota o ícono discreto), por si hace falta corrección manual.

## Identidad visual

- Solo **light mode** (no se requiere dark mode).
- Paleta: **verde oscuro** tipo specialty coffee shop, combinado con acentos cálidos/acogedores (crema, tostado, terracota) para que no se sienta frío o corporativo.
- Sin logo definido todavía; tipografía y logo quedan abiertos para la fase de diseño.

## Propuesta técnica: stack, base de datos y hosting

**Contexto**: equipo pequeño (máx. \~10 usuarios concurrentes), sin necesidad de alta escala. Se construirá con Claude Code; GitHub y Vercel ya están disponibles. Prioridad: gratis/bajo costo para empezar, fácil de mover a producción.

**Sugerencia (no bloqueante — el agente de código puede ajustar):**

- **Frontend**: Next.js (App Router) — despliega directo en Vercel, buen soporte de i18n para el selector ES/EN.
- **Backend / DB / Auth / Storage**: Supabase (Postgres + Auth con roles + Storage para las fotos de bolsas de café); capa gratuita suficiente para esta escala. Alternativa: Firebase, si se prefiere un modelo NoSQL o hay familiaridad previa con él.
- **Autenticación y permisos**: Supabase Auth + tabla de roles (admin/editor/viewer), con Row Level Security para controlar edición de Biblioteca/Academy y la privacidad de Degustaciones/Drafts.
- **Almacenamiento de fotos**: bucket de Supabase Storage (alternativa: Vercel Blob).
- **Entornos**: desarrollo local con `.env.local`; despliegue a Vercel para pruebas con el equipo.

> Esta sección es la más flexible del documento: si un agente de código encuentra una mejor combinación (p. ej. Vercel Postgres, Neon, PlanetScale), puede proponerla siempre que cumpla: auth con roles, storage de imágenes, y despliegue gratuito/económico en Vercel.

## IA: proveedores, modelos y gestión de API keys

- Proveedores disponibles: **Anthropic (Claude)** y **Google (Gemini)** — el dueño del producto ya cuenta con ambas API keys.
- **Asignación sugerida** (ajustable por el agente de código):
  - Copiloto de Drafts (chat lateral, pairing + estilo): **Claude Haiku** — balance de costo/calidad para uso conversacional frecuente.
  - Lectura de fotos de bolsas de café (extracción de texto/datos): **Claude** (visión).
  - Traducción automática de contenido (Biblioteca/Academy): **Gemini** — potencialmente más económico para tareas de traducción en volumen.
- **Requisito clave**: las API keys deben ser **configurables por variable de entorno**, y el código debe estar desacoplado del proveedor específico (capa de abstracción / adapter por tarea), para poder:
  - Cambiar de proveedor sin reescribir lógica de negocio.
  - Sustituir cualquier tarea por un **modelo local** (ej. Ollama) en el futuro, para ahorrar costos, sin romper el resto del sistema.
- No hardcodear modelos ni keys: usar `.env` y, si es posible, un archivo de configuración central que mapee tarea → proveedor/modelo.

## Notas para agentes de código y decisiones abiertas

Este documento mezcla requerimientos funcionales (fijos, vienen del dueño del producto) con una propuesta técnica (sugerida, no obligatoria). Los agentes de código pueden y deben ajustar la propuesta técnica (secciones de stack e IA) si encuentran una mejor solución, siempre que se respeten los requerimientos funcionales de las secciones anteriores.

**Decisiones aún abiertas** (conviene resolverlas antes o durante el desarrollo):

- Alcance exacto del rol Editor vs. Admin.
- Si los Drafts se guardan con historial, y si son privados o compartibles (como las Degustaciones).
- Estructura de Academy (categorías, lecciones, progreso/quizzes).
- Si "cuerpo"/"acidez" en Biblioteca deben usar la misma escala que en Degustación.
- Manejo de errores de traducción automática (¿corrección manual disponible?).
- Logo y tipografía definitivos.

**Prioridad sugerida para un MVP (fase 1):** Auth + roles → Biblioteca (CRUD + import) → Degustación (formulario completo) → selector de idioma con traducción automática.

Drafts (copiloto de IA) y Academy pueden ser fase 2, ya que dependen de definiciones que siguen abiertas.
