"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapaML, Marker, MapMouseEvent, LngLatBoundsLike } from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  areaUrbana, buscar, congregacoes, corDoSetor, maisProximas, sede, setorBuscado, setores, setoresGeo,
  type Congregacao,
} from "@/lib/dados";
import { useTema, type Tema } from "@/lib/tema";
import { BotaoTema } from "../BotaoTema";
import { PainelMapa, type Painel } from "./PainelMapa";

const ESTILOS: Record<Tema, string> = {
  claro: "https://tiles.openfreemap.org/styles/positron",
  escuro: "https://tiles.openfreemap.org/styles/dark",
};

const CORES = {
  claro: {
    mascara: "#ffffff", mascaraOpacidade: 0.55, apagado: [236, 233, 225] as Rgb, opacidadeSetor: 0.78,
    pilarSelecionado: "#141821", contornoPonto: "#ffffff", rotulo: "#141821", haloRotulo: "rgba(255,255,255,0.95)",
  },
  escuro: {
    mascara: "#05070c", mascaraOpacidade: 0.55, apagado: [10, 14, 22] as Rgb, opacidadeSetor: 0.72,
    pilarSelecionado: "#ffffff", contornoPonto: "#ffffff", rotulo: "#ffffff", haloRotulo: "rgba(5,7,12,0.9)",
  },
};
const VISTA_INICIAL = { center: [-54.622, -20.474] as [number, number], zoom: 11.2, pitch: 48, bearing: -12 };

// Alturas (metros) do efeito 3D
const ALT_NORMAL = 40;
const ALT_ELEVADO = 420;
const ALT_APAGADO = 8;
const ALT_PILAR = 160;

const todas = [sede, ...congregacoes].filter((c): c is Congregacao & { coord: [number, number] } => c.coord !== null);
const idxSetor = new Map(setoresGeo.features.map((f, i) => [f.properties.id, i]));

type Rgb = [number, number, number];

// Mistura a cor do setor com a cor de fundo do tema (setores não selecionados)
function apagar(hex: string, [fr, fg, fb]: Rgb, k = 0.62) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number, f: number) => Math.round(c * (1 - k) + f * k);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return `rgb(${mix(r, fr)},${mix(g, fg)},${mix(b, fb)})`;
}

// Pilar 3D de cada congregação: polígono de 12 lados com ~60 m de raio
function pilar([lng, lat]: [number, number], raio = 60): Polygon {
  const dLat = raio / 111320;
  const dLng = raio / (111320 * Math.cos((lat * Math.PI) / 180));
  const anel = Array.from({ length: 13 }, (_, i) => {
    const a = ((i % 12) / 12) * 2 * Math.PI;
    return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)];
  });
  return { type: "Polygon", coordinates: [anel] };
}

// Espaço livre ao redor do painel lateral (desktop). No celular a gaveta é recolhível.
const margens = () =>
  window.innerWidth < 768
    ? { top: 90, bottom: 40, left: 30, right: 60 }
    : { top: 110, bottom: 50, left: 450, right: 60 };

function mascara(): Feature<Polygon> {
  const g = areaUrbana.geometry;
  const buracos = g.type === "Polygon" ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]);
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ...buracos] },
  };
}

function limitesDe(coords: [number, number][]): LngLatBoundsLike {
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

function limitesDoSetor(id: string): LngLatBoundsLike {
  const f = setoresGeo.features.find((s) => s.properties.id === id)!;
  const aneis = f.geometry.type === "Polygon" ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0]);
  return limitesDe(aneis.flat() as [number, number][]);
}

// Camadas próprias do mapa. Roda a cada carga do estilo base (inclusive ao trocar o tema).
function adicionarCamadas(m: MapaML, tema: Tema) {
  const cores = CORES[tema];
  const primeiroRotulo = m.getStyle().layers.find((l) => l.type === "symbol")?.id;

  m.addSource("mascara", { type: "geojson", data: mascara() });
  m.addLayer({ id: "mascara", type: "fill", source: "mascara", paint: { "fill-color": cores.mascara, "fill-opacity": cores.mascaraOpacidade } }, primeiroRotulo);

  const setoresComCor: FeatureCollection = {
    type: "FeatureCollection",
    features: setoresGeo.features.map((f, i) => ({
      ...f, id: i, properties: { ...f.properties, corApagada: apagar(f.properties.cor, cores.apagado) },
    })),
  };
  m.addSource("setores", { type: "geojson", data: setoresComCor });
  m.addLayer({
    id: "setores-3d", type: "fill-extrusion", source: "setores",
    paint: {
      "fill-extrusion-color": ["case", ["boolean", ["feature-state", "apagado"], false], ["get", "corApagada"], ["get", "cor"]],
      "fill-extrusion-height": ["coalesce", ["feature-state", "h"], ALT_NORMAL],
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": cores.opacidadeSetor,
      "fill-extrusion-vertical-gradient": true,
    },
  });
  m.addLayer({
    id: "setores-contorno", type: "line", source: "setores",
    paint: { "line-color": ["get", "cor"], "line-width": 1.2, "line-opacity": 0.9 },
  });

  const pilares: FeatureCollection = {
    type: "FeatureCollection",
    features: todas.map((c, i) => ({
      type: "Feature", id: i, geometry: pilar(c.coord, c.sede ? 90 : 60),
      properties: { id: c.id, cor: corDoSetor(c.setor), sede: !!c.sede },
    })),
  };
  m.addSource("pilares", { type: "geojson", data: pilares });
  m.addLayer({
    id: "pilares", type: "fill-extrusion", source: "pilares", minzoom: 11.8,
    paint: {
      "fill-extrusion-color": [
        "case",
        ["boolean", ["feature-state", "sel"], false], cores.pilarSelecionado,
        ["get", "sede"], "#f0cd85",
        ["get", "cor"],
      ],
      "fill-extrusion-base": ["coalesce", ["feature-state", "base"], ALT_NORMAL],
      "fill-extrusion-height": [
        "+",
        ["coalesce", ["feature-state", "base"], ALT_NORMAL],
        ["case", ["boolean", ["feature-state", "sel"], false], ALT_PILAR * 2.2, ["get", "sede"], ALT_PILAR * 1.8, ALT_PILAR],
      ],
      "fill-extrusion-opacity": 0.95,
    },
  });

  const pontos: FeatureCollection = {
    type: "FeatureCollection",
    features: todas.map((c) => ({
      type: "Feature", geometry: { type: "Point", coordinates: c.coord },
      properties: { id: c.id, nome: c.nome, cor: corDoSetor(c.setor), sede: !!c.sede },
    })),
  };
  m.addSource("pontos", { type: "geojson", data: pontos });
  m.addLayer({
    id: "pontos", type: "circle", source: "pontos", maxzoom: 12.2,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 12, 6],
      "circle-color": ["case", ["get", "sede"], "#f0cd85", ["get", "cor"]],
      "circle-stroke-color": cores.contornoPonto,
      "circle-stroke-width": 1.4,
    },
  });
  m.addLayer({
    id: "rotulos", type: "symbol", source: "pontos", minzoom: 12.6,
    layout: {
      "text-field": ["get", "nome"], "text-font": ["Noto Sans Bold"], "text-size": 12,
      "text-anchor": "bottom", "text-offset": [0, -1.6], "text-max-width": 9, "text-optional": true,
    },
    paint: { "text-color": cores.rotulo, "text-halo-color": cores.haloRotulo, "text-halo-width": 1.6 },
  });

  const centros: FeatureCollection = {
    type: "FeatureCollection",
    features: setoresGeo.features.map((f) => ({
      type: "Feature", geometry: { type: "Point", coordinates: f.properties.centro },
      properties: { rotulo: f.properties.id, cor: f.properties.cor },
    })),
  };
  m.addSource("centros", { type: "geojson", data: centros });
  m.addLayer({
    id: "setores-rotulo", type: "symbol", source: "centros", maxzoom: 13.2,
    layout: {
      "text-field": ["get", "rotulo"], "text-font": ["Noto Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 10, 14, 13, 28], "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffffff", "text-halo-color": ["get", "cor"], "text-halo-width": 1.2, "text-halo-blur": 0.5 },
  });
}

export default function MapaCampoGrande() {
  const elMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaML | null>(null);
  const marcadorUsuario = useRef<Marker | null>(null);
  const alturas = useRef<Record<string, number>>({});
  const animacao = useRef(0);
  const tema = useTema();
  const temaRef = useRef(tema);
  const selecao = useRef<{ setor: string | null; cong: string | null }>({ setor: null, cong: null });
  const [pronto, setPronto] = useState(false);
  const [modo3d, setModo3d] = useState(true);
  const [painel, setPainel] = useState<Painel>({ tipo: "inicio" });
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [carregandoLocal, setCarregandoLocal] = useState(false);

  // ---------- Efeito 3D: elevar setor ----------
  const elevar = useCallback((setorSel: string | null, congSel: string | null) => {
    selecao.current = { setor: setorSel, cong: congSel };
    const m = mapa.current;
    if (!m) return;
    cancelAnimationFrame(animacao.current);
    const inicio = { ...alturas.current };
    const alvo: Record<string, number> = {};
    for (const s of setores) alvo[s.id] = setorSel === null ? ALT_NORMAL : s.id === setorSel ? ALT_ELEVADO : ALT_APAGADO;
    for (const f of setoresGeo.features) {
      m.setFeatureState({ source: "setores", id: idxSetor.get(f.properties.id)! }, { apagado: setorSel !== null && f.properties.id !== setorSel });
    }
    todas.forEach((c, i) => m.setFeatureState({ source: "pilares", id: i }, { sel: c.id === congSel }));

    const t0 = performance.now();
    const duracao = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 900;
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / duracao);
      const e = 1 - Math.pow(1 - k, 3);
      for (const s of setores) {
        const h = (inicio[s.id] ?? ALT_NORMAL) + (alvo[s.id] - (inicio[s.id] ?? ALT_NORMAL)) * e;
        alturas.current[s.id] = h;
        m.setFeatureState({ source: "setores", id: idxSetor.get(s.id)! }, { h });
      }
      todas.forEach((c, i) => m.setFeatureState({ source: "pilares", id: i }, { base: c.setor ? alturas.current[c.setor] : 0 }));
      if (k < 1) animacao.current = requestAnimationFrame(passo);
    };
    animacao.current = requestAnimationFrame(passo);
  }, []);

  // ---------- Ações ----------
  const abrirSetor = useCallback(
    (id: string) => {
      setPainel({ tipo: "setor", setor: id });
      elevar(id, null);
      mapa.current?.fitBounds(limitesDoSetor(id), { padding: margens(), pitch: 55, bearing: -18, duration: 1400, maxZoom: 14.5 });
    },
    [elevar],
  );

  const abrirCongregacao = useCallback(
    (c: Congregacao, origem?: Painel) => {
      setPainel({ tipo: "congregacao", id: c.id, voltar: origem });
      elevar(c.setor, c.id);
      if (c.coord) {
        const m = mapa.current;
        m?.flyTo({
          center: c.coord, zoom: 14, pitch: 55, bearing: -20, duration: 1600, essential: true,
          padding: margens(),
        });
      }
    },
    [elevar],
  );

  const voltarInicio = useCallback(() => {
    setPainel({ tipo: "inicio" });
    elevar(null, null);
    mapa.current?.flyTo({ ...VISTA_INICIAL, pitch: modo3d ? VISTA_INICIAL.pitch : 0, duration: 1400, padding: margens() });
  }, [elevar, modo3d]);

  const mostrarProximas = useCallback((origem: [number, number], rotulo: string) => {
    const m = mapa.current;
    if (!m) return;
    import("maplibre-gl").then((ml) => {
      marcadorUsuario.current?.remove();
      const el = document.createElement("div");
      el.className = "relative h-5 w-5";
      el.innerHTML =
        '<span class="absolute inset-0 animate-ping rounded-full bg-sky-400/70"></span><span class="absolute inset-0.5 rounded-full border-2 border-white bg-sky-500"></span>';
      marcadorUsuario.current = new ml.Marker({ element: el }).setLngLat(origem).addTo(m);
    });
    const lista = maisProximas(origem, 6);
    setPainel({ tipo: "perto", origem, rotulo, lista: lista.map((r) => ({ id: r.c.id, km: r.km })) });
    elevar(null, null);
    m.fitBounds(limitesDe([origem, ...lista.slice(0, 3).map((r) => r.c.coord)]), {
      padding: margens(), pitch: 50, bearing: -12, duration: 1500, maxZoom: 15,
    });
  }, [elevar]);

  const pertoDeMim = useCallback(() => {
    setErroLocal(null);
    if (!("geolocation" in navigator)) {
      setErroLocal("Seu navegador não permite localização. Digite seu bairro ou endereço na busca.");
      return;
    }
    setCarregandoLocal(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCarregandoLocal(false);
        mostrarProximas([pos.coords.longitude, pos.coords.latitude], "Sua localização");
      },
      () => {
        setCarregandoLocal(false);
        setErroLocal("Não foi possível obter sua localização. Verifique a permissão ou digite seu bairro na busca.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [mostrarProximas]);

  const buscarEndereco = useCallback(
    async (texto: string) => {
      setErroLocal(null);
      setCarregandoLocal(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.search = new URLSearchParams({
          q: `${texto}, Campo Grande, MS`, format: "jsonv2", limit: "1", countrycodes: "br",
          viewbox: "-54.80,-20.33,-54.45,-20.62", bounded: "1",
        }).toString();
        const r = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
        const [achado] = (await r.json()) as { lat: string; lon: string; display_name: string }[];
        if (!achado) {
          setErroLocal(`Não encontramos "${texto}" em Campo Grande. Tente com rua e bairro.`);
          return;
        }
        mostrarProximas([+achado.lon, +achado.lat], achado.display_name.split(",").slice(0, 2).join(","));
      } catch {
        setErroLocal("Falha ao buscar o endereço. Verifique sua conexão.");
      } finally {
        setCarregandoLocal(false);
      }
    },
    [mostrarProximas],
  );

  const alternar3d = () => {
    const novo = !modo3d;
    setModo3d(novo);
    mapa.current?.easeTo({ pitch: novo ? 55 : 0, bearing: novo ? -15 : 0, duration: 900 });
  };

  // ação mais recente para os eventos do mapa (evita closures antigas)
  const acoes = useRef({ abrirSetor, abrirCongregacao, voltarInicio, elevar });
  useEffect(() => {
    acoes.current = { abrirSetor, abrirCongregacao, voltarInicio, elevar };
  }, [abrirSetor, abrirCongregacao, voltarInicio, elevar]);

  // Troca de tema: carrega o outro mapa base; as camadas voltam no "style.load"
  useEffect(() => {
    if (temaRef.current === tema) return;
    temaRef.current = tema;
    mapa.current?.setStyle(ESTILOS[tema], { diff: false });
  }, [tema]);

  // ---------- Criação do mapa ----------
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelado || !elMapa.current) return;
      // worker copiado por scripts/copiar-maplibre.mjs
      ml.setWorkerUrl(`${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH}/maplibre/maplibre-gl-worker.mjs`);
      const m = new ml.Map({
        container: elMapa.current,
        style: ESTILOS[temaRef.current],
        center: VISTA_INICIAL.center,
        zoom: 10.4,
        pitch: 0,
        bearing: 0,
        maxPitch: 75,
        attributionControl: { compact: true },
        maxBounds: [[-55.3, -20.95], [-54.0, -19.95]],
      });
      mapa.current = m;
      m.addControl(new ml.NavigationControl({ visualizePitch: true }), "bottom-right");

      m.on("style.load", () => {
        adicionarCamadas(m, temaRef.current);
        acoes.current.elevar(selecao.current.setor, selecao.current.cong);
      });

      m.once("load", () => {
        // Clique: congregação > setor > fundo
        m.on("click", (e: MapMouseEvent) => {
          const hit = m.queryRenderedFeatures(e.point, { layers: ["pilares", "pontos", "setores-3d"] });
          const cong = hit.find((h) => h.layer.id === "pilares" || h.layer.id === "pontos");
          if (cong) {
            const c = todas.find((t) => t.id === cong.properties.id);
            if (c) acoes.current.abrirCongregacao(c);
            return;
          }
          const setor = hit.find((h) => h.layer.id === "setores-3d");
          if (setor) acoes.current.abrirSetor(setor.properties.id as string);
          else acoes.current.voltarInicio();
        });
        for (const camada of ["pilares", "pontos", "setores-3d"]) {
          m.on("mouseenter", camada, () => (m.getCanvas().style.cursor = "pointer"));
          m.on("mouseleave", camada, () => (m.getCanvas().style.cursor = ""));
        }

        setPronto(true);
        // Entrada: a cidade "levanta" em 3D
        m.easeTo({ ...VISTA_INICIAL, duration: 2200, padding: margens() });
        if (new URLSearchParams(window.location.search).get("perto")) pertoDeMim();
      });
    })();
    return () => {
      cancelado = true;
      cancelAnimationFrame(animacao.current);
      mapa.current?.remove();
      mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalNoMapa = useMemo(() => todas.length, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-fundo">
      <div ref={elMapa} style={{ position: "absolute", inset: 0 }} aria-label="Mapa interativo dos setores de Campo Grande" />

      {!pronto && (
        <div className="absolute inset-0 grid place-items-center text-suave">
          <p className="animate-pulse">Carregando o mapa…</p>
        </div>
      )}

      <PainelMapa
        painel={painel}
        buscar={buscar}
        setorBuscado={setorBuscado}
        abrirSetor={abrirSetor}
        abrirCongregacao={abrirCongregacao}
        voltarInicio={voltarInicio}
        voltarPara={(p) => (p.tipo === "setor" ? abrirSetor(p.setor) : p.tipo === "perto" ? mostrarProximas(p.origem, p.rotulo) : voltarInicio())}
        pertoDeMim={pertoDeMim}
        buscarEndereco={buscarEndereco}
        carregandoLocal={carregandoLocal}
        erroLocal={erroLocal}
        totalNoMapa={totalNoMapa}
      />

      <div className="absolute right-3 top-24 z-10 flex flex-col gap-2 md:right-5">
        <button
          type="button"
          onClick={alternar3d}
          className="vidro rounded-xl px-3 py-2 text-sm font-semibold shadow-lg"
          aria-pressed={modo3d}
          title="Alternar visão 3D / 2D"
        >
          {modo3d ? "2D" : "3D"}
        </button>
        <BotaoTema className="vidro rounded-xl shadow-lg" />
      </div>
    </div>
  );
}
