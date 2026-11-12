---
name: scroll-3d-landing
description: Crea landing pages premium con un objeto 3D protagonista (cualquier objeto, sea producto, gadget, botella, mueble, auto, joya, instrumento, maqueta, obra de arte, comida o juguete) que se mueve, se revela y cambia al hacer scroll, con la calidad de toppervenom.com o de las páginas de Apple. Cubre todo el proceso en HTML/CSS/JS vanilla + Three.js — concepto y dirección de arte, conseguir el modelo 3D (escaneo/fotogrametría con celular, Blender, IA image-to-3D, CAD, compra o procedural), optimizar el .glb, luz de estudio, shaders de revelado (wireframe→sólido, despiece, puntos, corte), variantes de color, cotas y callouts SVG, coreografía por scroll y pulido. Usala siempre que el usuario quiera una web o landing con un objeto 3D interactivo, un "scrollytelling", mostrar algo en 3D, escanear un objeto o convertir fotos en 3D para la web, o replicar "esa web con el 3D que se arma al scrollear", aunque no nombre Three.js.
---

# Landing 3D con scroll (para cualquier objeto)

Esta skill sirve para construir una landing de una sola página donde **un objeto 3D es el protagonista**. El objeto se queda fijo detrás del contenido y cambia de pose, de estilo de render y de contexto a medida que el usuario scrollea. Sirve para cualquier cosa que se pueda mostrar como objeto: una botella de vino, un auricular, una silla, una guitarra, un reloj, un auto, una maqueta de edificio, una escultura, una cámara antigua, un frasco de perfume, una herramienta o un juguete.

El caso de referencia es toppervenom.com, que usa una zapatilla: arranca como plano técnico (wireframe blanco sobre cuadrícula azul), se "rellena" con el material real, muestra sus medidas y partes, cambia de color y termina girando. **La zapatilla es solo el ejemplo; lo que se replica es la forma de construir la página y su nivel de calidad.** Cada proyecto elige su propio concepto visual, su secuencia de actos y el efecto de revelado que mejor le queda a su objeto (ver "Adaptar al objeto" más abajo).

## Por qué estas webs se ven tan bien (leé esto antes de empezar)

La calidad **no viene del stack**. toppervenom.com son unos 90 KB de HTML/CSS/JS escritos a mano más Three.js: no tiene framework, ni GSAP, ni bundler. La calidad viene de cinco cosas, y cada decisión del proyecto tiene que servir a alguna:

1. **Un asset 3D real y bien preparado.** Un escaneo con textura fotográfica (o un modelo con detalle real), limpio, liviano y con escala real. Si el modelo es malo, nada de lo demás lo salva. → `references/3d-capture.md`, `references/3d-alternatives.md`
2. **Render con criterio fotográfico.** Iluminación de tres puntos, environment map, tone mapping neutro, sombra de contacto y materiales corregidos (un escaneo suele traer metalness falso que hace ver el cuero como plástico). → `references/rendering.md`
3. **Un concepto de dirección de arte llevado hasta el último detalle.** "Plano técnico" en toppervenom: la cuadrícula, las cotas, la tipografía mono, el loader dice "PLOTTING DRAWING Nº 01", el rail dice "REV. 0 — BLUEPRINT". Todo cuenta la misma historia. → `references/art-direction.md`
4. **Movimiento con física, no con keyframes.** Las poses se declaran por sección; el JS interpola con smoothstep y además amortigua cada valor con decaimiento exponencial. Eso da peso e inercia. → `references/choreography.md`
5. **Efectos de shader que justifican el 3D.** Revelado wireframe→sólido con un plano que barre el objeto, superficie fantasma con fresnel, recoloreo por luminancia. Son cosas que un video no puede hacer. → `references/shaders.md`

Si el usuario pide "algo así", el trabajo real es: **conseguir un buen modelo + elegir un concepto + ajustar con paciencia**. La plantilla resuelve la ingeniería.

## Adaptar al objeto (no copies la zapatilla)

La plantilla trae una secuencia de ejemplo (plano → medidas → partes → revelado → números → origen → cierre), pero la forma del objeto y su historia deciden la composición, el efecto y los actos. Antes de escribir poses, ubicá el objeto en esta tabla:

| Forma del objeto | Ejemplos | Composición | Revelado que mejor funciona | Actos típicos |
|---|---|---|---|---|
| **Alargado horizontal** | zapatilla, auto, guitarra, cuchillo, lapicera, tren | Objeto a un costado y texto al otro; perfil puro para las cotas | Barrido a lo largo (punta → cola) | Perfil técnico, detalle de piezas, velocidad o uso |
| **Vertical / de revolución** | botella, perfume, lámpara, florero, trofeo, edificio | Objeto centrado o a un tercio, texto a los costados en dos columnas; plano contrapicado para el clímax | Barrido de abajo hacia arriba ("se llena") o corte transversal | Silueta, material o contenido, origen, ritual de uso |
| **Compacto / caja** | auricular, cámara, parlante, reloj, consola, joya | Primeros planos grandes (`scale` 1.4–2) que recorren el objeto como una macro | Despiece (vista explosionada) o barrido diagonal | Diseño, interior/componentes, materiales, especificaciones |
| **Plano / de lectura frontal** | libro, disco, cuadro, placa, tarjeta, tablet | Rotaciones cortas (±0.4 rad) para mostrar el espesor; nunca de canto mucho tiempo | Puntos que se condensan, o pintura que "aparece" | Frente, dorso, detalle de textura, contexto |
| **Orgánico / escultórico** | escultura, comida, planta, fósil, juguete | Giros lentos y amplios, mucha luz de contorno | Nube de puntos → superficie, o fantasma con fresnel | Forma, textura, historia, escala humana |
| **Ensamblado de piezas** | mueble, máquina, maqueta, producto modular | Vista 3/4 alta, todo el conjunto en cuadro | **Despiece por scroll**: cada pieza se separa sobre su eje y vuelve | Conjunto → despiece → pieza por pieza → armado |
| **Gran escala** | casa, edificio, terreno, barco | Cámara más lejos, rotación de "maqueta" sobre la mesa | Barrido vertical por pisos, cortes de sección | Emplazamiento, plantas, cortes, materiales |

Elegí también el **concepto visual** según el objeto, no por defecto. "Plano técnico" le queda a todo lo diseñado o fabricado; un vino puede pedir "ficha de bodega"; una escultura, "catálogo de museo"; un gadget, "laboratorio"; algo vintage, "catálogo de época". El menú completo está en `references/art-direction.md`, y los efectos alternativos (despiece, puntos, corte, llenado) en `references/shaders.md`.

## Flujo de trabajo

Seguí estas fases en orden. Antes de escribir código, confirmá con el usuario las decisiones de las fases 1 y 2, porque cambian todo lo que viene después.

### Fase 1 — Brief y concepto (5 minutos con el usuario)

Preguntá o deducí:
- **Qué objeto** es y de qué material (cuero, vidrio, metal, plástico mate, tela). El material define cómo capturarlo y cómo iluminarlo.
- **La historia en 5–8 actos.** Cada acto es una sección y una pose del objeto. Ejemplo típico: presentación → plano/medidas → anatomía (partes) → revelado → números → origen/historia → cierre.
- **El concepto visual**, es decir, la metáfora que unifica todo. No copies "blueprint" por defecto: elegí la metáfora que tenga sentido para *ese* producto. En `references/art-direction.md` hay un menú de conceptos (plano técnico, ficha de museo, laboratorio, catálogo de los 90, editorial de moda, despiece industrial) con su paleta, tipografías y cómo se traduce cada uno al 3D.
- **Contenido real.** Datos, medidas, materiales, historia y créditos. Las webs de referencia se sienten auténticas porque usan datos reales del catálogo original y del escaneo. Si no hay datos, pedilos; no inventes especificaciones de un producto real.
- **Idiomas** (es/en) y si hay variantes de color.

### Fase 2 — Conseguir el modelo 3D

Esta es la fase que más afecta la calidad final. Usá este árbol de decisión y leé la referencia que corresponda:

```
¿El usuario tiene el objeto físico?
├─ Sí → ESCANEARLO (references/3d-capture.md)
│   ├─ Objeto mate/con textura (zapatilla, comida, piedra, madera, tela) → fotogrametría con celular o cámara
│   ├─ Brillante, negro o transparente → spray matificante temporal + fotogrametría, o modelarlo
│   └─ Muy chico/fino (joyas, cables) → fotogrametría macro o modelarlo
└─ No → ALTERNATIVAS (references/3d-alternatives.md)
    ├─ Hay CAD/STEP del fabricante → convertir y texturizar
    ├─ Hay fotos buenas desde varios ángulos → IA image-to-3D (Meshy, Tripo, Rodin, Hunyuan3D, TRELLIS) + limpieza
    ├─ Forma geométrica (botella, lata, lámpara, mueble) → modelar en Blender (revolución/extrusión), 1–4 h
    ├─ Producto genérico → comprar o descargar con licencia (Fab, Sketchfab, CGTrader, Poly Haven)
    └─ Sin modelo posible → objeto procedural/estilizado (lathe, extrude de SVG, puntos, line-art)
```

Cualquiera sea el origen, el modelo pasa por el **pipeline de optimización** (`references/asset-pipeline.md`): limpieza, decimado a 100–300 k triángulos, textura de 2048–4096 en WebP, compresión Meshopt, escala real, origen y orientación correctos, y una **malla aparte muy decimada para el wireframe**. Ese detalle importa mucho: el wireframe de una malla densa se ve como ruido gris, no como un dibujo.

Hay un script listo para este paso: `scripts/prepare-model.sh <entrada.glb|.obj|.fbx> <nombre>`. Genera `models/<nombre>.glb` optimizado y `models/<nombre>-wire.glb` para las líneas. Con la Stratocaster de ejemplo pasó de 22,2 MB a 1,8 MB.

**Escaneo o modelo hecho a mano.** La malla de wire decimada es para **escaneos**, donde las aristas son ruido. En un modelo **hecho a mano** (CAD, Sketchfab, Blender), la malla decimada se convierte en triángulos largos que atraviesan las superficies y se lee como malla, no como dibujo. Ahí usá `wireMode: 'edges'` sobre la malla principal y `wireModel: null`, sin generar el wire. Se lee como un dibujo técnico y te ahorrás un archivo.

**Descargas de Sketchfab**: requieren sesión iniciada (cuenta gratuita). Si usás el navegador integrado, pedile al usuario que inicie sesión y confirmá nombre, tamaño y formato (GLB) antes de descargar. Guardá el original en una carpeta `source/` aparte y acreditá al autor (CC BY) en el footer.

### Fase 3 — Armar el proyecto desde la plantilla

Copiá `assets/template/` a la carpeta del proyecto. Esto es lo que trae:

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura: fondo fijo (cuadrícula + papel), `<canvas>` fijo, `<svg>` de overlay, loader, nav, rail de progreso, selector de colorway y secciones con atributos de pose (`data-ry`, `data-x`, `data-reveal`…). |
| `styles.css` | Sistema visual: tokens, tipografía fluida con `clamp()`, cuadrícula CSS, fondo papel, reveals con blur, curvas de easing, móvil. |
| `main.js` | Motor: renderer, luces, carga con progreso, shaders de revelado y colorway, wireframe y fantasma, sombras, coreografía de scroll, drag con resorte, overlays SVG (cotas y callouts), contadores, colorways. Todo configurable desde `CONFIG` al principio del archivo. |

No necesita build. Se sirve con cualquier servidor estático (`npx serve`, `python -m http.server`). No funciona con `file://` por los módulos ES. Three.js viene de jsDelivr con versión fija en el `importmap`; para producción conviene copiarlo a `vendor/` y agregar `modulepreload` (ver `references/performance.md`).

Probala sin modelo: `index.html?model=<url de un .glb>`, o sin parámetro para ver el objeto procedural de reemplazo. Un buen glb de prueba es `MaterialsVariantsShoe.glb` de KhronosGroup/glTF-Sample-Assets.

### Fase 4 — Ajustar el modelo a la escena

En `main.js → CONFIG`:
1. `orient`: rotá hasta que el objeto quede con Y hacia arriba y el largo sobre X (por ejemplo, `[0, 0, -Math.PI/2]` para acostar una guitarra que viene parada). La orientación se aplica al modelo antes de medirlo, así que la caja, las cotas, `sweepDir`, los callouts y el despiece se expresan siempre en el espacio ya orientado. Usá `?debug` para ver los ejes.
2. `realSizeCm`: la medida real del lado más largo, en cm. De ahí salen todas las cotas que se muestran.
3. `sweepDir`: la dirección del barrido de revelado. Que siga la "lectura" natural del objeto: a lo largo en un objeto alargado (`[1,0,0]` o `[0,0,1]`), de abajo hacia arriba en una botella o un edificio (`[0,1,0]`) y en diagonal en un objeto compacto (`[0.3,0.3,1]`).
4. `callouts`: las posiciones de las partes, como fracciones de la caja (`f`, 0..1) o como coordenadas exactas del modelo (`p`, en sus unidades). El código las pega al vértice más cercano. Ordenalas de arriba hacia abajo para que las líneas no se crucen. Con `?debug`, hacé clic sobre el modelo y la consola imprime la fracción exacta del punto.
5. `colorways`: definí oscuro/claro por variante (o borrá el selector si el objeto no tiene variantes). El shader recolorea por luminancia y preserva los detalles saturados; si el objeto en sí es de un color saturado, poné `keepSaturated: 0`.
6. Secciones: agregá, quitá o reordená `<section>` libremente. El motor lee las poses de cualquier cantidad de secciones, en cualquier orden.
7. Opciones del motor para casos especiales:
   - `procedural: () => Object3D` arma el objeto por código en lugar de cargar un glb.
   - `wireMode: 'edges'` dibuja solo las aristas de dibujo. Es lo mejor para objetos duros, CAD o procedurales.
   - `extraKeys: ['screen']` + `onFrame(cur, dt, t)` sirven para efectos propios controlados por sección (`data-screen`). Por ejemplo, una pantalla que se enciende, una luz o una tapa que se abre.
   - Despiece con `data-explode`: cada pieza se mueve según su `userData.explode = [x,y,z]` (o se aleja del centro si no lo tiene).
   - Por pieza: `userData.noRecolor` (ignora los colorways), `userData.noWire` (no aparece en el plano) y `userData.keepPbr` (el motor no toca su material).
   - `recolorOnly: ['BodyMaterial']`: solo esos materiales (por nombre del glb) toman los colorways. En la guitarra se pinta el cuerpo y quedan intactos el golpeador, el mástil y los herrajes.
   - `keepPbr: true` respeta el PBR de modelos hechos a mano (metales reales, barniz con clearcoat). Por defecto, el motor corrige el metalness falso de escaneos e IA, y eso arruina un modelo bien hecho.
   - `wireColors: [color con paper 0, color con paper 1]` y `edgeColor` adaptan el plano a cualquier concepto, por ejemplo tinta sobre papel de patente en lugar de blanco sobre azul. Los dos estados del fondo (`backdrop__grid` y `backdrop__paper`) son solo nombres: se pueden estilar como lámina → escenario, vitrina → noche, etc.
   - `data-rz` (roll) para parar objetos largos, como una guitarra en su soporte. Las sombras de piso se apagan solas al pararlo.
8. **Ubicar las piezas de un modelo ajeno** (para los callouts): con `?debug`, en la consola, tirá rayos desde el frente sobre una grilla de la caja y anotá qué material toca cada rayo. El resultado es un mapa ASCII del objeto: con las letras de cada material se distinguen el cuerpo, el mástil, los trastes y el puente, y de ahí salen las fracciones `f` de cada callout. Después verificá cada ancla con un rayo en su posición. Las herramientas son `__dbg()` (devuelve `root`, `norm`, `camera`, `srcBox`, `callouts` y la pose) e `import('three')` desde la consola. Para comparar líneas: `?wiremode=edges`, `?edgeangle=35`, `?wireModel=none`.

### Fase 5 — Coreografía

Cada `<section>` declara su pose. Diseñá la secuencia pensando como director de fotografía (detalle en `references/choreography.md`):
- **Alterná los lados.** El objeto se ubica opuesto al texto (`data-x` ±0.15–0.25) para que no se tapen.
- **Una idea por pose.** Perfil puro para las medidas, tres cuartos para la anatomía, contrapicado para el clímax.
- **Que la rotación avance.** Sumá `data-ry` de sección en sección (0 → 0.75 → 2.4 → 3.6 → 6.28) para que el objeto "gire" a lo largo de la página en vez de ir y volver.
- **Revelá una sola vez.** `data-reveal` va de 0 a 1 en una sección alta y pegajosa (`sec--tall` + `sticky`), con un título grande. Es el momento "wow"; no lo diluyas.
- **Poses de móvil**: `data-m-y`, `data-m-scale`. En móvil el objeto va centrado arriba y el texto abajo. Un objeto largo parado (`rz` 90°) no entra en un celular: en móvil acostalo (`data-m-rz` de 0 a 0,3) y compactá las listas largas para que el panel de texto no lo tape.

### Fase 6 — Contenido, tipografía y detalle

Escribí el contenido real en el tono del concepto y aplicá la checklist de pulido de `references/art-direction.md`: jerarquía tipográfica de tres familias, mono en mayúsculas con tracking para los datos, `tabular-nums` en los números, `text-wrap: balance` en los títulos, hover solo con `(hover: hover)`, `prefers-reduced-motion`, loader con progreso real e i18n con `data-i18n`.

### Fase 7 — Rendimiento y QA

Seguí `references/performance.md`:
- Presupuesto: modelo menor a 4 MB, menos de 6 MB en total la primera vez, 60 fps en una laptop integrada y más de 30 fps en un celular de gama media.
- Abrí la página en el navegador, recorré cada sección con capturas en escritorio (1440×900) y en móvil (375×812), y revisá la consola. Si el navegador de pruebas está en segundo plano, los rAF van a ~1 fps y las capturas muestran estados intermedios: abrí con `?debug` y llamá `__settle()` después de cada scroll para saltar a la pose final. Si cambiaste archivos y no se ven los cambios, forzá la recarga (`fetch(url, {cache:'reload'})` de cada archivo y luego `location.reload()`).
- Verificá: que no aparezca texto montado sobre el objeto, que las cotas coincidan con el modelo, que los callouts apunten a la parte correcta, que el loader llegue al 100 % y que el cambio de colorway sea suave.

## Principios para ajustar (cuando algo "no se ve premium")

- **Se ve plástico o lavado** → metalness en 0, roughness alta, bajá `envMapIntensity` y revisá que la textura esté en `SRGBColorSpace`.
- **Se ve plano** → subí el contraluz (rim), agregá la sombra de contacto y bajá el FOV (30° o menos se ve más "producto").
- **Las líneas del wireframe son ruido** → usá una malla de wire más decimada (2–8 k triángulos) o `wireMode: 'edges'`.
- **El movimiento se siente barato** → bajá la constante de amortiguación (6 → 4), usá smoothstep entre anclas y evitá que el objeto cambie de lado y rote mucho a la vez.
- **Se ve "template"** → falta concepto: detalles diegéticos (números de lámina, revisiones, códigos de artículo), datos reales y una tipografía con carácter.
- **Tarda en cargar** → aplicá Meshopt, texturas WebP de 2 k, `preload` del glb en el `<head>` y `modulepreload` de Three.

## Archivos de esta skill

- `references/3d-capture.md` — fotogrametría y escaneo: equipo, luz, toma de fotos, apps, procesado, limpieza en Blender y problemas típicos.
- `references/3d-alternatives.md` — sin escaneo: IA image-to-3D, modelado en Blender, CAD, compra/licencias y objetos procedurales con impacto.
- `references/asset-pipeline.md` — optimización con gltf-transform, malla de wire, presupuestos y escala real.
- `references/rendering.md` — luces, environment, tone mapping, sombras y corrección de materiales.
- `references/shaders.md` — cómo funcionan los parches de shader (revelado, fantasma, colorway, brillo de borde) y efectos alternativos según el objeto: llenado, corte de sección, despiece, nube de puntos, escaneo láser, disolución y pintura progresiva.
- `references/choreography.md` — sistema de poses, interpolación, drag, turntable y móvil.
- `references/art-direction.md` — conceptos visuales, tipografía, cuadrícula, microinteracciones y checklist de pulido.
- `references/performance.md` — carga, presupuestos, GPU de celulares, accesibilidad y QA.
- `scripts/prepare-model.sh` — optimiza un modelo y genera la malla de wire.
- `assets/template/` — proyecto base funcionando.
- `assets/examples/stratocaster/` — ejemplo con un modelo **descargado** (Sketchfab, CC BY): orientación, `keepPbr`, `recolorOnly`, plano en modo `edges`, concepto "lámina de patente → escenario" (tinta sobre papel que pasa a escenario oscuro), guitarra parada con `data-rz` para la anatomía y créditos de licencia. El README explica cómo conseguir el modelo.
- `assets/examples/gameboy/` — ejemplo completo con un objeto armado por código (Game Boy original): piezas en milímetros reales, despiece por pieza, una pantalla LCD en canvas que se enciende con `data-screen`, colorways solo en la carcasa y un concepto propio (plano técnico + manual de 1989). Usalo como referencia cuando no haya modelo 3D.
