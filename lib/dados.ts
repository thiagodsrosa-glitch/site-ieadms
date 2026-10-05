// Dados públicos de Campo Grande, gerados por scripts/gerar-dados.mjs.
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from "geojson";
import bruto from "@/public/dados/congregacoes.json";
import setoresGeoBruto from "@/public/dados/setores.geo.json";
import areaUrbanaBruta from "@/public/dados/area-urbana.geo.json";

export type Localizacao = "confirmada" | "aproximada" | "pendente";

export interface Congregacao {
  id: string;
  nome: string;
  setor: string | null;
  pastor: string | null;
  instagram: string | null;
  foto: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  bairroOficial: string | null;
  loteamento: string | null;
  coord: [number, number] | null;
  localizacao: Localizacao;
  sede?: boolean;
}

export interface Setor {
  id: string;
  nome: string;
  cor: string;
  supervisor: string | null;
}

export interface SetorPropriedades extends Setor {
  total: number;
  area_km2: number;
  centro: [number, number];
}

export const atualizado: string = bruto.atualizado;
export const sede = bruto.sede as Congregacao;
export const setores = bruto.setores as Setor[];
export const congregacoes = bruto.congregacoes as Congregacao[];
export const setoresGeo = setoresGeoBruto as FeatureCollection<Polygon | MultiPolygon, SetorPropriedades>;
export const areaUrbana = areaUrbanaBruta as Feature<Polygon | MultiPolygon>;

export const setorPorId = Object.fromEntries(setores.map((s) => [s.id, s])) as Record<string, Setor>;
export const corDoSetor = (id: string | null) => (id ? setorPorId[id]?.cor : undefined) ?? "#D4A54A";

// ---------- Busca ----------
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const indice = [sede, ...congregacoes].map((c) => {
  const setor = c.setor ? setorPorId[c.setor] : null;
  const campos = [
    c.nome, c.bairro, c.bairroOficial, c.loteamento, c.endereco, c.cep, c.pastor,
    setor ? `setor ${setor.id} ${setor.nome}` : "sede matriz templo central",
    setor?.supervisor,
  ];
  return { c, texto: normalizar(campos.filter(Boolean).join(" ")), nome: normalizar(c.nome) };
});

/** Busca por nome, bairro, endereço, CEP, pastor, setor ou supervisor. */
export function buscar(termo: string, limite = 12): Congregacao[] {
  const q = normalizar(termo);
  if (!q) return [];
  const palavras = q.split(" ");
  return indice
    .map(({ c, texto, nome }) => {
      if (!palavras.every((p) => texto.includes(p))) return null;
      // nome que começa com o termo vem primeiro
      const pontos = nome.startsWith(q) ? 0 : nome.includes(q) ? 1 : 2;
      return { c, pontos };
    })
    .filter((r): r is { c: Congregacao; pontos: number } => r !== null)
    .sort((a, b) => a.pontos - b.pontos || a.c.nome.localeCompare(b.c.nome))
    .slice(0, limite)
    .map((r) => r.c);
}

/** Setor buscado diretamente ("setor b", "b", "c-1"). */
export function setorBuscado(termo: string): Setor | undefined {
  const q = normalizar(termo).replace(/^setor\s*/, "").replace(/\s/g, "");
  return setores.find((s) => normalizar(s.id).replace(/\s/g, "") === q);
}

// ---------- Distância ----------
export function distanciaKm([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function maisProximas(origem: [number, number], n = 5) {
  return [sede, ...congregacoes]
    .filter((c): c is Congregacao & { coord: [number, number] } => c.coord !== null)
    .map((c) => ({ c, km: distanciaKm(origem, c.coord) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

export const formatarKm = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace(".", ",")} km`;

// ---------- Links de navegação ----------
export const linkGoogleMaps = ([lng, lat]: [number, number]) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const linkWaze = ([lng, lat]: [number, number]) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
