# Dirección de arte: lo que separa "premium" de "template"

Contenido:
1. Elegir un concepto (menú)
2. Traducir el concepto a cada capa
3. Tipografía
4. Color
5. Cuadrícula y alineación a la línea base
6. Microinteracciones y movimiento de UI
7. Contenido y redacción
8. Checklist de pulido

---

## 1. Elegir un concepto

Un concepto es **una metáfora que explica cada decisión**. En toppervenom el concepto es "un plano técnico que se vuelve objeto", y por eso existen la cuadrícula, las cotas, la tipografía mono, la "lámina 01 de 07", el loader "PLOTTING DRAWING Nº 01" y el rail "REV. 0 — BLUEPRINT". Sin concepto, los mismos efectos se ven como una demo de Three.js.

Elegí según el objeto y su historia (o proponé 2 o 3 al usuario con una línea cada uno):

| Concepto | Para | Fondo | Paleta | Tipografías | Tratamiento 3D | Detalles diegéticos |
|---|---|---|---|---|---|---|
| **Lámina de patente → escenario** | Instrumentos, herramientas e inventos con una fecha de origen | Papel crema con fibra, doble marco y "Fig. 1" → negro con un foco cálido | Tinta + un acento cálido (ámbar) | Serif display + grotesca + mono | Líneas de tinta (`wireColors`) → sólido bajo luz de escenario; borde ámbar en el corte | Fig. N en el rail, "Entintando la lámina", lugar y año en la esquina, créditos |
| **Plano técnico** | Todo lo diseñado o fabricado: calzado, autos, herramientas, muebles, gadgets | Cuadrícula azul (blueprint) → papel | Azul plano, papel cálido, tinta | Serif display + grotesca + mono | Wire + fantasma → sólido | Lámina Nº, revisiones, cotas, cuadro de rótulo, código de artículo |
| **Ficha de museo** | Arte, antigüedades, piezas históricas, instrumentos | Blanco hueso o gris galería, sin cuadrícula | Neutros + un acento | Serif clásica + sans fina | Iluminación de vitrina (key cenital), giro lento | Nº de inventario, procedencia, técnica, "Sala 3", ficha catalográfica |
| **Laboratorio / spec sheet** | Tecnología, audio, wearables, cosmética activa | Negro o gris muy oscuro, con retícula de puntos | Grises + un neón (verde, naranja) | Grotesca técnica + mono | Escaneo láser (banda de color), despiece | Lecturas en tiempo real, IDs de lote, "TEST 04/12", barras de medición |
| **Catálogo de época** | Productos vintage, reediciones, marcas con historia | Papel envejecido, grano, tramas de impresión | Tintas planas limitadas (2–3 Pantone) | La tipografía del catálogo original o una similar | Sólido con un leve "halftone" en la sombra | Precio de época, códigos, sellos, numeración de página |
| **Editorial de moda** | Indumentaria, accesorios, joyas, perfume | Color plano saturado o foto desenfocada | Monocromo + un color de temporada | Display de alto contraste, sans geométrica | Primeros planos extremos, lento, luz dura de flash | Temporada, look Nº, créditos de styling |
| **Bodega / origen** | Vino, café, aceite, alimentos, artesanías | Textura natural (papel de algodón, lino) | Tierra + uno vivo | Serif con caracter, manuscrita mínima | Llenado de abajo hacia arriba, corte de sección | Añada, parcela, altitud, mapa, notas de cata |
| **Maqueta de arquitectura** | Inmuebles, edificios, interiores, terrenos | Blanco maqueta, gris cemento | Blancos + madera + verde | Grotesca + mono | Corte por pisos, maqueta blanca → material | Plantas, norte, escala 1:100, superficies |
| **Juguete / pop** | Juguetes, consumo joven, apps | Color saturado, formas redondeadas | 3–4 colores primarios | Display redondeada pesada | Rebotes (spring con overshoot), toon | Stickers, números grandes, "¡NUEVO!" |

Si nada de esto calza, construí uno con la pregunta **"¿en qué documento o lugar viviría este objeto?"** (un manual, un catálogo, una vitrina, una ficha de laboratorio, un menú, un expediente) e imitá ese documento con rigor.

## 2. Traducir el concepto a cada capa

Para cada capa, decidí cómo habla el concepto:
- **Loader**: el texto cuenta el concepto ("TRAZANDO LÁMINA Nº 01", "CALIBRANDO SENSOR", "ABRIENDO VITRINA") y la barra es fina, de 1 px. El porcentaje es real.
- **Fondo**: CSS puro (gradientes, cuadrículas), no imágenes. Si cambia de estado (cuadrícula → papel), que coincida con el momento del revelado.
- **Rail de progreso**: con lenguaje del concepto ("REV. 3 — MATERIAL", "SALA 2", "PASO 3 DE 6").
- **Overlays SVG**: cotas en plano técnico, etiquetas de inventario en museo, lecturas numéricas en laboratorio.
- **Botones y selector**: el selector de variantes con muestras reales del material (un círculo partido en dos colores).
- **Cierre**: el loop de vuelta ("Volver a la lámina 01") cierra el concepto.

## 3. Tipografía

**Tres familias, tres roles**, siempre:
1. **Display** (títulos): con carácter, en tamaño enorme (`clamp(56px, 9vw, 148px)`), `line-height` de .9–.95 y `letter-spacing` de -0.03 a -0.045em. Una palabra en *itálica* para el contraste.
2. **Texto**: una grotesca neutra de 15–20 px, `line-height` 1.5–1.6, color atenuado (72 % de opacidad) para jerarquía.
3. **Datos**: mono en MAYÚSCULAS de 10.5–12 px con `letter-spacing` de .08em. Todo lo que es dato, código o etiqueta va acá.

Fuentes gratuitas que funcionan:
- Display: Instrument Serif, Fraunces, Playfair Display, PP Editorial (paga), Geist Serif.
- Texto: Geist, Inter, Manrope, General Sans.
- Mono: Geist Mono, JetBrains Mono, IBM Plex Mono, Space Mono.

Detalles que se notan:
- `font-variant-numeric: tabular-nums` en todos los números que cambian (contadores, medidas).
- `text-wrap: balance` en los títulos y `pretty` en los párrafos.
- `font-display: swap` + `preload` de los woff2 (self-hosted en producción) para evitar el salto de fuente.
- Variable fonts: un solo archivo con todos los pesos.

## 4. Color

- **Nunca blanco ni negro puro**: el papel va en #f3f1ea o #f4f2ec y la tinta en #0c0c0d. Lo puro se ve "pantalla"; lo cálido se ve "objeto".
- 2 colores de base + 1 de acento. El acento puede venir del objeto (el rojo de un logo, el verde de una etiqueta).
- El texto cambia con el fondo mediante variables (`--fg`, `--fg-dim`, `--rule`) que se intercambian con una clase en `body`: un solo lugar para controlar el tema.
- Las variantes del objeto pueden cambiar el tema de la UI: en toppervenom, "Blackout" vuelve oscura toda la página.

## 5. Cuadrícula y alineación a la línea base

- La cuadrícula del fondo (24 px fina + 120 px mayor) no es decoración: **el contenido se alinea a ella**. Los callouts van en filas de 72 px (3 celdas) y los márgenes son múltiplos de 24.
- **Avanzado** (lo que hace toppervenom con `grid-snap.js`): un script que mide la línea base de cada texto (insertando un `<span>` de 0×0 con `vertical-align: baseline`) y agrega `padding-top` para que caiga en una línea de 24 px. Las alturas de los bloques se redondean a celdas enteras y el scroll se asienta en pasos de 24 px (`scroll-snap`). Hacelo solo si el concepto es de plano técnico y hay tiempo: es un detalle invisible que se *siente*.
- En lo cotidiano, alcanza con que paddings, gaps y alturas sean múltiplos de 8 o 12.

## 6. Microinteracciones y movimiento de UI

- **Curvas**: `cubic-bezier(0.23, 1, 0.32, 1)` para entradas (rápido al principio, asentamiento largo) y `(0.77, 0, 0.175, 1)` para movimientos de ida y vuelta.
- **Entrada de texto**: opacidad 0→1, `translateY(14px)` → 0 y `blur(4px)` → 0, en 700 ms, escalonado 60 ms por elemento. El blur vende el "enfoque".
- **Contadores** que suben con ease-out en 1.3 s, al entrar en pantalla, con el valor tomado del modelo.
- **Barras o gráficos** que crecen con `scaleX/scaleY` desde 0 (transform, nunca width).
- **Botones**: `:active { transform: scale(.97) }` en 160 ms. El hover solo con `@media (hover: hover) and (pointer: fine)` para que en el celular no queden "pegados".
- **Selector tipo pill**: un elemento que se desliza (`translateX` + `width`) bajo el tab activo, recalculado con `ResizeObserver`, porque las fuentes tardías cambian los anchos.
- **Paneles con `backdrop-filter: blur(8–10px)`** y fondo al 80 % sobre el 3D: legibilidad sin tapar.
- Todo lo que se anima usa `transform` u `opacity` (compositor), salvo el blur de entrada, que dura poco.

## 7. Contenido y redacción

- **Datos reales y específicos** ("Nº 141000", "UK 5–13½", "EVA con tecnología TRIAD"). La especificidad es lo que hace creíble una página así. Si el usuario no tiene datos, pedilos; no inventes especificaciones de un producto real (si son de relleno, marcalos claramente).
- **Medidas desde el modelo**: si mostrás dimensiones, que salgan del 3D escalado (`realSizeCm`), no a ojo.
- **Títulos cortos y declarativos** ("Empieza como un dibujo.", "La línea se vuelve material."), con punto final, en el tono del concepto.
- **Créditos**: diseñador original, fotógrafo, quien escaneó. Dan autenticidad y son lo correcto.
- **Bilingüe**: atributos `data-i18n="clave"` y `data-i18n-attr="aria-label:clave"`, con un diccionario `{es:{}, en:{}}` en un script clásico que corre antes del módulo, y la preferencia guardada en `localStorage`. Al cambiar de idioma, disparar un evento `langchange` para que el JS reescriba los textos del SVG y recalcule los anchos.

## 8. Checklist de pulido

- [ ] Hay un concepto nombrable en una frase, y cada elemento de UI lo refuerza
- [ ] Tres familias tipográficas con roles claros; mono para todos los datos
- [ ] Sin blancos ni negros puros; 2 + 1 colores
- [ ] El texto nunca queda encima del objeto en ninguna pose (revisalo en 1440×900, 1280×720 y 375×812)
- [ ] El loader usa el lenguaje del concepto y muestra el progreso real
- [ ] Hay un único momento "wow" (sección alta y sticky)
- [ ] Hover solo en punteros finos; `:active` en todo lo clicable; `:focus-visible` visible
- [ ] `tabular-nums` en los números; `text-wrap: balance` en los títulos
- [ ] Los números y medidas salen del modelo o de datos reales
- [ ] OG image de 1200×630 con el objeto sobre el fondo del concepto
- [ ] Favicon y título con el nombre del objeto
