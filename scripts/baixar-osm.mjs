// Baixa do OpenStreetMap os limites de bairros de Campo Grande (admin_level 10)
// e salva uma versão simplificada em data/fontes/osm-bairros.geojson.
// Uso: node scripts/baixar-osm.mjs [overpass.json]
import fs from "node:fs";
import osmtogeojson from "osmtogeojson";
import * as turf from "@turf/turf";

const QUERY = `[out:json][timeout:180];
area["name"="Campo Grande"]["admin_level"="8"]["boundary"="administrative"]->.cg;
(relation(area.cg)["boundary"="administrative"]["admin_level"="10"];);
out body;>;out skel qt;`;

const SERVIDORES = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

async function consultar() {
  for (const url of SERVIDORES) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "User-Agent": "site-ieadms (github.com/thiagodsrosa-glitch/site-ieadms)" },
      body: new URLSearchParams({ data: QUERY }),
    }).catch(() => null);
    if (res?.ok) return res.json();
    console.warn(`${url} falhou (${res?.status ?? "sem resposta"}), tentando o próximo...`);
  }
  throw new Error("Nenhum servidor Overpass respondeu. Tente de novo mais tarde.");
}

// Opcional: passar um JSON do Overpass já baixado (node scripts/baixar-osm.mjs arquivo.json)
const arquivo = process.argv[2];
const bruto = arquivo ? JSON.parse(fs.readFileSync(arquivo, "utf8")) : await consultar();

// Relações incompletas no OSM geram anéis abertos: descarta esses anéis.
const anelFechado = (r) => r.length >= 4 && r[0][0] === r.at(-1)[0] && r[0][1] === r.at(-1)[1];
function limpar(g) {
  const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates)
    .filter((p) => anelFechado(p[0]))
    .map((p) => p.filter(anelFechado));
  if (!polys.length) return null;
  return polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys };
}

const geo = osmtogeojson(bruto);
const bairros = geo.features
  .filter((f) => /Polygon/.test(f.geometry.type) && f.properties.admin_level === "10")
  .map((f) => ({ ...f, geometry: limpar(f.geometry) }))
  .filter((f) => f.geometry)
  .map((f) => {
    const s = turf.simplify(turf.truncate(f, { precision: 6 }), { tolerance: 0.00005, highQuality: true });
    return turf.feature(s.geometry, {
      nome: f.properties.name,
      osm_id: f.properties.id,
      area_km2: +(turf.area(f) / 1e6).toFixed(3),
    });
  });

fs.writeFileSync("data/fontes/osm-bairros.geojson", JSON.stringify(turf.featureCollection(bairros)));
console.log(`${bairros.length} bairros salvos em data/fontes/osm-bairros.geojson`);
