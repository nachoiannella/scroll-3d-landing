# Shaders: los efectos que justifican el 3D

Contenido:
1. La idea central: un "espacio fuente" y un plano que barre
2. Parchear materiales de Three.js con onBeforeCompile
3. Los cuatro materiales de la plantilla
4. Efectos alternativos (elegí según el objeto)
5. Problemas típicos

---

## 1. La idea central

Todos los efectos de revelado se reducen a una función por píxel: **¿de qué lado de un plano estoy?**

```glsl
float sweepDist() { return dot(vSrc, uDir) - uSweep; }   // >0 still blueprint, <0 already solid
```
- `vSrc` es la posición del vértice en el **espacio fuente** del modelo (sus coordenadas originales, antes de normalizar, rotar o mover). Por eso el corte queda "pegado" al objeto aunque gire o se mueva por la pantalla.
- Cada malla lleva un uniform `uNodeMat` con su matriz nodo→fuente, porque un glb puede tener muchas mallas con transformaciones propias.
- `uSweep` se anima de `min` a `max` de la proyección de las 8 esquinas de la caja sobre `uDir`. Así 0 = todo plano y 1 = todo sólido, para cualquier forma.

El **sólido** descarta los píxeles con `sd > 0`, y el **wire** y el **fantasma** descartan los que tienen `sd < 0`. Son complementarios: en todo momento se ve una parte dibujada y una parte material, separadas por un borde brillante.

## 2. Parchear materiales de Three.js

No reescribas el material PBR: **inyectá código en el shader que genera Three.js** y conservás gratis luces, sombras, environment y texturas.

```js
material.onBeforeCompile = (shader) => {
  Object.assign(shader.uniforms, U, { uNodeMat: { value: nodeMat } }); // shared uniforms: changing U.x.value updates every material
  shader.vertexShader = HEAD + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vSrc = (uNodeMat * vec4(transformed,1.)).xyz;');
  shader.fragmentShader = HEAD + shader.fragmentShader
    .replace('#include <map_fragment>', CUSTOM_COLOUR)          // after sampling the texture
    .replace('#include <clipping_planes_fragment>', '... discard ...') // at the start of main()
    .replace('#include <emissivemap_fragment>', '... totalEmissiveRadiance += ...'); // glowing edge
};
```

Puntos de inyección útiles en `MeshStandardMaterial` y `MeshPhysicalMaterial`:

| Chunk | Para qué |
|---|---|
| `#include <begin_vertex>` | `transformed` = posición local. Para posición fuente, desplazamientos y despiece en GPU |
| `#include <clipping_planes_fragment>` | Inicio del fragment: `discard` temprano |
| `#include <map_fragment>` | `diffuseColor` ya tiene la textura: recoloreo, máscaras, "pintura" progresiva |
| `#include <roughnessmap_fragment>` | Modificar `roughnessFactor` (por ejemplo, una zona mojada) |
| `#include <emissivemap_fragment>` | Sumar a `totalEmissiveRadiance`: bordes que brillan, escaneo láser |

Los nombres de los chunks pueden cambiar entre versiones de Three. Por eso la plantilla fija la versión en el importmap. Si actualizás, verificá que cada `replace` siga encontrando su texto: un `replace` que no encuentra nada falla en silencio y el efecto simplemente no aparece.

Clonar el material por malla es obligatorio si cada una tiene su propio `uNodeMat`. Varias mallas con el mismo material compartirían el último valor.

## 3. Los cuatro materiales de la plantilla

1. **Sólido parcheado** (el material original del glb): descarte por plano, borde brillante (`emissive` de 3× en una franja de `uEdge`) y recoloreo.
2. **Wire** (`LineSegments` + `ShaderMaterial`): blanco con alfa 0.42, que llega a 1 cerca del corte. `depthWrite: false`, `renderOrder: 2`.
3. **Fantasma** (`Mesh` + `ShaderMaterial`): superficie casi invisible con **fresnel** (`pow(1 - |N·V|, 2.2)`), que da el contorno de un dibujo. **Escribe profundidad** (`polygonOffset` para no pelearse con las líneas), así tapa las líneas de atrás y el dibujo se lee limpio. Este es un detalle clave: un wireframe "transparente" muestra las líneas de adelante y de atrás a la vez y se vuelve ilegible.
4. **Prepass de profundidad (oclusor)**: una copia de cada malla del plano con `colorWrite: false`, opaca y con el mismo `polygonOffset` que el fantasma. Se dibuja antes que todo lo transparente y deja en el depth buffer solo la superficie más cercana, así se dibuja únicamente lo visible, como en un plano real. Sin este paso, los fantasmas de las piezas internas (pilas, placas) se suman por transparencia y se ven a través de la carcasa.
5. **Recoloreo por luminancia**: la luminancia perceptual (`pow(lum, 1/2.2)`) va a una rampa `dark → light`, con una leve modulación para conservar el sombreado de la textura, y se protegen los píxeles saturados (`uCwKeep`). Animá `uCwMix`, `uCwDark` y `uCwLight` con lerp exponencial: la transición entre colores es parte del show.

## 4. Efectos alternativos (elegí según el objeto)

Todos usan la misma infraestructura (`vSrc`, uniforms compartidos y un valor de 0 a 1 en la coreografía). Agregá la clave a `KEYS` en `main.js` y un `data-<clave>` en las secciones.

### a) Llenado de abajo hacia arriba (botellas, vasos, edificios)
`sweepDir: [0, 1, 0]`. Para un efecto de líquido, ondulá el plano:
```glsl
float sd = vSrc.y - uSweep + sin(vSrc.x * 40.0 + uTime * 2.0) * 0.004 + sin(vSrc.z * 33.0 - uTime * 1.6) * 0.003;
```

### b) Corte de sección (arquitectura, máquinas, frutas, cualquier cosa con interior)
Descartá un lado del plano y pintá la cara del corte. Las caras traseras (`side: DoubleSide`) quedan expuestas por el corte y se pintan de color sólido:
```glsl
if (sd > 0.0) discard;
if (!gl_FrontFacing) { gl_FragColor = vec4(uCapColor, 1.0); return; }   // in MeshBasic; in Standard, set diffuseColor and emissive
```
Sumale un patrón de rayado diagonal en las caras de corte para un look de plano de arquitectura: `step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 8.0))`.

### c) Despiece / vista explosionada (objetos de varias piezas)
La plantilla ya lo trae: `data-explode` de 0 a 1 y `CONFIG.explodeFactor`. Cada malla se aleja del centro proporcionalmente a su distancia. Para un control más fino (un eje por pieza, un orden de salida), poné en Blender un custom property `explode: [x,y,z]` en cada objeto (llega como `o.userData.explode`) y usalo en lugar del vector automático. Escalonalo por índice para que las piezas salgan en secuencia: `t_i = clamp(cur.explode * 1.5 - i * 0.08, 0, 1)`.

### d) Nube de puntos que se condensa (objetos orgánicos o "inteligentes", o un modelo mediocre)
```js
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
const sampler = new MeshSurfaceSampler(mesh).build();
const N = 60000, target = new Float32Array(N * 3), seed = new Float32Array(N * 3);
const p = new THREE.Vector3();
for (let i = 0; i < N; i++) {
  sampler.sample(p); p.toArray(target, i * 3);
  seed.set([(Math.random() - .5) * 4, (Math.random() - .5) * 4, (Math.random() - .5) * 4], i * 3);
}
// vertex: vec3 pos = mix(aSeed, position, smoothstep(0., 1., uForm - aDelay)); gl_PointSize = 2.0 * (300.0 / -mv.z);
```
Cross-fade con el sólido al final (`uForm` → 1, el sólido aparece por opacidad o con el barrido).

### e) Escaneo láser (gadgets, tecnología)
En lugar de un borde blanco, una banda de color con líneas finas:
```glsl
float band = 1.0 - smoothstep(0.0, 0.04, abs(sd));
float lines = step(0.92, fract(dot(vSrc, uDir) * 400.0));
totalEmissiveRadiance += uScanColor * band * (0.6 + lines * 2.0);
```

### f) Disolución con ruido (orgánico, artesanal)
Sumá ruido 3D al plano para que el borde sea irregular, como papel quemado o pintura: `float sd = sweepDist() + (noise(vSrc * 30.0) - 0.5) * 0.05;`. Hace falta una función de ruido (simplex 3D de Ashima o Stefan Gustavson, de dominio público).

### g) Pintura progresiva (cuadros, objetos con estampado)
Usá el mismo `sd`, pero en lugar de descartar, mezclá la textura con un tono de "boceto" (gris o el color del papel con un hatching): `diffuseColor.rgb = mix(texel, sketch, step(0.0, sd))`.

## 5. Problemas típicos

| Síntoma | Causa | Solución |
|---|---|---|
| El efecto no aparece y no hay errores | Un `replace` no encontró el chunk | `console.log(shader.fragmentShader)` y buscá el chunk; verificá la versión de Three |
| El corte "flota" y no sigue al objeto | Usaste la posición de mundo en lugar de la fuente | Calculá `vSrc` con `uNodeMat` × `transformed` |
| Todas las mallas cortan igual aunque tengan nodos distintos | Material compartido | `o.material = o.material.clone()` |
| Las líneas parpadean contra el fantasma | Z-fighting | `polygonOffset` en el fantasma, `renderOrder` fantasma = 1 y líneas = 2 |
| Wire ilegible ("pelusa") | Malla densa | Malla de wire decimada (2–8 k triángulos) o `EdgesGeometry` |
| La sombra no respeta el corte | El shadow map usa otro material | `mesh.customDepthMaterial` con el mismo `discard` (si hace falta que la sombra crezca con el revelado) |
