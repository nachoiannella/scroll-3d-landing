# Coreografía: cómo se mueve el objeto con el scroll

## El sistema (por qué es así)

1. **Las poses se declaran en el HTML**, en cada `<section>` (`data-ry`, `data-x`, `data-reveal`…). El contenido y su pose viven juntos: mover, agregar o borrar una sección no rompe nada.
2. **Anclas**: cada pose "llega" cuando el centro de su sección cruza el centro de la ventana. La primera queda anclada al scroll 0 y la última al final. Se recalculan con resize, carga de fuentes y `ResizeObserver` de `main`.
3. **Interpolación entre anclas con smoothstep** (`t*t*(3-2t)`): cada tramo arranca y termina suave, así el objeto "se asienta" en cada pose mientras leés.
4. **Amortiguación exponencial independiente del frame rate**:
   ```js
   const k = 1 - Math.exp(-dt * 6);    // 6 = stiffness. 4 heavier, 10 more nervous
   cur[key] += (target[key] - cur[key]) * k;
   ```
   Esto es lo que da **peso**. El scroll del usuario es irregular (rueda, trackpad, saltos); el objeto lo sigue con inercia y nunca salta. No uses lerp con un factor fijo por frame: a 120 Hz iría el doble de rápido que a 60.
5. **Posición en fracciones del cuadro visible** (`cur.x * visW`): el layout funciona en cualquier relación de aspecto sin números mágicos por breakpoint.
6. **Jerarquía separada** base (posición, escala) → pitch (X) → yaw (Y): las rotaciones nunca se mezclan raro y el pivote queda en el centro del objeto.

## Diseñar la secuencia (pensá como director de fotografía)

- **Cada acto, una idea visual.** Medidas → perfil puro (`ry` 0 o π/2, `rx` 0) para que las cotas sean legibles. Partes → 3/4 (`ry` ≈ 0.7) para ver dos caras. Clímax → contrapicado (`rx` 0.2–0.3) y algo más grande.
- **La rotación avanza, no vuelve.** Sumá `ry` de sección en sección (0 → 0.75 → 2.4 → 3.6 → 6.28). Le da al usuario la sensación de "rodear" el objeto. Si una sección necesita volver a una vista, usá el ángulo equivalente más 2π.
- **Alternancia de lados.** El texto a la izquierda pide el objeto a la derecha (`x` +0.14 a +0.24) y viceversa. Al centro solo en el clímax y en el cierre, con el texto arriba o en una columna estrecha.
- **No hagas todo a la vez.** Si en un tramo el objeto cruza de lado, que rote poco. Si gira mucho, que no cambie de escala. Los cambios simultáneos se leen como "caos".
- **El revelado sucede una sola vez,** en una sección alta (`sec--tall`, unos 240 vh) con un título sticky. Es el único momento en que el usuario mira el objeto y no el texto.
- **Escala según la forma** (ver "Adaptar al objeto" en `SKILL.md`): los objetos alargados viven en 0.85–1.1; los verticales, en 0.8–1 con más aire arriba; los compactos admiten primeros planos de 1.4–2.

### Valores de ejemplo

| Acto | ry | rx | x | y | scale | reveal | otros |
|---|---|---|---|---|---|---|---|
| Hero | -0.6 | 0.18 | 0.18 | 0 | 1 | 0 | wire 1 |
| Plano / medidas | 0 | 0 | 0.14 | 0.02 | 1.05 | 0 | dims 1 |
| Partes | 0.75 | 0.12 | -0.11 | 0 | 0.88 | 0.18 | callouts 1 (un poquito de revelado = adelanto) |
| Revelado | 2.4 | 0.2 | 0 | -0.13 | 0.95 | 1 | paper 1, wire 0 |
| Números | 3.6 | 0.1 | 0.24 | 0 | 0.9 | 1 | |
| Historia | 6.28 | 0.16 | -0.22 | 0 | 0.95 | 1 | |
| Cierre | 7.2 | 0.1 | 0 | 0.13 | 0.92 | 1 | + turntable |

## Objetos largos (guitarras, autos, herramientas)

- Acostalo con `orient` (largo sobre X) y usá `data-rz` (roll) para cambiar su lectura sin perder la pose: diagonal ascendente en la portada (`rz` ≈ 0,3, más dinámico), horizontal pura para las cotas, parado (`rz` = π/2) para la anatomía. Así los callouts quedan en filas y cada línea llega a una altura distinta.
- Los primeros planos se arman con `scale` 2–2,5 y un `x` que empuje la parte interesante hacia la mitad libre del cuadro. La posición depende del aspecto de la pantalla: revisalo en 16:9 y 16:10.
- Para ver el contorneado o la espalda, usá vista trasera 3/4 (`ry` ≈ π + 0,6) con algo de `rx`.
- En móvil: acostado (`data-m-rz` ≤ 0,3), arriba (`data-m-y` ≈ 0,1) y con listas compactas.

## Interacción

- **Drag con resorte**: mientras arrastrás, el offset es libre. Al soltar hay inercia (`velY *= 0.92`) y, tras 1.4 s quieto, vuelve a la pose coreografiada por el camino corto (normalizá el ángulo a (-π, π] antes de volver, para que un drag de varias vueltas no "desenrosque"). Si el usuario sostiene quieto más de 80 ms antes de soltar, no hay fling.
- Usá `touch-action: pan-y` en el canvas: en móvil, el gesto vertical scrollea y el horizontal gira. Usá `setPointerCapture` y escuchá también `lostpointercapture` para no quedar "pegado" arrastrando.
- **Respiración idle** en el hero: `sin(t * 0.5) * 0.12` en yaw, que se apaga al scrollear. Le da vida sin distraer.
- **Turntable final**: integrá una velocidad (que entra en el último 6 % del scroll) en lugar de multiplicar el tiempo. Si no, un scroll mínimo hace saltar el objeto varias vueltas. Al volver hacia arriba, asentá en la vuelta completa más cercana.

## Móvil

- El objeto va arriba, centrado y grande (casi todo el ancho), y el texto abajo sobre un panel translúcido con blur.
- Sobrescribí lo necesario con `data-m-y`, `data-m-scale`, `data-m-x`. `x` vale 0 por defecto en móvil.
- Los callouts se ocultan en móvil (no hay lugar); las cotas se mantienen.

## Accesibilidad del movimiento

Con `prefers-reduced-motion: reduce`: sin respiración, sin turntable, contadores directos al valor final y transiciones de CSS instantáneas. El objeto **sí** sigue cambiando de pose con el scroll, porque es directo y controlado por el usuario. El drag también se mantiene.
