# Padel Zone v3 — Project Conventions

Contexto para trabajar en este repo. German (dueño del producto) no es programador — instrucciones paso a paso, sin jerga, confirmación antes de cada paso que modifique algo real.

## Stack

- React 19 + Vite 8 + Tailwind v4, SPA con `HashRouter`.
- Backend: Supabase (Postgres + Auth + RLS). Sin servidor propio — todo lo privilegiado vive en funciones `SECURITY DEFINER` de Postgres, no en el cliente.
- Deploy: push a `main` → GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages. Repo actualmente público (se evaluó pasarlo a privado; Pages con URL pública no funciona desde un repo privado en el plan gratis).
- Capa de datos: `src/api/padelService.js` (un solo archivo grande) + hooks de React Query. Todas las tablas/políticas/funciones viven en `supabase/schema.sql`.

## Flujo de trabajo obligatorio

1. **Nunca ejecutar SQL contra la base real.** No hay credenciales de Supabase en este entorno. Cualquier cambio de esquema/política se agrega a `supabase/schema.sql` (para que quede documentado) y además se le entrega a German como bloque SQL para pegar en el SQL Editor de Supabase — paso a paso, un bloque por vez.
2. **Antes de dar por terminado un cambio de código:** correr `npm run lint` y `npm run build`. Si el cambio es visible en el navegador, verificar con el preview cuando sea posible (login real vía Google OAuth no es posible desde acá — no se pueden probar flujos que requieren sesión).
3. **Confirmar con el usuario antes de `git push`.** Nunca commitear/pushear sin un "sí" explícito para ese lote de cambios.
4. Mensajes de commit: describir el porqué, no solo el qué, y cerrar con `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
5. **No usar el script `npm run push`** (hace `git add .` a ciegas) — armar los `git add` con archivos explícitos.
6. Después de un push, si hubo cambio de UI, verificar el deploy: `curl` al bundle publicado o revisar Actions, y confirmarle a German cuando el sitio ya sirve el código nuevo.

## Seguridad / RLS — patrones ya establecidos

- **Nunca** `USING (true)` en policies de escritura, ni `OR auth.uid() IS NULL`. Ya hubo un incidente real de exposición de datos por esto (mensajes, chats, reservas — auditoría 2026-08-09).
- Para una acción que un usuario no-dueño necesita disparar bajo una condición controlada (notificar a otro usuario, cambiar la visibilidad del club de otro, dar like) — usar una función `SECURITY DEFINER` que valida la condición internamente, no abrir una policy de `UPDATE`/`INSERT` genérica. Ejemplos ya en el código: `set_club_visibility`, `set_club_comments_allowed`, `create_booking_notification`, `create_tag_notification`, `toggle_post_like`.
- `WITH CHECK` explícito en policies de `UPDATE` cuando el usuario podría intentar reescribir un campo sensible (rol propio, autor de un post, etc.) — no confiar en que `USING` sin `WITH CHECK` alcanza.
- Al ocultar algo (club invisible, cancha no reservable), hacerlo **también** a nivel de RLS, no solo en la UI — alguien podría saltear la interfaz.

## Convenciones de código

- Comentarios mínimos: solo cuando explican un motivo no obvio (una decisión, un bug evitado, una restricción). No JSDoc, no comentarios que describan qué hace el código.
- Componentes compartidos entre paneles (ej. `CourtCard`, `CourtFormModal` en `src/components/social/`) en vez de duplicar entre el panel del dueño de club y el panel privado.
- Paneles standalone (`/panel-padelzone`, `/club-dashboard`) viven **fuera** de `AppLayout` — no llevan el sidebar/feed social de la app. Cada uno tiene su propio modo oscuro/claro local (estado + localStorage con su propia key), independiente del `ThemeContext` global de la app.
- `padelService.getCurrentUser()` lee de una caché en `localStorage` — puede quedar desactualizada. Para datos que deben ser siempre frescos (ej. pareja de equipo), resolver contra una consulta en vivo, no confiar en campos cacheados que no persisten en la tabla real.
- Hay una dependencia `sonner` (toasts) instalada pero sin usar — candidata natural si se reemplazan los `alert()`/`confirm()` nativos (pendiente, ver informe de QA).

## Dónde está la memoria de decisiones pendientes

Ver `MEMORY.md` y los archivos en la carpeta de memoria del usuario — ahí están documentadas las decisiones de producto que German pidió recordar (política de cancelación/pago, configuración de horarios por club) y lecciones de debugging (auth, git corrompido). No repetir ahí lo que ya está en este archivo.
