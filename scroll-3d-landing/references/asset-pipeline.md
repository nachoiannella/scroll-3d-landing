# Pipeline del asset: del escaneo al .glb para la web

## Presupuestos

| Qué | Objetivo | Máximo | Por qué |
|---|---|---|---|
| Triángulos (malla visible) | 100–200 k | 400 k | Más no se nota a tamaño de pantalla y castiga a los celulares |
| Triángulos (malla de wire) | 2–8 k | 15 k | El wireframe tiene que leerse como un **dibujo**, no como una mancha gris |
| Textura de color | 2048² WebP | 4096² | 4 k solo si el objeto ocupa toda la pantalla en algún momento |
| Normal map | opcional, 2048² | — | Recupera el detalle perdido al decimar (costuras, grano) |
| .glb final | 1.5–4 MB | 6 MB | toppervenom: 3.6 MB de modelo + 0.5 MB de wire |

## Herramienta: gltf-transform (CLI)

No requiere instalación global: `npx @gltf-transform/cli <comando>`.

```bash
# 0. Inspect: triangle count, textures, sizes
npx @gltf-transform/cli inspect input.glb

# 1. Optimise the visible mesh
#    weld + simplify (gentle) + WebP textures + Meshopt compression, all in one
npx @gltf-transform/cli optimize input.glb models/product.glb \
  --compress meshopt \
  --texture-compress webp \
  --texture-size 2048 \
  --simplify-error 0.0005

# 2. Wire mesh: much lighter, no useful textures
npx @gltf-transform/cli weld input.glb /tmp/w1.glb
npx @gltf-transform/cli simplify /tmp/w1.glb /tmp/w2.glb --ratio 0.03 --error 0.01
npx @gltf-transform/cli resize /tmp/w2.glb /tmp/w3.glb --width 8 --height 8   # textures down to almost nothing
npx @gltf-transform/cli meshopt /tmp/w3.glb models/product-wire.glb
```

`scripts/prepare-model.sh` hace todo esto (y convierte OBJ con `obj2gltf`).

**Ojo:** `optimize` también simplifica la malla visible (la guitarra de ejemplo pasó de 373 k a 89 k triángulos sin pérdida visible). Si ves facetas, subí `--simplify-error` o agregá `--simplify false`. La compresión Meshopt **cuantiza** las posiciones (int16 + escala de nodo): el motor ya convierte la geometría a flotantes antes de leer vértices. Si escribís código propio que lea `attributes.position.array`, usá `getX/getY/getZ`.

Para modelos hechos a mano (no escaneos), normalmente conviene saltear el wire y usar `wireMode: 'edges'` (ver SKILL.md, fase 2).

Ajustá `--ratio` del wire mirando el resultado: con `?debug&wire=1` en la plantilla se ve solo el wireframe. Buscá que se distingan las piezas (suela, capellada, cuello) sin que se forme una mancha. En objetos simples, 0.05–0.1; en escaneos densos, 0.01–0.03.

### Formatos de entrada
- **.glb / .gltf** → directo.
- **.obj (+ .mtl + texturas)** → `npx obj2gltf -i model.obj -o model.glb`
- **.fbx / .blend / .usdz / .ply** → abrir en Blender y exportar glTF binario. Desde la terminal:
  `blender -b model.blend --python-expr "import bpy; bpy.ops.export_scene.gltf(filepath='model.glb', export_format='GLB')"`
- **STEP** → ver `3d-alternatives.md` sección 4.

### Compresión: Meshopt vs Draco vs KTX2
- **Meshopt** (recomendado): decodifica muy rápido, el decoder es chico (`meshopt_decoder.module.js` de Three) y también comprime animaciones. La plantilla ya lo trae configurado.
- **Draco**: geometría algo más chica, pero el decoder pesa más (wasm de unos 300 KB) y es más lento. Requiere `DRACOLoader` con la ruta a los decoders.
- **KTX2 / Basis** para texturas: ocupa menos VRAM (clave en celulares con texturas de 4 k), pero requiere `KTX2Loader` más el transcoder wasm. Usalo si hay varias texturas de 4 k; con una sola de 2 k, WebP alcanza.

## Escala, orientación y origen

- glTF usa metros con Y hacia arriba. La plantilla **normaliza** el objeto: centra su caja y escala el lado horizontal más largo a `CONFIG.normLength` (2 unidades). No importa la escala de origen para el render, pero sí para mostrar medidas.
- Las **medidas que muestra la web** salen de `CONFIG.realLengthCm` × las proporciones de la caja del modelo. Si el escaneo está bien proporcionado, el alto y el ancho salen solos y son reales. Es un detalle de credibilidad: los números salen del objeto.
- Si el modelo viene rotado, corregilo en `CONFIG.orient` (radianes) en lugar de reexportar.

## Variantes de color

Hay tres maneras, de menor a mayor fidelidad:
1. **Recoloreo por luminancia en el shader** (lo que hace la plantilla). Los oscuros pasan a `dark` y los claros a `light`, y se preservan los colores saturados. No requiere assets extra y la transición es animable.
2. **Textura de máscara por variante**: un PNG/WebP chico que indica, por zona de UV, qué color lleva cada parte. Es lo que usa toppervenom para la versión azul. Se pinta en Blender (Texture Paint) o en Photoshop sobre el layout de UV.
3. **Texturas completas por variante** (`KHR_materials_variants` en glTF): una textura entera por color. Es la máxima fidelidad, pero multiplica el peso. Cargalas bajo demanda.

## Checklist de salida
- [ ] `models/product.glb` < 4 MB y `models/product-wire.glb` < 600 KB
- [ ] `inspect` sin texturas de más de 4096 ni materiales duplicados
- [ ] Una sola malla o pocas (cada malla es un draw call)
- [ ] Se ve bien en https://gltf-viewer.donmccurdy.com/ (comparalo con el original)
