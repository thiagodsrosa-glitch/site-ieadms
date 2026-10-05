// O MapLibre 6 carrega o "worker" de um arquivo separado, que o bundler do Next não
// publica sozinho. Copiamos os arquivos para public/maplibre/ antes de dev/build.
import fs from "node:fs";

const origem = "node_modules/maplibre-gl/dist";
const destino = "public/maplibre";
fs.mkdirSync(destino, { recursive: true });
for (const arq of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  fs.copyFileSync(`${origem}/${arq}`, `${destino}/${arq}`);
}
