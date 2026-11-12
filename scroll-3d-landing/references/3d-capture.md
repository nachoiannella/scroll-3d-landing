# Escanear un objeto real para la web (fotogrametría)

Contenido:
1. Qué técnica usar
2. Equipo mínimo y equipo ideal
3. Preparar el objeto
4. La luz (lo que más importa)
5. Cómo sacar las fotos
6. Procesar: apps y software
7. Limpieza y retopología en Blender
8. Problemas típicos y cómo resolverlos
9. Checklist antes de pasar al pipeline

---

## 1. Qué técnica usar

| Técnica | Cómo funciona | Ventajas | Contras | Para esta web |
|---|---|---|---|---|
| **Fotogrametría** | 80–300 fotos desde todos los ángulos; el software triangula la geometría y proyecta la textura | Textura fotográfica real, detalle alto, barata (un celular alcanza) | Sufre con superficies brillantes, negras, transparentes o sin textura | **La opción principal** si tenés el objeto |
| **Escáner de luz estructurada** (Revopoint, Creality, Shining3D, Artec) | Proyecta patrones y mide la deformación | Geometría muy precisa, rápida | Textura pobre, equipo de USD 300 a 20 000+ | Bueno para la geometría; la textura conviene sacarla con fotos |
| **LiDAR del iPhone/iPad Pro** | Sensor de profundidad | Instantáneo | Resolución de centímetros: sirve para habitaciones, **no para productos** | Evitar para objetos chicos |
| **Gaussian Splatting (3DGS)** | Fotos o video → nube de "manchas" | Fotorrealismo extremo, reflejos y pelusa | **No es una malla**: no hay wireframe ni shaders de revelado, y es pesado | Solo si la página es "mirá qué real se ve" y no hay efectos de plano (ver el final del archivo) |

**Regla:** para este tipo de landing necesitás una **malla con UV y textura**. Usá fotogrametría y, si el objeto es difícil, combiná técnicas (geometría por escáner o spray + textura por fotos).

## 2. Equipo

**Mínimo (resultado bueno):**
- Un celular de los últimos 4 años con cámara principal (no la gran angular).
- Un día nublado afuera, o un ambiente con luz muy pareja.
- Una mesa giratoria barata (USD 10–30) o una silla giratoria, o simplemente caminar alrededor.
- Cinta de papel y papel de diario o de seda para rellenar.

**Ideal (resultado de estudio):**
- Cámara con objetivo fijo de 35–50 mm (en full frame), trípode y disparador remoto.
- 2–4 luces LED continuas con softbox o una carpa de luz (light tent).
- **Polarización cruzada:** film polarizador lineal delante de las luces y un filtro CPL en la lente, girado hasta que desaparezcan los brillos. Elimina los reflejos especulares y da un albedo limpio. Es el truco que separa un escaneo amateur de uno profesional.
- Una carta de color (ColorChecker) para calibrar el blanco.
- Marcadores de escala o una regla para la medida real.
- Spray de escaneo que se evapora solo (AESUB Blue/Orange, Attblime) para las zonas brillantes u oscuras.

## 3. Preparar el objeto

- **Limpialo.** El polvo y las pelusas se ven en una textura de 4 k.
- **Dale su forma ideal.** Una zapatilla va rellena de papel y con los cordones atados prolijos; una prenda va estirada y una bolsa, llena. La forma que escanees es la que vas a ver para siempre.
- **Superficies problemáticas:**
  - *Negro brillante, charol, metal cromado, vidrio:* la fotogrametría no encuentra puntos estables. Opción A: polarización cruzada (sirve para el semibrillo). Opción B: spray matificante temporal para la geometría, una segunda sesión sin spray para la textura y proyectar o pintar la textura en Blender. Opción C: modelar esa pieza a mano.
  - *Zonas lisas y sin textura* (plástico blanco liso): agregá textura temporal con talco, spray o puntos de cinta, y retocá la textura después. También podés pasar a modelado.
  - *Transparente:* no se escanea. Modelalo y usá `MeshPhysicalMaterial` con `transmission`.
- **Fondo:** si usás mesa giratoria, el fondo tiene que ser **liso y sin textura** (papel blanco o gris). Así el software no intenta reconstruirlo y el objeto "gira" respecto de la cámara. Si caminás alrededor, el entorno con textura **ayuda** a la alineación.

## 4. La luz (lo que más importa)

La textura del escaneo **graba la luz que había al momento de las fotos**. Cualquier sombra dura o brillo queda "pintado" en el objeto para siempre, y después choca con la iluminación de la escena 3D.

- Buscá **luz difusa y uniforme desde todas las direcciones**: un cielo nublado, sombra abierta (nunca sol directo) o una carpa de luz con 2–4 fuentes.
- No uses flash de la cámara, salvo con anillo o flash cruzado y polarizado.
- Mantené la exposición, el ISO y el balance de blancos **fijos** durante toda la sesión (en el celular, modo Pro/manual o AE/AF lock).
- Si la textura igual queda con sombras, hay que quitarle la luz ("delighting"). Ver sección 7.

## 5. Cómo sacar las fotos

**Configuración de cámara:** f/8–f/11 para tener profundidad de campo, ISO 100–400, velocidad de 1/125 o más rápida (o trípode), enfoque fijo sobre el objeto y **sin cambiar el zoom** en toda la sesión. Si podés, sacá en RAW y revelá todo el lote con los mismos ajustes.

**Patrón de tomas (objeto de unos 30 cm):**
- **3 anillos** alrededor del objeto: bajo (~10–15° sobre la mesa), medio (~35°) y alto (~60°).
- Una foto cada **10–15°** → 24–36 fotos por anillo.
- 5–10 fotos cenitales.
- **Superposición de 60–80 %** entre fotos consecutivas. Es la causa número uno de fallas.
- El objeto tiene que ocupar el 60–80 % del cuadro y estar nítido. Borrá las fotos movidas.
- **Detalles:** 20–40 fotos más cerca en las zonas con logos, costuras o texto.
- **La base:** dá vuelta el objeto (la suela, en una zapatilla) y hacé una segunda sesión completa. El software las une como dos "chunks" o componentes, alineados por puntos en común o por marcadores. Algunas apps lo hacen solas (modo "flip").
- **Total típico:** 100–250 fotos. Más fotos no compensan una superposición mala.

**Escala:** poné una regla o dos marcadores a una distancia conocida en la escena, o medí el objeto con una cinta. Esa medida va a `CONFIG.realLengthCm`.

## 6. Procesar: apps y software

| Herramienta | Plataforma | Costo | Notas |
|---|---|---|---|
| **RealityScan** (app, de Epic) | iOS / Android | Gratis | Guía la toma en pantalla, procesa en la nube y exporta a Fab/Sketchfab. Muy buena para empezar |
| **RealityScan 2.0** (antes RealityCapture) | Windows, GPU NVIDIA | Gratis por debajo de cierto ingreso anual (verificá la licencia vigente) | El estándar de la industria: rápido y con calidad máxima. Es lo recomendado si hay PC con NVIDIA |
| **Agisoft Metashape** | Win / Mac / Linux | Paga (Standard / Pro) | Muy robusta y con mucho control. Funciona sin NVIDIA |
| **Meshroom** (AliceVision) | Win / Linux | Gratis, open source | Buena calidad, lenta, requiere CUDA |
| **COLMAP + OpenMVS** | Todas | Gratis | Para técnicos; muy configurable |
| **Polycam** | iOS / Android / Web | Freemium | Modo foto con buena calidad; los exports en alta pueden ser pagos |
| **KIRI Engine** | iOS / Android / Web | Freemium | Tiene un modo para objetos sin textura y otro de Gaussian Splatting |
| **Apple Object Capture** | macOS (Reality Composer) | Gratis | Calidad muy buena en Macs con Apple Silicon |

**Proceso genérico (sirve para cualquiera):**
1. Importá las fotos. Si hay fondo liso, generá máscaras: casi todas las apps lo hacen solas. Las máscaras mejoran mucho los resultados con mesa giratoria.
2. **Alineá las cámaras.** Revisá que todas queden alrededor del objeto. Si un anillo quedó suelto, faltan fotos de transición.
3. Uní los chunks (base y arriba) por puntos de control o marcadores.
4. **Definí la escala** con la regla o los marcadores.
5. Reconstruí la malla en calidad alta (high/ultra). Salen de 2 a 20 millones de triángulos.
6. Borrá lo que sobra: la mesa, el fondo y las islas flotantes.
7. Simplificá a 1–2 millones (esta es tu malla "high").
8. Texturizá con 8192 px y una sola textura si se puede.
9. Exportá en OBJ o FBX con la textura, o directamente en glTF/GLB.

## 7. Limpieza y retopología en Blender

Objetivo: una malla **"low" de 100–300 k triángulos** con UV limpias y una textura de 4 k que contenga el detalle de la "high".

1. **Importá la high** y aplicá escala y rotación. El largo del objeto va sobre X, Y hacia arriba en glTF (Z arriba dentro de Blender: el exportador convierte) y la base apoyada en el suelo.
2. **Reparación:** Sculpt Mode → `Remesh` o `Fill Holes` para los agujeros; Smooth Brush para el ruido en zonas lisas; borrá las caras internas.
3. **Malla low:** elegí una de estas opciones.
   - *Rápido:* modificador `Decimate` (Collapse) a 150–250 k. Conserva las UV del escaneo y suele alcanzar para la web.
   - *Limpio:* retopología automática con **Instant Meshes** (gratis), **QuadRemesher** (pago) o `Remesh` de Blender, más UV nuevas (`Smart UV Project` con margen de 0.002).
4. **Bake** (si hiciste UV nuevas): Cycles → `Bake` → `Selected to Active` de high a low. Hacé los mapas `Diffuse` (solo Color, sin Direct/Indirect), `Normal` y opcionalmente `AO`. Usá `Extrusion` o una cage de 1–3 mm para evitar errores.
5. **Delighting:** si la textura tiene sombras o brillos grabados:
   - Agisoft Texture De-Lighter (gratis, standalone), Adobe Substance 3D Sampler, o
   - a mano: en Photoshop/GIMP con "Shadows/Highlights" y clonado en las zonas de brillo, o restando un bake de AO de la malla.
6. **Materiales:** `Metallic = 0`, `Roughness` de 0.7 a 1 en cuero, tela y goma. No exportes los mapas de metalness o roughness que generan algunos escáneres, porque suelen estar mal.
7. **Origen** en el centro de la base y **escala real** (Unit Scale = 1 m; una zapatilla mide unos 0.31 m).
8. **Exportá en glTF 2.0 binario (.glb)**: +Y arriba, con normales y UV, sin cámaras ni luces. La textura puede ir en PNG o JPEG; después el pipeline la convierte a WebP.

## 8. Problemas típicos y cómo resolverlos

| Síntoma | Causa | Solución |
|---|---|---|
| Faltan partes o hay "agujeros" | Poca superposición o zona sin fotos | Más fotos de transición entre anillos; sesión extra de esa zona |
| Superficies onduladas o con burbujas | Brillo o falta de textura | Polarización cruzada, spray o talco, o modelar esa pieza |
| Dos copias superpuestas del objeto | Se movió durante la sesión (o con mesa giratoria y fondo con textura) | Fondo liso más máscaras; fijar el objeto |
| Colores distintos entre lados | Cambió la exposición o la luz | Todo en manual; repetir la sesión |
| Textura borrosa | Fotos movidas o desenfocadas, o cámara lejos | Borrá las borrosas; fotos de detalle más cerca |
| Sombras duras grabadas | Luz direccional | Luz difusa; delighting |
| Logos ilegibles | Poca resolución en esa zona | Fotos de detalle; textura de 8 k para el bake y bajada a 4 k |

## 9. Checklist antes de pasar al pipeline

- [ ] Malla cerrada, sin islas flotantes ni caras internas
- [ ] 100–300 k triángulos (menos si es un objeto simple)
- [ ] Una sola textura de color de 4096 px como máximo, sin sombras grabadas
- [ ] Metalness en 0 para los materiales no metálicos
- [ ] Escala real y medida documentada
- [ ] Y hacia arriba, base en Y=0 y origen centrado
- [ ] .glb exportado → siguiente paso: `references/asset-pipeline.md`

---

### Apéndice: si igual querés Gaussian Splatting

Un splat se ve hiperreal (pelusa, reflejos, translucidez), pero no tiene caras: no hay wireframe, cotas por vértice, recoloreo por textura ni sombra proyectada simple. Si el concepto es "fotografía 3D" y no "plano técnico", podés usar una librería de splats para Three.js (por ejemplo Spark de World Labs, o `@mkkellogg/gaussian-splats-3d`) con archivos `.spz` o `.ksplat` comprimidos. El revelado se hace animando la opacidad o el tamaño de los splats según la distancia a un plano. Una opción híbrida es usar el splat como "producto final" y una malla decimada del mismo escaneo para la fase de plano, con un cross-fade entre las dos.
