# WhatsApp Template Hub

Dashboard para ver y buscar las plantillas de mensajes de WhatsApp Business de todas las WABAs (WhatsApp Business Accounts) de una cuenta de Meta Business.

## Funcionalidades

- **Multi-WABA**: carga las plantillas y los números de teléfono de todas las WABAs del negocio.
- **Filtro por WABA**: barra lateral con casillas para ver varias a la vez (por ejemplo, Campus, Flou y humains), botón "Solo" para quedarse con una, buscador de WABAs y número de plantillas que coinciden en cada una. El teléfono distingue las WABAs con el mismo nombre.
- **Búsqueda en todo el contenido**: nombre, cabecera, cuerpo, pie, texto, URL y teléfono de los botones, WABA e ID. Sin distinguir acentos ni mayúsculas y con varias palabras en cualquier orden. Las coincidencias se resaltan y, en la lista, se muestra el fragmento donde aparecen.
- **Lista agrupada por WABA**, con grupos que se expanden y contraen. Cada fila es un nombre de plantilla con una etiqueta por idioma (`es`, `pt_PT`…), en lugar de una fila repetida por idioma.
- **Más filtros**: estado (solo si hay más de uno), categoría, idioma e incluir las plantillas de ejemplo de Meta.
- **Detalle con pestañas**: vista previa tipo burbuja de WhatsApp (formato, cabecera de texto, imagen, vídeo, documento o ubicación, pie y botones; modo "Con ejemplo" con los valores de las variables, numeradas o con nombre), variables, botones con su destino (URL, teléfono o Flow) e información. Selector de idioma, aviso si Meta cambió la categoría y botones para copiar.
- **Galería**: todas las plantillas filtradas como burbujas de WhatsApp, agrupadas por WABA, para recorrerlas haciendo scroll (por ejemplo, todas las de una WABA). Desde cada tarjeta se abre el detalle o se marca para comparar. Solo se pinta al elegirla, y las tarjetas fuera de pantalla no se dibujan.
- **Comparar**: marca de 2 a 4 plantillas y míralas en columnas. "Resaltar diferencias" (desmarcado al empezar) marca las palabras del cuerpo que cambian y los datos (idioma, categoría, cabecera, pie, botones) que no coinciden. "Comparar idiomas" abre todas las variantes de idioma de una plantilla.
- **Enlaces compartibles**: búsqueda, filtros, vista, plantilla abierta y comparación se guardan en la URL.
- **Atajos de teclado**: `/` o `Cmd+K` para buscar, `Esc` para limpiar y `↑`/`↓` para recorrer la lista.
- **Solo lectura**: para editar una plantilla, "Abrir en Meta" abre el Business Manager.
- **Sincronización manual** con Meta, limitada a una cada 2 minutos.
- **Degradación parcial**: si falla una WABA, el resto se sigue mostrando y la WABA fallida se marca en la barra lateral.
- **Responsive**: en móvil, el filtro de WABAs y el detalle se abren como paneles desde abajo.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, React Server Components, ISR)
- [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS 4](https://tailwindcss.com/)
- [Meta Graph API v23.0](https://developers.facebook.com/docs/graph-api)
- [Vitest](https://vitest.dev/) + Testing Library

## Arquitectura

No es una SPA: la página se renderiza en el servidor y se sirve como HTML estático regenerado con ISR. El servidor actúa como BFF: es el único que habla con Meta, el token nunca llega al navegador y los datos se entregan ya agregados.

```
Navegador ──► CDN de Vercel ──► Página ISR (/, revalidate 5 min)
                                   │
                                   ▼
                          getTemplatesSnapshot()   ← Data Cache de Next (compartida entre instancias)
                                   │                  tag "meta-templates", revalidate 5 min
                                   ▼
                          fetchWabasWithTemplates() ──► Meta Graph API
                          (paginación, timeout 15 s,
                           máx. 16 WABAs en paralelo)
```

1. `page.tsx` (Server Component) llama a `getTemplatesSnapshot()` (`src/lib/templates.ts`).
2. El snapshot (`{ wabas, fetchedAt }`) vive en la **Data Cache** de Next.js mediante `unstable_cache`, con `revalidate` de 5 minutos y el tag `meta-templates`. En Vercel esta caché es compartida por todas las instancias, así que Meta recibe como mucho una regeneración cada 5 minutos, independientemente del tráfico.
3. Al expirar se sigue sirviendo la versión anterior mientras se regenera en segundo plano (stale-while-revalidate).
4. El cliente recibe todas las plantillas y filtra en memoria (`useTemplateFilters`), sin más llamadas al servidor.

### Caché y errores

- **Los errores no se cachean.** Si falla la lista de WABAs o fallan todas las WABAs, `fetchWabasWithTemplates()` lanza el error y Next sigue sirviendo el último snapshot bueno. Si falla solo una parte de las WABAs, se muestran las demás y las fallidas aparecen con su error.
- Los mensajes de error que llegan a la UI son cortos (mensaje de Meta y código HTTP). El detalle completo (`code`, `fbtrace_id`…) solo va a los logs del servidor.
- La única excepción es la falta de configuración (`META_ACCESS_TOKEN` / `META_BUSINESS_ID`): se muestra un aviso para que un build sin secretos (por ejemplo, en CI) no falle.
- **Si Meta falla durante un deploy, el build falla.** Es intencionado: es preferible no desplegar a publicar una página de error cacheada. La versión anterior sigue en producción.
- **Antigüedad máxima de los datos.** La página (ISR) y el snapshot (Data Cache) se regeneran cada 5 minutos de forma independiente, así que en el peor caso los datos tienen unos 10 minutos. El `revalidate` de `page.tsx` tiene que ser un literal (lo exige Next), por eso está duplicado respecto a `TEMPLATES_REVALIDATE_SECONDS`.

#### Limitaciones conocidas

- Tras una sincronización manual la entrada de caché se invalida. Si Meta falla justo en ese momento, no hay snapshot anterior que servir y se muestra `error.tsx` hasta la siguiente carga correcta. La regeneración automática cada 5 minutos no tiene este problema.
- La comprobación del cooldown no es atómica: dos sincronizaciones en el mismo instante pueden regenerar las dos. Como mucho supone una llamada extra a Meta, así que no compensa un lock distribuido.

### Sincronización manual

Tanto el botón **Sincronizar con Meta** (Server Action `syncTemplates`) como `POST /api/revalidate` usan `requestTemplatesSync()`:

- Si el snapshot tiene menos de 2 minutos, devuelve `cooldown` con `retryAfterSeconds`.
- Si no, hace `revalidateTag("meta-templates")` y devuelve `ok`. La respuesta de la Server Action ya incluye la página renderizada con los datos nuevos.
- Si Meta no responde (caché vacía y Meta caído), devuelve `error` con un mensaje para el usuario. Nunca lanza una excepción.

En el cliente, el botón respeta el cooldown al cargar la página (limitado a 2 minutos aunque el reloj del usuario esté desajustado) y también tras un error, para no insistir contra Meta.

El cooldown se calcula a partir del `fetchedAt` del propio snapshot cacheado, no de una variable en memoria. Por eso funciona igual con varias instancias y tras un cold start, sin infraestructura extra.

### Observabilidad

Cada regeneración escribe una línea JSON en los logs (`event: "meta_templates_fetched"`, con número de WABAs, fallos y duración), y cada error de Meta otra (`event: "meta_api_error"`). Se pueden consultar en los Runtime Logs de Vercel.

## Requisitos

- Node.js 22 (ver `.nvmrc`)
- Una cuenta de Meta Business con acceso a la WhatsApp Business API
- Un token de System User con el permiso `whatsapp_business_management`

## Puesta en marcha

```bash
git clone https://github.com/Gonzalez8/whatsapp-template-hub.git
cd whatsapp-template-hub
cp .env.example .env.local   # rellenar credenciales
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable                | Obligatoria | Descripción                                                                                               |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `META_ACCESS_TOKEN`     | Sí          | Token de System User con `whatsapp_business_management`                                                   |
| `META_BUSINESS_ID`      | Sí          | ID de la cuenta de Meta Business                                                                          |
| `REVALIDATE_SECRET`     | No          | Secreto para `POST /api/revalidate`. Si no está definido, el endpoint devuelve siempre 401                |
| `BRAND_NAME`            | No          | Nombre de la empresa junto a su logo y en el título de la pestaña                                         |
| `BRAND_LOGO_URL`        | No          | Logo de la empresa: URL `https://` o ruta dentro de `/public` (p. ej. `/logo.png`)                        |
| `BRAND_COLOR`           | No          | Color de marca en hexadecimal (p. ej. `#0017EC`). Por defecto, el verde de WhatsApp                       |
| `BRAND_LOGO_BACKGROUND` | No          | `white` pone el logo sobre una pastilla blanca, para logos oscuros que no se verían sobre la barra oscura |

### Personalizar la marca

Con `BRAND_NAME`, `BRAND_LOGO_URL` y `BRAND_COLOR` cada despliegue lleva el logo y el color de la empresa sin tocar código:

- El logo aparece a la izquierda de la barra superior, directamente sobre el fondo oscuro, seguido del logo de WhatsApp y "Template Hub". Si el logo es oscuro y no se ve, `BRAND_LOGO_BACKGROUND=white` lo pone sobre una pastilla blanca.
- Sobre las barras oscuras se usa una versión aclarada del color de marca, calculada para que contraste (así un color de marca oscuro no desaparece).
- El color de marca se usa como acento: botones principales, selección, casillas, chips y pestaña activa. El texto sobre el acento pasa a oscuro o a blanco según su contraste, y para los textos sobre blanco se oscurece el color hasta que se lea bien (WCAG AA).
- Un valor no válido se ignora (con un aviso `brand_config_invalid` en los logs) y se usa el diseño por defecto.
- Como la página es estática, un cambio en estas variables se aplica al **redesplegar** (Vercel → Deployments → Redeploy).

## API

### `POST /api/revalidate`

Fuerza una sincronización con Meta (por ejemplo, desde un webhook o un cron).

```bash
curl -X POST https://<dominio>/api/revalidate -H "x-revalidate-secret: $REVALIDATE_SECRET"
```

| Respuesta | Significado                                                      |
| --------- | ---------------------------------------------------------------- |
| `200`     | `{ "revalidated": true }`                                        |
| `401`     | Secreto ausente o incorrecto                                     |
| `429`     | Datos de hace menos de 2 min; cabecera `Retry-After` en segundos |
| `502`     | No se pudo contactar con Meta                                    |

## Estructura

```
src/
  app/
    page.tsx               # Página (Server Component + ISR)
    layout.tsx             # Layout raíz
    error.tsx              # Error boundary
    actions.ts             # Server Action de sincronización
    api/revalidate/route.ts
  components/
    TemplatesDashboard.tsx # Layout, selección, comparación, URL y teclado
    TopBar.tsx             # Buscador y sincronización
    WabaSidebar.tsx        # Filtro de WABAs
    ListToolbar.tsx        # Chips y filtros de la lista
    TemplateList.tsx       # Lista agrupada por WABA y por nombre
    DetailPanel.tsx        # Detalle con pestañas
    GalleryView.tsx        # Galería de burbujas por WABA
    CompareView.tsx        # Comparación en columnas
    WhatsAppPreview.tsx    # Burbuja de WhatsApp
  hooks/
    useTemplateFilters.ts  # Filtrado en cliente
    useTemplatesSync.ts    # Botón de sincronizar
    useMediaQuery.ts
  lib/
    meta-api.ts            # Cliente de Meta Graph API
    templates.ts           # Snapshot cacheado + lógica de sincronización
    sync-config.ts         # Tiempos de caché y cooldown (compartido servidor/cliente)
    concurrency.ts         # allSettled con límite de concurrencia
    secret.ts              # Comparación de secretos en tiempo constante
    whatsapp-format.tsx    # Formato de texto de WhatsApp (negrita, cursiva…)
    template-utils.ts      # Etiquetas, ejemplos y variables
    template-groups.ts     # Variantes de idioma de una plantilla
    search.ts              # Normalización, coincidencias y fragmentos
    diff.ts                # Diferencias por palabras para comparar
    url-state.ts           # Estado de la pantalla en la URL
  types/
    template.ts
  __tests__/
```

## Scripts

| Comando          | Descripción            |
| ---------------- | ---------------------- |
| `npm run dev`    | Servidor de desarrollo |
| `npm run build`  | Build de producción    |
| `npm run start`  | Servidor de producción |
| `npm test`       | Tests (Vitest)         |
| `npm run lint`   | ESLint                 |
| `npm run format` | Prettier               |

## Despliegue en Vercel

Configurar `META_ACCESS_TOKEN`, `META_BUSINESS_ID` y (opcionalmente) `REVALIDATE_SECRET` en las variables de entorno del proyecto.

> ⚠️ La aplicación **todavía no tiene autenticación**: cualquiera con la URL puede ver las WABAs, plantillas y números de teléfono. Hasta que se añada, conviene activar la Deployment Protection de Vercel.

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE)
