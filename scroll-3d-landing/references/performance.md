# Rendimiento, accesibilidad y QA

## Carga

1. **Descargas pesadas en paralelo con el HTML** (no al final de la cadena de imports):
   ```html
   <link rel="modulepreload" href="vendor/three/three.module.js" />
   <link rel="modulepreload" href="vendor/three/addons/loaders/GLTFLoader.js" />
   <link rel="preload" href="models/product.glb" as="fetch" crossorigin />
   <link rel="preload" href="fonts/Display.woff2" as="font" type="font/woff2" crossorigin />
   ```
   Para que el `preload` del glb se aproveche, la URL tiene que ser **idéntica** a la que pide `GLTFLoader`, query string incluida. Si cambiás `?v=2` en uno, cambialo en el otro.
2. **Three.js local en producción**: copiá `node_modules/three/build/` y `examples/jsm/` (solo los addons que usás) a `vendor/` y apuntá el importmap ahí. Desde la r171, `three.module.js` importa `three.core.js`: precargá los dos.
3. **El loader tapa la escena hasta que el modelo esté listo.** El texto de la página puede estar debajo y cargado (SEO), pero el usuario no ve un objeto que "aparece" a medias.
4. **Presupuesto de primera carga**: menos de 6 MB en total, con el modelo por debajo de 4 MB. Con 4G (unos 10 Mbps), eso son 4–5 s de loader: aceptable para una experiencia así, siempre que haya progreso real.
5. Las variantes pesadas (texturas extra, un segundo modelo) se cargan **después** del primer render, con `requestIdleCallback` o al acercarse a su sección.

## Frame rate

- `setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Una sola luz con sombra, un mapa de 2048 y `PCFSoftShadowMap`. En móvil podés bajar a 1024.
- Pocas mallas y pocos materiales: cada material parcheado es un programa de shader. Uní mallas en Blender si son muchas piezas que no se despiezan.
- Las líneas del wire son baratas en GPU, pero muchas (más de 50 k segmentos) se ven mal y cuestan. Decimá.
- El overlay SVG se actualiza con `setAttribute` en cada frame: está bien para menos de 50 elementos. No uses `innerHTML` en el loop.
- `requestAnimationFrame` se pausa solo con la pestaña oculta. Si la página tiene secciones largas sin 3D, podés saltear el render cuando nada cambió (target ≈ cur y sin drag).
- Para detectar un equipo de gama baja: si los primeros 60 frames promedian más de 25 ms, bajá el pixel ratio a 1 y desactivá las sombras reales (dejá la de contacto).

## Accesibilidad

- `<canvas aria-label="Modelo 3D interactivo de …. Arrastrá para girarlo.">`. El SVG decorativo lleva `aria-hidden`.
- Todo el contenido está en HTML real (títulos, listas, `dl`): se lee sin 3D.
- El selector de variantes usa `role="tablist"` / `role="tab"`, `aria-selected` y flechas del teclado.
- `prefers-reduced-motion` (ver `choreography.md`).
- Contraste: el texto atenuado (72 %) sobre azul y sobre papel tiene que superar 4.5:1. Verificalo.
- Fallback sin WebGL: si `renderer` falla, ocultá el loader y mostrá una imagen estática del objeto (`og.png`) en lugar del canvas.

## QA (hacelo siempre antes de entregar)

1. Serví la carpeta (`npx serve` o `python -m http.server`) y abrila en el navegador.
2. Revisá la consola: sin errores (los 404 del wire opcional son esperables si no existe).
3. Recorré **cada sección** y sacá capturas en escritorio (1440×900) y móvil (375×812). En cada una, verificá:
   - el objeto no tapa texto y el texto no tapa al objeto;
   - las cotas coinciden con los bordes del objeto;
   - los callouts apuntan a la parte que nombran (ajustá `f` con `?debug` + clic);
   - el revelado recorre el objeto completo, de 0 a 1;
   - el cambio de fondo coincide con el revelado.
4. Probá las variantes de color y el drag (soltá, esperá y verificá que vuelve a la pose).
5. Probá con `prefers-reduced-motion` (DevTools → Rendering → Emulate CSS media feature).
6. Lighthouse en móvil: LCP menor a 3 s (el título es el LCP, no el canvas) y CLS 0.
7. **Capturas para el README o redes:** `?shot=<id de sección>` abre la página ya asentada en esa sección, sin loader ni transiciones. Con Chrome sin interfaz (puppeteer-core: `goto(url + '?shot=anatomia', {waitUntil:'networkidle0'})`, esperá 3 s y `screenshot`). `chrome --headless --screenshot` a secas no espera al modelo y saca la página en blanco.
8. Si el navegador de pruebas está en segundo plano, los rAF van muy lentos: esperá a que se asiente la animación antes de capturar, o leé el estado con JS.
