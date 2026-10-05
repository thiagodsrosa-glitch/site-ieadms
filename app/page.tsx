import Link from "next/link";
import { Chama } from "@/components/Logo";
import { congregacoes, setores, setoresGeo } from "@/lib/dados";

const DEPARTAMENTOS = [
  { sigla: "CIFAD", nome: "Mulheres", texto: "Departamento feminino: comunhão, ensino e serviço." },
  { sigla: "Círculo de Oração", nome: "Mulheres", texto: "Mulheres unidas em intercessão pela igreja e pelas famílias." },
  { sigla: "KIDS", nome: "Crianças", texto: "Ensinando a Palavra às crianças com alegria e cuidado." },
  { sigla: "UMADEMATS", nome: "Jovens", texto: "União da mocidade: fé, comunhão e missão." },
  { sigla: "EBD", nome: "Escola Bíblica Dominical", texto: "Estudo da Bíblia para todas as idades, todo domingo." },
];

// Mini mapa decorativo: os setores reais desenhados em SVG
function MiniMapa() {
  const [x0, y0, x1, y1] = [-54.77, -20.595, -54.495, -20.36];
  const w = 600;
  const h = (w * (y1 - y0)) / (x1 - x0);
  const ponto = ([x, y]: number[]) => `${(((x - x0) / (x1 - x0)) * w).toFixed(1)},${(((y1 - y) / (y1 - y0)) * h).toFixed(1)}`;
  const caminho = (coords: number[][][][]) =>
    coords.map((p) => p.map((anel) => "M" + anel.map(ponto).join("L") + "Z").join("")).join("");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full drop-shadow-2xl" role="img" aria-label="Mapa dos setores de Campo Grande">
      {setoresGeo.features.map((f) => {
        const coords = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
        return (
          <path
            key={f.properties.id}
            d={caminho(coords)}
            fill={f.properties.cor}
            fillOpacity={0.28}
            stroke={f.properties.cor}
            strokeWidth={1.5}
          />
        );
      })}
      {congregacoes
        .filter((c) => c.coord)
        .map((c) => {
          const [cx, cy] = ponto(c.coord!).split(",");
          return <circle key={c.id} cx={cx} cy={cy} r={3} fill="#f0cd85" />;
        })}
    </svg>
  );
}

export default function Inicio() {
  const comLocal = congregacoes.filter((c) => c.coord).length;

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-[520px] w-[520px] rounded-full bg-ouro/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-14 lg:grid-cols-2 lg:pt-20">
          <div className="animar-entrada">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-borda px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ouro">
              <Chama className="h-3.5 w-auto" /> Onde Estamos
            </p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
              Há uma igreja <span className="text-ouro">perto de você</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-suave">
              São {congregacoes.length} congregações em {setores.length} setores por toda Campo Grande. Busque pelo seu
              bairro, pelo nome do pastor ou use sua localização para encontrar a mais próxima.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/onde-estamos/?perto=1"
                className="rounded-xl bg-ouro px-6 py-3.5 font-semibold text-[#141821] shadow-lg shadow-ouro/20 transition hover:brightness-110"
              >
                Igrejas perto de mim
              </Link>
              <Link
                href="/onde-estamos/"
                className="rounded-xl border border-borda px-6 py-3.5 font-semibold transition hover:bg-superficie-2"
              >
                Explorar o mapa
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                [setores.length, "setores"],
                [comLocal, "no mapa"],
                ["MS", "e além"],
              ].map(([n, r]) => (
                <div key={r} className="rounded-2xl border border-borda bg-superficie p-4">
                  <dt className="sr-only">{r}</dt>
                  <dd className="font-display text-3xl font-bold">{n}</dd>
                  <dd className="text-sm text-suave">{r}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link href="/onde-estamos/" className="group relative block [perspective:1200px]" aria-label="Abrir o mapa">
            <div className="transition duration-700 [transform:rotateX(38deg)_rotateZ(-8deg)] group-hover:[transform:rotateX(20deg)_rotateZ(-3deg)]">
              <MiniMapa />
            </div>
          </Link>
        </div>
      </section>

      <section id="departamentos" className="scroll-mt-24 border-t border-borda bg-superficie/50">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Departamentos</h2>
          <p className="mt-2 text-suave">Há lugar para toda a família.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DEPARTAMENTOS.map((d) => (
              <li key={d.sigla} className="rounded-2xl border border-borda bg-superficie p-5 transition hover:-translate-y-1 hover:border-ouro/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-ouro">{d.nome}</p>
                <h3 className="mt-1 font-display text-xl font-bold">{d.sigla}</h3>
                <p className="mt-2 text-sm text-suave">{d.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-borda">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-suave sm:flex-row sm:justify-between">
          <p>IEADMS — Igreja Evangélica Assembleia de Deus em Mato Grosso do Sul</p>
          <p>
            Sede: Av. Dr. João Rosa Pires, 482 — Amambaí ·{" "}
            <a className="underline hover:text-ouro" href="https://instagram.com/ieadmsoficial" target="_blank" rel="noreferrer">
              @ieadmsoficial
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
