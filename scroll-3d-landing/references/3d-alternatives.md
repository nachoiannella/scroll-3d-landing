# Conseguir un 3D con impacto sin escanear

Contenido:
1. Elegir el camino
2. IA image-to-3D
3. Modelar en Blender (por tipo de forma)
4. CAD del fabricante
5. Comprar o descargar con licencia
6. Objetos procedurales y estilizados en Three.js
7. Cómo hacer que un modelo "mediocre" se vea premium

---

## 1. Elegir el camino

| Situación | Camino | Tiempo | Calidad posible |
|---|---|---|---|
| Hay 1–20 fotos buenas del producto | IA image-to-3D + limpieza | 30 min – 3 h | Media-alta (mejora mucho con buena textura) |
| Forma geométrica o de revolución (botella, lata, vaso, lámpara, perfume) | Modelar en Blender | 1–4 h | **Muy alta**: perfecta y liviana |
| Forma orgánica compleja (zapatilla, auto, animal) sin el objeto | IA, compra o modelado por un profesional | variable | Alta si se paga a un modelador |
| Existe CAD (electrónica, muebles, autopartes) | Convertir STEP → malla + materiales | 1–3 h | Muy alta en geometría |
| Producto genérico (auricular, silla, celular) | Marketplace | 15 min | Alta, pero no es tu producto |
| No hay nada o el concepto es abstracto | Procedural o estilizado | 1–3 h | **El impacto viene del concepto, no del realismo** |

Mientras el usuario consigue el modelo final, arrancá con un proxy (un objeto procedural o un glb de prueba). La plantilla funciona con cualquier .glb, así que el modelo se puede cambiar al final.

## 2. IA image-to-3D

**Herramientas** (el mercado cambia rápido; verificá precios y licencias actuales):
- **Meshy** — imagen o texto → 3D, con texturizado PBR, remesh y descarga en glb. Web y API.
- **Tripo (Tripo3D)** — muy buena geometría, multivista y retopología automática.
- **Rodin (Hyper3D)** — alta calidad, acepta varias imágenes y genera quads.
- **Hunyuan3D** (Tencent) — open source, se puede correr local con una GPU de 12 GB o más, o usar online.
- **TRELLIS** (Microsoft) — open source, bueno con geometría compleja.
- **Stable Fast 3D / SPAR3D** (Stability) — rápidos, de calidad media.

**Cómo sacarle el máximo:**
1. **La imagen de entrada lo es todo:** el objeto solo, sobre fondo blanco o gris liso, con luz pareja, en vista 3/4 o de perfil, nítido y en alta resolución. Recortalo antes de subirlo (fondo transparente).
2. **Multivista:** si la herramienta lo acepta, subí frente, perfil, espalda y 3/4. Mejora mucho la parte de atrás, que si no la IA "inventa".
3. Generá 3–4 variantes y quedate con la mejor geometría, aunque su textura sea peor.
4. **Retexturizá:** la geometría de la IA suele ser aceptable, pero la textura es su punto débil (borrosa, con luz horneada, con texto deformado). En Blender, proyectá las fotos reales sobre el modelo (`Texture Paint` → `Project from View`, o el addon gratuito *Project Paint*), o usá la función de retexturizado de la misma herramienta.
5. **Corregí a mano** los logos, textos y simetrías: rehacé los decals como planos con textura PNG encima de la malla.
6. Retopologizá o decimá a 50–200 k (la IA suele entregar mallas trianguladas desprolijas).
7. Siempre `metalness = 0` salvo en las partes metálicas reales; la IA suele poner valores incorrectos.

**Límites honestos:** el texto, los logos, las costuras finas, la simetría exacta y las partes ocultas son débiles. Para una web que muestra medidas reales, avisale al usuario que las dimensiones del modelo generado son aproximadas; la escala se ajusta con `realLengthCm`.

## 3. Modelar en Blender (por tipo de forma)

**Preparación común:** cargá fotos o planos de referencia en vistas ortogonales (`Add → Image → Reference`) en frente, perfil y arriba, a escala real. Configurá las unidades en metros.

### Objetos de revolución (botellas, latas, frascos, vasos, lámparas)
1. Dibujá **medio perfil** como curva o vértices sobre la foto de perfil.
2. Modificador **Screw** (360°, 64–128 pasos) y luego **Subdivision Surface** nivel 1–2.
3. **Solidify** si tiene espesor (vidrio).
4. Etiqueta: un cilindro separado ligeramente más grande, con UV cilíndrica y la textura del diseño.
5. Resultado: perfecto, liviano (menos de 20 k triángulos) y con UV limpias, ideal para revelado y colorways.

> También se puede hacer directo en Three.js con `LatheGeometry` (ver sección 6).

### Productos de caja (electrónica, packaging, celulares, parlantes)
1. Cubo → `Bevel` (de 2 a 4 segmentos, para que los bordes atrapen la luz) → cortes con booleanas para botones y puertos.
2. Los biseles son **el** detalle que vuelve premium un objeto duro: nunca dejes aristas a 90° perfectas.
3. Texturas: color base, más un mapa de roughness para alternar mate y brillante, más un normal map para los grabados.

### Objetos orgánicos (zapatillas, ropa, asientos)
- Lo más rápido es modelar a partir de una malla base comprada o hecha con IA y esculpir los detalles.
- Una zapatilla hecha a mano son 15–40 h de un modelador con experiencia. Si el presupuesto lo permite, es la opción con mejor resultado sin el objeto físico. Se contrata por ArtStation, Fiverr o Upwork; pedí glb con texturas PBR, menos de 200 k triángulos y UV sin solapamientos.

### Logo, ícono o tipografía 3D
- Importá el SVG (`File → Import → SVG`) → `Extrude` + `Bevel` en la curva → convertí a malla.
- O directo en Three.js con `SVGLoader` + `ExtrudeGeometry` (sección 6).

## 4. CAD del fabricante (STEP, IGES, SolidWorks, Fusion)

1. Convertí STEP → malla con **FreeCAD**, **Fusion** (exporta OBJ/FBX), **Blender + el addon STEPper** o **CAD Assistant** (gratis, de Open Cascade), con la tolerancia de teselado alta (0.1 mm).
2. Los CAD traen miles de piezas internas: borrá todo lo que no se ve desde afuera.
3. Normales: aplicá `Shade Auto Smooth` (de 30 a 40°) para que las superficies curvas no se vean facetadas.
4. Materiales: el CAD casi nunca trae texturas. Asigná materiales PBR por pieza (plástico mate, metal anodizado, goma) y agregá un normal map sutil con ruido o grano para que no parezca un render de ingeniería.
5. **Ventaja enorme para esta web:** las piezas separadas permiten una vista **explosionada** animada por scroll. Mové cada pieza a lo largo de su normal según un uniform o una propiedad de la coreografía.

## 5. Comprar o descargar con licencia

- **Fab** (de Epic, unifica Sketchfab Store, Quixel y Unreal Marketplace), **CGTrader**, **TurboSquid**, **Poly Haven** (CC0, sin productos de marca).
- Revisá la **licencia**: hay que poder usarlo comercialmente en la web y ver si permite modificaciones. Las marcas registradas (Nike, Coca-Cola…) en un modelo comprado **no** te dan derecho a usar la marca.
- Filtrá por: formato glTF o FBX, PBR, triángulos (menos de 300 k), "scanned" si querés realismo.
- No uses modelos con licencia "editorial only" para una landing comercial.

## 6. Objetos procedurales y estilizados en Three.js

Si no hay modelo, el impacto puede venir de un **render estilizado** que sea parte del concepto. Todos estos se pueden enchufar a la plantilla en lugar del glb: reemplazá `buildFallback()` en `main.js`.

### Revolución desde un perfil
```js
// half-profile in metres: [radius, height]
const profile = [[0,0],[0.034,0],[0.036,0.004],[0.036,0.16],[0.03,0.19],[0.013,0.215],[0.013,0.24],[0,0.24]]
  .map(([r, y]) => new THREE.Vector2(r, y));
const geo = new THREE.LatheGeometry(profile, 96);
geo.computeVertexNormals();
const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
  color: 0x1f3b2c, roughness: 0.08, transmission: 0.85, thickness: 0.004, ior: 1.5,
}));
```

### Logo o pieza a partir de un SVG
```js
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
const data = await new SVGLoader().loadAsync('logo.svg');
const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
const geo = new THREE.ExtrudeGeometry(shapes, { depth: 40, bevelEnabled: true, bevelThickness: 4, bevelSize: 3, bevelSegments: 4 });
geo.center(); geo.scale(0.01, -0.01, 0.01); // SVG y-axis points down
```

### Nube de puntos que "se condensa" en el objeto
`MeshSurfaceSampler` (en `three/addons/math/MeshSurfaceSampler.js`) toma 50–200 k puntos de la superficie de cualquier malla, incluso de una de baja calidad. Animá desde posiciones aleatorias hasta la superficie con un uniform de progreso: `mix(randomPos, surfacePos, smoothstep(...))`. Queda espectacular como reemplazo del wireframe y disimula una malla imperfecta.

### Line-art y plano técnico sin textura
- `EdgesGeometry(geo, 25)` → solo las aristas "de dibujo" (las que superan 25° de ángulo).
- Sumá la superficie fantasma con fresnel (ver `shaders.md`) y las cotas SVG. **Un objeto de baja calidad dibujado como plano técnico se ve intencional.**

### Matcap o toon
- `MeshMatcapMaterial` con un matcap de estudio da look de cerámica o arcilla premium, sin luces ni texturas.
- `MeshToonMaterial` + contorno (casco invertido con `BackSide`) da un look de ilustración.

### Objeto completo armado por piezas (ver `assets/examples/gameboy/`)
Para objetos industriales (consolas, cámaras, radios, electrodomésticos, muebles) se puede construir el objeto entero en Three.js, sin Blender. El resultado se ve muy bien en plano técnico porque las aristas son limpias.
1. **Trabajá en las unidades reales** (mm) a partir de medidas públicas o de una foto frontal con escala. El motor normaliza el tamaño, y las cotas salen exactas.
2. **Cada pieza es una malla**: carcasa delantera y trasera, botones, pantalla, placa y pilas. Así hay despiece (`userData.explode = [x,y,z]` en mm), materiales propios y callouts precisos (`p: [x,y,z]`).
3. **Formas**: `Shape` + `ExtrudeGeometry` con bisel para carcasas y paneles (radios distintos por esquina, si la forma lo pide); `LatheGeometry` para botones abombados; `CapsuleGeometry` para teclas tipo píldora; cajas finas para ranuras y líneas.
4. **Pantallas, etiquetas y displays**: un `<canvas>` como `CanvasTexture` (con `NearestFilter` si es pixel art). Dibujalo de nuevo solo cuando cambia, y conectalo a una clave de sección (`extraKeys` + `onFrame`) para que se "encienda" con el scroll.
5. **Colorways solo donde corresponde**: marcá con `userData.noRecolor` todo lo que no cambia de color entre ediciones (pantalla, botones, placa).
6. **Piezas internas**: no hace falta ocultarlas. El prepass de profundidad del plano dibuja solo la superficie exterior, y adentro aparecen recién en el despiece.
7. **Propiedad intelectual**: reproducí la forma con fines de homenaje o historia, pero no copies logos, tipografías de marca ni arte de juegos. Usá arte original y agregá un aviso ("proyecto no oficial; X es marca de Y").

## 7. Cómo hacer que un modelo "mediocre" se vea premium

1. **Presentación antes que fidelidad:** fondo con concepto, cuadrícula, cotas y tipografía. El ojo lee "diseñado", no "low-poly".
2. **Ocultá los defectos con el estilo:** si la textura es mala, quedate más tiempo en el wireframe o el fantasma y revelá el sólido solo en poses lejanas.
3. **Luz de contorno (rim) fuerte y sombra de contacto:** dan volumen y "apoyo" a cualquier objeto.
4. **Cámara con FOV bajo** (20–30°): aplana la perspectiva, se ve como foto de producto y esconde las proporciones dudosas.
5. **Movimiento lento y amortiguado:** lo pesado se ve caro.
6. **Una sola paleta reducida** (2 colores + 1 acento).
7. **Detalle en 2D, no en 3D:** los logos, etiquetas y datos van en el overlay SVG o HTML, con nitidez perfecta, en lugar de en la textura.
