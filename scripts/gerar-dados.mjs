// Gera os dados do mapa de Campo Grande a partir das fontes em data/fontes/:
//   - setores-2025.json  (lista oficial de congregações por setor)
//   - mapa-antigo-google-mymaps.kml (pontos e endereços das igrejas)
//   - ajustes.json (correções manuais)
//   - osm-bairros.geojson (limites de bairros, ver scripts/baixar-osm.mjs)
//
// Saídas:
//   public/dados/congregacoes.json   -> lista pública das congregações
//   public/dados/setores.geo.json     -> polígonos dos setores
//   public/dados/area-urbana.geo.json -> contorno da área urbana
//   data/geo/areas-congregacoes.geojson -> área de influência de cada congregação (uso do painel)
//
// Como os setores são desenhados: cada congregação recebe a região da cidade que
// está mais perto dela do que de qualquer outra (diagrama de Voronoi). As regiões
// das congregações de um mesmo setor são unidas, recortadas pela área urbana e
// têm os cantos arredondados. Assim os limites nascem da posição real das igrejas.
//
// Uso: node scripts/gerar-dados.mjs
import fs from "node:fs";
import * as turf from "@turf/turf";

const ler = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const { setores } = ler("data/fontes/setores-2025.json");
const ajustes = ler("data/fontes/ajustes.json");
const bairrosOsm = ler("data/fontes/osm-bairros.geojson");
const kml = fs.readFileSync("data/fontes/mapa-antigo-google-mymaps.kml", "utf8");

// ---------- 1. Pontos do KML ----------
const limparTexto = (s) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const pontosKml = new Map();
for (const [, bloco] of kml.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
  const coord = bloco.match(/<Point>\s*<coordinates>\s*([^<\s]+)/);
  if (!coord) continue;
  const nome = limparTexto(bloco.match(/<name>([\s\S]*?)<\/name>/)[1]);
  const desc = bloco.match(/<description>([\s\S]*?)<\/description>/);
  const linhas = desc ? limparTexto(desc[1]).split(/<br>/i).map((l) => l.trim()).filter(Boolean) : [];
  const [lng, lat] = coord[1].split(",").map(Number);
  pontosKml.set(nome, { coord: [lng, lat], linhas });
}

// "Rua X nº 123 / Bairro / CEP: 79000-000" -> campos separados
function lerEndereco(linhas) {
  let endereco = null, bairro = null, cep = null;
  for (const l of linhas) {
    const c = l.match(/\b(\d{2}\.?\d{3}-?\d{3})\b/);
    if (/cep/i.test(l) || /Campo Grande - MS/i.test(l)) {
      if (c) cep = c[1].replace(".", "").replace(/^(\d{5})(\d{3})$/, "$1-$2");
      continue;
    }
    if (!endereco) endereco = l;
    else if (!bairro) bairro = l;
  }
  if (endereco) {
    endereco = endereco
      .replace(/\s+nº\s*s\/\s*nº$/i, ", s/nº")
      .replace(/\s+nº\s*$/i, ", s/nº")
      .replace(/\s+nº\s+/i, ", nº ");
    // "Rua X nº 599 - Alves Pereira": bairro na mesma linha
    const [rua, resto] = endereco.split(/\s+-\s+(?=[^-]*$)/);
    if (resto && !bairro && !/lote|q\.|qd/i.test(resto)) [endereco, bairro] = [rua, resto];
    endereco = endereco.replace(/\s+-\s+/g, ", ");
  }
  if (bairro) {
    bairro = bairro
      .toLowerCase()
      .replace(/(^|\s|\.)(\p{L})/gu, (m) => m.toUpperCase())
      .replace(/\b(Ii|Iii|Iv|Vi|Vii)\b/g, (m) => m.toUpperCase())
      .replace(/^Jd\.\s*/, "Jardim ")
      .replace(/\s(Da|De|Do|Das|Dos)\s/g, (m) => m.toLowerCase())
      .replace("N.srª Das Graças", "Nossa Senhora das Graças");
  }
  return { endereco, bairro, cep };
}

// ---------- 2. Bairro oficial (OSM) ----------
const bairrosValidos = bairrosOsm.features.filter((f) => f.properties.area_km2 > 0);
function bairroOsm(coord) {
  const dentro = bairrosValidos.filter((f) => turf.booleanPointInPolygon(coord, f));
  // O maior polígono que contém o ponto costuma ser o bairro oficial; o menor, o loteamento.
  dentro.sort((a, b) => b.properties.area_km2 - a.properties.area_km2);
  return { bairroOficial: dentro[0]?.properties.nome ?? null, loteamento: dentro.at(-1)?.properties.nome ?? null };
}

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- 3. Congregações ----------
const congregacoes = [];
const usadosKml = new Set();
const avisos = [];

for (const setor of setores) {
  for (const nome of setor.congregacoes) {
    const base = { id: slug(nome), nome, setor: setor.id, pastor: null, instagram: null, foto: null };
    const nomeKml = ajustes.nomeNoKml[nome] ?? nome;
    const p = pontosKml.get(nomeKml);
    const aprox = ajustes.aproximado[nome];

    if (p) {
      usadosKml.add(nomeKml);
      const end = lerEndereco(p.linhas);
      const osm = bairroOsm(p.coord);
      congregacoes.push({ ...base, ...end, bairro: end.bairro ?? osm.loteamento, ...osm, coord: p.coord, localizacao: "confirmada" });
    } else if (aprox) {
      congregacoes.push({
        ...base, endereco: null, bairro: aprox.bairro, cep: null,
        ...bairroOsm(aprox.coord), coord: aprox.coord, localizacao: "aproximada",
      });
      avisos.push(`~ ${nome} (${setor.id}): localização aproximada pelo centro do bairro`);
    } else {
      congregacoes.push({ ...base, endereco: null, bairro: null, cep: null, bairroOficial: null, loteamento: null, coord: null, localizacao: "pendente" });
      avisos.push(`! ${nome} (${setor.id}): sem localização — não aparece no mapa`);
    }
  }
}

// Templo Sede
const sedePt = pontosKml.get(ajustes.sede.coordNoKml);
usadosKml.add(ajustes.sede.coordNoKml);
const sede = {
  id: "sede", nome: ajustes.sede.nome, setor: null, pastor: null, instagram: "ieadmsoficial", foto: null,
  endereco: ajustes.sede.endereco, bairro: ajustes.sede.bairro, cep: ajustes.sede.cep,
  ...bairroOsm(sedePt.coord), coord: sedePt.coord, localizacao: "confirmada", sede: true,
};

for (const nome of pontosKml.keys()) {
  if (!usadosKml.has(nome)) avisos.push(`? "${nome}" está no mapa antigo mas não na lista 2025 — ignorado`);
}

// ---------- 4. Área urbana ----------
const comLocal = congregacoes.filter((c) => c.coord);
const pedacos = [
  ...bairrosValidos.map((f) => turf.feature(f.geometry)),
  ...comLocal.map((c) => turf.circle(c.coord, 0.7, { steps: 24, units: "kilometers" })),
];
let urbana = turf.union(turf.featureCollection(pedacos));
// fecha frestas entre bairros e remove buracos internos
urbana = turf.buffer(turf.buffer(urbana, 0.25, { units: "kilometers" }), -0.25, { units: "kilometers" });
const semBuracos = (g) =>
  g.type === "Polygon"
    ? { type: "Polygon", coordinates: [g.coordinates[0]] }
    : { type: "MultiPolygon", coordinates: g.coordinates.map((p) => [p[0]]) };
urbana = turf.feature(semBuracos(urbana.geometry));
// O buffer do turf às vezes cria polígonos-fantasma longe da cidade:
// mantém só partes perto das igrejas e com área relevante.
const centroCidade = turf.center(turf.featureCollection(comLocal.map((c) => turf.point(c.coord))));
const pertoDaCidade = (p) => turf.distance(turf.centroid(p), centroCidade) < 30;
function partesValidas(g, areaMin) {
  if (g.geometry.type === "Polygon") return g;
  const ps = g.geometry.coordinates.map((c) => turf.polygon(c)).filter(pertoDaCidade);
  const maior = Math.max(...ps.map((p) => turf.area(p)));
  const ficam = ps.filter((p) => turf.area(p) >= Math.max(areaMin, maior * 0.05));
  return ficam.length === 1 ? ficam[0] : turf.multiPolygon(ficam.map((p) => p.geometry.coordinates));
}
urbana = partesValidas(urbana, 2e6);
urbana = turf.simplify(urbana, { tolerance: 0.0002, highQuality: true });

// ---------- 5. Voronoi -> áreas das congregações -> setores ----------
const bbox = turf.bbox(turf.buffer(urbana, 2, { units: "kilometers" }));
const pts = turf.featureCollection(comLocal.map((c) => turf.point(c.coord, { id: c.id, setor: c.setor })));
const celulas = turf.voronoi(pts, { bbox });

const areas = [];
celulas.features.forEach((cel, i) => {
  if (!cel) return;
  const recorte = turf.intersect(turf.featureCollection([cel, urbana]));
  if (recorte) areas.push(turf.feature(recorte.geometry, { ...pts.features[i].properties }));
});

const ARREDONDAR = 0.35; // km — suaviza os cantos
const FRESTA = 0.035;    // km — espaço visual entre setores

const setoresGeo = [];
for (const s of setores) {
  const minhas = areas.filter((a) => a.properties.setor === s.id);
  if (!minhas.length) continue;
  let g = minhas.length > 1 ? turf.union(turf.featureCollection(minhas)) : minhas[0];
  // abertura + fechamento morfológico: arredonda cantos sem mudar a forma geral
  g = turf.buffer(g, -(ARREDONDAR + FRESTA), { units: "kilometers" });
  g = turf.buffer(g, ARREDONDAR, { units: "kilometers" });
  g = turf.simplify(g, { tolerance: 0.00008, highQuality: true });
  g = partesValidas(g, 0); // descarta fragmentos residuais do arredondamento
  const membros = congregacoes.filter((c) => c.setor === s.id);
  const partes = g.geometry.type === "MultiPolygon" ? g.geometry.coordinates.length : 1;
  if (partes > 1) avisos.push(`△ Setor ${s.id} ficou dividido em ${partes} partes (congregações intercaladas com outro setor)`);
  setoresGeo.push(
    turf.feature(turf.truncate(g, { precision: 6 }).geometry, {
      id: s.id, nome: s.nome, cor: s.cor, supervisor: s.supervisor,
      total: membros.length,
      area_km2: +(turf.area(g) / 1e6).toFixed(1),
      centro: turf.truncate(turf.centerOfMass(g), { precision: 6 }).geometry.coordinates,
    }),
  );
}

// ---------- 6. Gravar ----------
fs.mkdirSync("public/dados", { recursive: true });
fs.mkdirSync("data/geo", { recursive: true });
fs.writeFileSync(
  "public/dados/congregacoes.json",
  JSON.stringify({ atualizado: new Date().toISOString().slice(0, 10), sede, setores: setores.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor, supervisor: s.supervisor })), congregacoes }, null, 1),
);
fs.writeFileSync("public/dados/setores.geo.json", JSON.stringify(turf.featureCollection(setoresGeo)));
fs.writeFileSync("public/dados/area-urbana.geo.json", JSON.stringify(turf.truncate(urbana, { precision: 6 })));
fs.writeFileSync("data/geo/areas-congregacoes.geojson", JSON.stringify(turf.truncate(turf.featureCollection(areas), { precision: 6 })));

console.log(`${congregacoes.length} congregações em ${setores.length} setores (+ sede)`);
console.log(`${comLocal.length} com localização no mapa`);
console.log(avisos.join("\n"));
