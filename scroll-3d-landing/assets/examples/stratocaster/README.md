# Ejemplo: Stratocaster (modelo descargado)

El modelo no viene incluido: tiene licencia CC BY y pesa 22 MB en su forma original.

1. Con una cuenta gratuita de Sketchfab, descargá **"Fender Stratocaster Guitar"** de Ryan_Nein en formato **GLB (texturas 2K)**:
   https://sketchfab.com/3d-models/fender-stratocaster-guitar-15a37147641b4c1b963bb494b234593f
2. Guardalo en `source/` y optimizalo con el script de la skill:
   `bash scripts/prepare-model.sh source/fender_stratocaster_guitar.glb strat models`
   Usá solo `models/strat.glb`: este ejemplo no necesita el `-wire.glb` (ver abajo).
3. Serví la carpeta (`python -m http.server`) y abrí `index.html`.

Decisiones que muestra el ejemplo:
- `orient: [0, 0, -Math.PI/2]`: el archivo trae la guitarra parada y acá la acostamos.
- `keepPbr: true`, porque es un modelo hecho a mano con metales y barniz reales.
- `wireMode: 'edges'` + `wireModel: null`: en un modelo hecho a mano, las aristas se leen mejor que una malla decimada.
- `recolorOnly: ['BodyMaterial']`: los acabados pintan solo el cuerpo.
- `wireColors` / `edgeColor` y `strat.css`: concepto "lámina de patente → escenario".
- `data-rz` para pararla en la anatomía; en móvil se acuesta (`data-m-rz`).
- Créditos CC BY y aviso de marca en el footer.
