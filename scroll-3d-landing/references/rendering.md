# Render: que el 3D parezca una foto de producto

## Renderer
```js
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); // 3x on phones = 2.25x the cost, no visible gain
renderer.toneMapping = THREE.NeutralToneMapping;      // r162+. Respects the scan's colours
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```
- **NeutralToneMapping** (de Khronos) está pensado para productos: mantiene el tono y la saturación de la textura. `ACESFilmicToneMapping` es más "cinematográfico", pero vuelve amarillos los blancos y desatura; usalo solo si el concepto es oscuro y dramático. `AgXToneMapping` queda en el medio.
- `alpha: true` y fondo transparente: así el fondo es CSS (cuadrícula, papel) y puede animarse sin tocar el 3D.

## Iluminación de estudio (3 puntos + entorno)

| Luz | Tipo | Posición relativa | Intensidad | Color | Función |
|---|---|---|---|---|---|
| Key | Directional + sombra | arriba-derecha-frente (2.2, 5.5, 3.2) | 2.0 | cálido #fffaf2 | Forma y sombra |
| Fill | Directional | izquierda-frente (-4, 1.5, 3) | 0.45 | frío #e8eeff | Abre las sombras; el contraste cálido/frío da volumen |
| Rim | Directional | atrás-izquierda (-3, 3, -4) | 0.9 | cálido #fff1dc | **Recorta la silueta del fondo**: el detalle más "premium" |
| Hemisphere | Hemi | — | 0.55 | cielo blanco / piso beige | Rebote del piso: los blancos no quedan planos |
| Environment | `RoomEnvironment` vía PMREM | — | 0.75–1.1 | — | Reflejos suaves sin descargar un HDR |

- **La key sigue al objeto**: copiá `base.position` a la luz y a su target en cada frame, y ajustá el frustum de la sombra a la escala. Si no, cuando el objeto se mueve hacia un costado la sombra se corta o pierde resolución.
- Si querés un HDR real (más realista con metal o vidrio), usá uno de estudio de Poly Haven de 1 k en `.hdr` (con `RGBELoader`) o mejor en `.exr` o KTX2, más `scene.environmentRotation` para orientarlo. 1 k alcanza para reflejos difusos.

## Sombras: dos capas
1. **Sombra de contacto falsa**: un plano con textura de gradiente radial en canvas, justo debajo del objeto. Es barata, siempre se ve suave y da "apoyo". Su opacidad sube en la fase sólida.
2. **Sombra real** de la key sobre un plano invisible con `ShadowMaterial` (solo dibuja la sombra). Con `shadow.radius` 4–8 y `blurSamples` 16, más `normalBias` 0.02 para evitar el acné.

En la fase de plano (wireframe), las sombras van en 0: un dibujo no proyecta sombra. Mostralas recién cuando aparece el material: es parte de la narrativa.

## Corregir los materiales del modelo
Los escaneos y los modelos generados por IA traen errores típicos:
- **Metalness falso** → el cuero o la goma parecen cromados o plásticos. Usá `metalness = 0` y `metalnessMap = null` salvo en las piezas metálicas reales. Para conservar el PBR de una pieza, marcala con `material.userData.keepPbr = true`.
- **Roughness muy bajo** → brillos de plástico. Usá 0.75–1 para tela y cuero, 0.5–0.7 para cuero liso y 0.2–0.4 para charol o plástico brillante.
- **La textura no está en sRGB** → los colores se ven lavados. Los mapas de color van en `SRGBColorSpace`; normal, roughness y AO van en lineal (GLTFLoader ya lo hace bien con glb).
- `anisotropy` al máximo en el mapa de color: nitidez en ángulos rasantes sin costo visible.
- `side = FrontSide` (con `DoubleSide` el costo se duplica y aparecen artefactos de sombra), salvo en mallas abiertas como una prenda.

## Cámara
- **FOV de 25–35°**, lejos (z de 5 a 7). Un FOV bajo aplana la perspectiva y se ve como una foto de producto con teleobjetivo. Un FOV de 50–75° deforma y se ve "videojuego".
- La cámara queda fija. Lo que se mueve es el objeto (jerarquía base → pitch → yaw), así las luces y la sombra se comportan de forma predecible.

## Materiales especiales
- **Vidrio**: `MeshPhysicalMaterial({ transmission: 1, thickness, ior: 1.5, roughness: 0.05 })`. Necesita algo detrás para refractar; con fondo transparente, poné un plano con la cuadrícula dentro de la escena.
- **Tela o terciopelo**: `sheen: 1, sheenRoughness: 0.5, sheenColor`.
- **Pintura de auto o laca**: `clearcoat: 1, clearcoatRoughness: 0.05`.
- **Metal anodizado**: `metalness: 1, roughness: 0.35` y color. Se ve bien solo con environment.
