"use client";

import { useState } from "react";
import {
  congregacoes, corDoSetor, formatarKm, linkGoogleMaps, linkWaze, sede, setores, setoresGeo, setorPorId,
  type Congregacao, type Setor,
} from "@/lib/dados";

export type Painel =
  | { tipo: "inicio" }
  | { tipo: "setor"; setor: string }
  | { tipo: "congregacao"; id: string; voltar?: Painel }
  | { tipo: "perto"; origem: [number, number]; rotulo: string; lista: { id: string; km: number }[] };

interface Props {
  painel: Painel;
  buscar: (t: string) => Congregacao[];
  setorBuscado: (t: string) => Setor | undefined;
  abrirSetor: (id: string) => void;
  abrirCongregacao: (c: Congregacao, origem?: Painel) => void;
  voltarInicio: () => void;
  voltarPara: (p: Painel) => void;
  pertoDeMim: () => void;
  buscarEndereco: (texto: string) => void;
  carregandoLocal: boolean;
  erroLocal: string | null;
  totalNoMapa: number;
}

const porId = new Map([sede, ...congregacoes].map((c) => [c.id, c]));
const infoSetor = new Map(setoresGeo.features.map((f) => [f.properties.id, f.properties]));

function SeloSetor({ id, grande = false }: { id: string | null; grande?: boolean }) {
  if (!id) return <span className="rounded-full bg-ouro/20 px-2 py-0.5 text-xs font-semibold text-ouro">Sede</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${grande ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}
      style={{ background: `${corDoSetor(id)}26`, color: corDoSetor(id) }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: corDoSetor(id) }} />
      Setor {id}
    </span>
  );
}

function ItemCongregacao({ c, extra, onClick }: { c: Congregacao; extra?: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!c.coord}
        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-superficie-2 disabled:cursor-default disabled:opacity-60"
      >
        <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: c.sede ? "#f0cd85" : corDoSetor(c.setor) }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{c.nome}</span>
          <span className="block truncate text-xs text-suave">
            {c.localizacao === "pendente" ? "Localização a confirmar" : [c.bairro, c.setor && `Setor ${c.setor}`].filter(Boolean).join(" · ")}
          </span>
        </span>
        {extra && <span className="shrink-0 text-sm font-semibold text-ouro">{extra}</span>}
      </button>
    </li>
  );
}

function Busca({ buscar, setorBuscado, abrirSetor, abrirCongregacao, buscarEndereco }: Pick<Props, "buscar" | "setorBuscado" | "abrirSetor" | "abrirCongregacao" | "buscarEndereco">) {
  const [q, setQ] = useState("");
  const resultados = q.trim().length >= 2 ? buscar(q) : [];
  const setor = q.trim() ? setorBuscado(q) : undefined;
  const limpar = () => setQ("");

  return (
    <div className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (setor) abrirSetor(setor.id);
          else if (resultados[0]?.coord) abrirCongregacao(resultados[0]);
          else if (q.trim()) buscarEndereco(q.trim());
          limpar();
        }}
      >
        <label htmlFor="busca" className="sr-only">Buscar igreja, bairro, pastor ou setor</label>
        <div className="flex items-center gap-2 rounded-xl border border-borda bg-superficie-2 px-3 focus-within:border-ouro/70">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-suave" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="busca"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Bairro, igreja, pastor, setor…"
            autoComplete="off"
            className="w-full bg-transparent py-3 text-base outline-none placeholder:text-suave"
          />
          {q && (
            <button type="button" onClick={limpar} className="text-suave hover:text-texto" aria-label="Limpar busca">✕</button>
          )}
        </div>
      </form>

      {q.trim().length >= 2 && (
        <div className="animar-entrada absolute inset-x-0 top-full z-20 mt-2 max-h-[50dvh] overflow-y-auto rounded-xl border border-borda bg-superficie p-1.5 shadow-2xl">
          <ul>
            {setor && (
              <li>
                <button type="button" onClick={() => { abrirSetor(setor.id); limpar(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-superficie-2">
                  <SeloSetor id={setor.id} grande />
                  <span className="text-sm text-suave">Ver o setor no mapa</span>
                </button>
              </li>
            )}
            {resultados.map((c) => (
              <ItemCongregacao key={c.id} c={c} onClick={() => { abrirCongregacao(c); limpar(); }} />
            ))}
            <li>
              <button
                type="button"
                onClick={() => { buscarEndereco(q.trim()); limpar(); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-suave hover:bg-superficie-2"
              >
                📍 Igrejas perto do endereço “<span className="truncate text-texto">{q.trim()}</span>”
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function CartaoCongregacao({ c, voltar, onVoltar }: { c: Congregacao; voltar?: Painel; onVoltar: () => void }) {
  const [mais, setMais] = useState(false);
  const setor = c.setor ? setorPorId[c.setor] : null;
  const enderecoCompleto = [c.endereco, c.bairro, "Campo Grande - MS", c.cep].filter(Boolean).join(", ");

  return (
    <div className="animar-entrada">
      <button type="button" onClick={onVoltar} className="mb-3 text-sm text-suave hover:text-texto">
        ← {voltar?.tipo === "perto" ? "Igrejas próximas" : voltar?.tipo === "setor" ? `Setor ${voltar.setor}` : setor ? `Setor ${setor.id}` : "Início"}
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <SeloSetor id={c.setor} />
        {c.localizacao === "aproximada" && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">Localização aproximada</span>
        )}
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold leading-tight">{c.sede ? c.nome : `Congregação ${c.nome}`}</h2>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-suave">Pastor</dt>
          <dd className="font-medium">{c.pastor ?? <span className="text-suave">Em cadastro</span>}</dd>
        </div>
        {setor && (
          <div>
            <dt className="text-xs uppercase tracking-wider text-suave">Supervisor do setor</dt>
            <dd className="font-medium">{setor.supervisor ?? <span className="text-suave">Em cadastro</span>}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs uppercase tracking-wider text-suave">Endereço</dt>
          <dd className="font-medium">
            {c.endereco ?? <span className="text-suave">Endereço a confirmar</span>}
            {c.bairro && <span className="block text-suave">{c.bairro}{c.cep && ` · CEP ${c.cep}`}</span>}
          </dd>
        </div>
      </dl>

      {c.coord && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a href={linkGoogleMaps(c.coord)} target="_blank" rel="noreferrer" className="rounded-xl bg-ouro px-3 py-3 text-center text-sm font-semibold text-[#141821] transition hover:brightness-110">
            Como chegar
          </a>
          <a href={linkWaze(c.coord)} target="_blank" rel="noreferrer" className="rounded-xl border border-borda px-3 py-3 text-center text-sm font-semibold transition hover:bg-superficie-2">
            Abrir no Waze
          </a>
          {c.endereco && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(enderecoCompleto)}
              className="col-span-2 rounded-xl px-3 py-2 text-xs text-suave hover:text-texto"
            >
              Copiar endereço
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setMais((v) => !v)}
        aria-expanded={mais}
        className="mt-3 flex w-full items-center justify-between rounded-xl border border-borda px-4 py-3 text-sm font-semibold hover:bg-superficie-2"
      >
        Saiba mais <span className={`transition ${mais ? "rotate-180" : ""}`}>▾</span>
      </button>
      {mais && (
        <div className="animar-entrada mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[["Foto do pastor", c.pastor], ["Foto da igreja", c.foto]].map(([rotulo]) => (
              <div key={rotulo} className="grid aspect-square place-items-center rounded-xl border border-dashed border-borda bg-superficie-2 p-2 text-center text-xs text-suave">
                {rotulo}
                <br />em breve
              </div>
            ))}
          </div>
          <p className="text-sm">
            <span className="text-suave">Instagram: </span>
            {c.instagram ? (
              <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" className="font-semibold text-ouro hover:underline">
                @{c.instagram}
              </a>
            ) : (
              <span className="text-suave">em cadastro</span>
            )}
          </p>
          <p className="text-sm"><span className="text-suave">Horários de culto: </span><span className="text-suave">em cadastro</span></p>
        </div>
      )}
    </div>
  );
}

export function PainelMapa(p: Props) {
  const { painel } = p;
  // recolhe só o painel atual; ao trocar de conteúdo, ele volta a abrir
  const [recolhidoEm, setRecolhidoEm] = useState<Painel | null>(null);
  const recolhido = recolhidoEm === painel;

  let conteudo: React.ReactNode;
  if (painel.tipo === "inicio") {
    conteudo = (
      <div className="animar-entrada">
        <p className="text-xs font-semibold uppercase tracking-widest text-ouro">Onde Estamos</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Campo Grande</h1>
        <p className="mt-1 text-sm text-suave">
          {setores.length} setores · {congregacoes.length} congregações · toque num setor para elevá-lo
        </p>
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {setores.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => p.abrirSetor(s.id)}
                className="w-full rounded-xl border border-borda p-2.5 text-left transition hover:-translate-y-0.5 hover:border-transparent"
                style={{ boxShadow: `inset 0 -3px 0 ${s.cor}` }}
              >
                <span className="block font-display text-lg font-bold" style={{ color: s.cor }}>{s.id}</span>
                <span className="text-xs text-suave">{infoSetor.get(s.id)?.total ?? 0} igrejas</span>
              </button>
            </li>
          ))}
        </ul>
        <ul className="mt-3">
          <ItemCongregacao c={sede} onClick={() => p.abrirCongregacao(sede)} />
        </ul>
      </div>
    );
  } else if (painel.tipo === "setor") {
    const s = setorPorId[painel.setor];
    const info = infoSetor.get(painel.setor);
    const lista = congregacoes.filter((c) => c.setor === painel.setor);
    conteudo = (
      <div className="animar-entrada">
        <button type="button" onClick={p.voltarInicio} className="mb-3 text-sm text-suave hover:text-texto">← Todos os setores</button>
        <div className="h-1.5 w-16 rounded-full" style={{ background: s.cor }} />
        <h2 className="mt-3 font-display text-3xl font-bold">{s.nome}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="col-span-2 rounded-xl bg-superficie-2 p-3">
            <dt className="text-xs uppercase tracking-wider text-suave">Pr. Supervisor</dt>
            <dd className="font-medium">{s.supervisor ?? <span className="text-suave">Em cadastro</span>}</dd>
          </div>
          <div className="rounded-xl bg-superficie-2 p-3">
            <dt className="text-xs uppercase tracking-wider text-suave">Congregações</dt>
            <dd className="font-display text-xl font-bold">{lista.length}</dd>
          </div>
          <div className="rounded-xl bg-superficie-2 p-3">
            <dt className="text-xs uppercase tracking-wider text-suave">Área aprox.</dt>
            <dd className="font-display text-xl font-bold">{info?.area_km2.toLocaleString("pt-BR")} km²</dd>
          </div>
        </dl>
        <ul className="-mx-2 mt-3">
          {lista.map((c) => (
            <ItemCongregacao key={c.id} c={c} onClick={() => p.abrirCongregacao(c, painel)} />
          ))}
        </ul>
      </div>
    );
  } else if (painel.tipo === "congregacao") {
    const c = porId.get(painel.id)!;
    conteudo = (
      <CartaoCongregacao
        key={c.id}
        c={c}
        voltar={painel.voltar}
        onVoltar={() => (painel.voltar ? p.voltarPara(painel.voltar) : c.setor ? p.abrirSetor(c.setor) : p.voltarInicio())}
      />
    );
  } else {
    conteudo = (
      <div className="animar-entrada">
        <button type="button" onClick={p.voltarInicio} className="mb-3 text-sm text-suave hover:text-texto">← Início</button>
        <p className="text-xs font-semibold uppercase tracking-widest text-ouro">Mais próximas de</p>
        <h2 className="mt-1 font-display text-xl font-bold">{painel.rotulo}</h2>
        <ul className="-mx-2 mt-3">
          {painel.lista.map(({ id, km }) => {
            const c = porId.get(id)!;
            return <ItemCongregacao key={id} c={c} extra={formatarKm(km)} onClick={() => p.abrirCongregacao(c, painel)} />;
          })}
        </ul>
        <p className="mt-2 text-xs text-suave">Distância em linha reta. Toque em “Como chegar” para a rota.</p>
      </div>
    );
  }

  return (
    <aside
      className={`vidro absolute bottom-2 left-2 top-[4.75rem] z-20 flex w-[min(82vw,340px)] flex-col rounded-2xl shadow-2xl transition-transform duration-300 md:bottom-4 md:left-5 md:top-24 md:w-[400px] md:translate-x-0 ${
        recolhido ? "-translate-x-[calc(100%+0.5rem)]" : ""
      }`}
      aria-label="Painel de busca e informações"
    >
      {/* Celular: aba na borda para recolher/abrir a gaveta lateral */}
      <button
        type="button"
        onClick={() => setRecolhidoEm(recolhido ? null : painel)}
        className="vidro absolute -right-12 top-1/2 grid h-14 w-11 -translate-y-1/2 place-items-center rounded-xl shadow-lg md:hidden"
        aria-label={recolhido ? "Abrir busca e informações" : "Recolher painel e ver o mapa"}
        aria-expanded={!recolhido}
      >
        {recolhido ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ouro" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
        )}
      </button>
      <div className="space-y-2 p-3 pb-2 md:p-4 md:pb-2">
        <Busca {...p} />
        <button
          type="button"
          onClick={p.pertoDeMim}
          disabled={p.carregandoLocal}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ouro/15 px-3 py-2.5 text-sm font-semibold text-ouro transition hover:bg-ouro/25 disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" />
          </svg>
          {p.carregandoLocal ? "Localizando…" : "Igrejas perto de mim"}
        </button>
        {p.erroLocal && <p className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-600">{p.erroLocal}</p>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 md:px-4">{conteudo}</div>
    </aside>
  );
}
