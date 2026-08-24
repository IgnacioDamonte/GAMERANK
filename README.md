# GameRank

App para puntuar videojuegos y guardarlos en una lista personal. Buscás
un juego (con toda la base de datos de RAWG.io — más de 500.000 títulos,
con carátula incluida), lo puntuás en seis categorías, y queda guardado
con el promedio, ordenado de mayor a menor puntaje.

Pensada mobile-first para usarse cómodo desde el celular.

## Qué funcionalidad tiene

- **Buscar**: escribís el nombre de un juego y aparece con su carátula,
  usando la API pública de RAWG.
- **Puntuar**: tocás un juego y aparece un panel con seis deslizadores —
  Gráficos, Diseño artístico, Música, Animaciones, Mecánicas e Historia —
  cada uno de 1 a 10. El promedio se calcula solo, en vivo.
- **Mi lista**: los juegos que puntuaste, ordenados por promedio. Tocás
  cualquiera para editar su puntaje o sacarlo de la lista.

## Stack

**Backend:** Node.js, Express, PostgreSQL (vía `pg`).

**Frontend:** HTML, CSS y JavaScript sin frameworks, con diseño mobile-first.

**Datos de juegos:** [RAWG.io API](https://rawg.io/apidocs) (gratis).

## Cómo correrlo en tu compu (desarrollo local)

Necesitás dos claves gratuitas — una de RAWG y una de una base de datos
Postgres. Ninguna de las dos pide tarjeta de crédito.

**1. Clave de RAWG:**
1. Entrá a [rawg.io/apidocs](https://rawg.io/apidocs) y hacé click en "Get API Key".
2. Registrate (email y contraseña alcanza).
3. Te muestra tu clave al toque — copiala.

**2. Base de datos gratis en Neon:**
1. Entrá a [neon.tech](https://neon.tech) y creá una cuenta gratis.
2. Creá un proyecto nuevo (te pide un nombre, cualquiera sirve).
3. En el dashboard del proyecto, buscá "Connection string" — es un texto
   largo que empieza con `postgres://...`. Copialo completo.

**3. Configurá el proyecto:**

```bash
cd server
npm install
cp .env.example .env
# abrí .env y pegá tu clave de RAWG en RAWG_API_KEY,
# y el connection string de Neon en DATABASE_URL
npm start
```

Abrí `http://localhost:4500`.

## Cómo publicarlo para que funcione siempre (sin depender de tu compu)

Con Render (gratis) el sitio queda andando todo el tiempo, en un link
fijo — no hace falta tener la compu prendida.

1. Subí este proyecto a un repositorio de GitHub.
2. Entrá a [render.com](https://render.com), creá una cuenta gratis
   (podés entrar directo con tu cuenta de GitHub).
3. Click en **New +** → **Web Service**, y elegí tu repositorio.
4. Configurá:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. En la sección **Environment Variables**, agregá:
   - `RAWG_API_KEY` con tu clave de RAWG
   - `DATABASE_URL` con tu connection string de Neon
6. Click en **Create Web Service**. Render te va a dar un link fijo tipo
   `https://gamerank-xxxx.onrender.com` — ese es el que usás desde el
   celular, siempre, sin necesidad de tu compu ni de estar en la misma red.

**Nota sobre el plan gratis de Render:** si la app no recibe visitas
durante un rato, "se duerme" y la primera vez que la abrís de nuevo
puede tardar unos 30-50 segundos en despertar. Después de eso responde
normal. Es una limitación del plan gratis, no un error.

## Estructura

```
server/
  routes/games.js     proxy a la API de RAWG (así tu clave nunca queda expuesta en el navegador)
  routes/ratings.js    guardar, listar y borrar puntajes
  db.js                  conexión a PostgreSQL
  server.js               arranque del servidor
public/
  index.html              frontend completo (HTML, CSS y JS en un solo archivo)
```

## Decisiones de diseño

- **Por qué un proxy y no llamar a RAWG directo desde el navegador:**
  así la clave de API queda solo en el servidor, nunca visible en el
  código del cliente.
- **Por qué `rawg_id` como clave única con `ON CONFLICT`:** puntuar de
  nuevo un juego que ya estaba en la lista actualiza su puntaje en una
  sola operación atómica, en vez de duplicarlo o arriesgar una
  condición de carrera entre el chequeo y la escritura.
- **Por qué Postgres y no SQLite:** SQLite guarda todo en un archivo
  local — en un hosting como Render ese archivo se borra cada vez que
  el servidor reinicia. Postgres vive aparte, en un servicio dedicado
  (Neon), así que los datos persisten siempre.
- **Por qué HTML, CSS y JS en un solo archivo:** evita cualquier
  problema de rutas rotas al mover o comprimir el proyecto — el
  frontend funciona sí o sí, sin depender de que las carpetas queden
  bien ubicadas.

## Próximos pasos posibles

- Filtrar "Mi lista" por categoría de puntaje.
- Exportar la lista a CSV.
- Instalar como app en la pantalla de inicio del celular (PWA).
