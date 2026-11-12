#!/usr/bin/env bash
# Prepare a 3D model for the scroll-3d-landing template.
#
#   usage: prepare-model.sh <input.glb|.gltf|.obj> [name=product] [out_dir=models] [wire_ratio=0.03] [tex_size=2048]
#
# Produces:
#   <out_dir>/<name>.glb        visible mesh: welded, lightly simplified, WebP textures, Meshopt
#   <out_dir>/<name>-wire.glb   heavily simplified mesh used only for the blueprint lines
#
# Needs Node 18+ (uses npx; nothing is installed globally).
set -euo pipefail

IN="${1:?usage: prepare-model.sh <input> [name] [out_dir] [wire_ratio] [tex_size]}"
NAME="${2:-product}"
OUT="${3:-models}"
WIRE_RATIO="${4:-0.03}"
TEX="${5:-2048}"
GT="npx --yes @gltf-transform/cli@4"

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

case "${IN,,}" in
  *.obj)
    echo "→ converting OBJ to GLB"
    npx --yes obj2gltf -i "$IN" -o "$TMP/src.glb"
    SRC="$TMP/src.glb" ;;
  *.glb|*.gltf)
    SRC="$IN" ;;
  *)
    echo "Unsupported format: export it from Blender as glTF Binary (.glb) first." >&2
    exit 1 ;;
esac

echo "→ source:"
$GT inspect "$SRC" --format md | sed -n '1,40p' || true

echo "→ visible mesh"
$GT optimize "$SRC" "$OUT/$NAME.glb" \
  --compress meshopt \
  --texture-compress webp \
  --texture-size "$TEX" \
  --simplify-error 0.0005

echo "→ wire mesh (ratio $WIRE_RATIO)"
$GT weld "$SRC" "$TMP/w1.glb"
$GT simplify "$TMP/w1.glb" "$TMP/w2.glb" --ratio "$WIRE_RATIO" --error 0.01
$GT resize "$TMP/w2.glb" "$TMP/w3.glb" --width 8 --height 8
$GT meshopt "$TMP/w3.glb" "$OUT/$NAME-wire.glb"

echo
ls -lh "$OUT/$NAME.glb" "$OUT/$NAME-wire.glb"
echo "Done. Check the lines with ?debug&wire=1 and tune wire_ratio (0.01 dense scans … 0.1 simple shapes)."
