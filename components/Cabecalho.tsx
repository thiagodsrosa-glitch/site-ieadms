"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

export const NIVEIS_ONDE_ESTAMOS = [
  { nome: "Campo Grande", href: "/onde-estamos/", pronto: true },
  { nome: "Mato Grosso do Sul", href: "/onde-estamos/", pronto: false },
  { nome: "Brasil", href: "/onde-estamos/", pronto: false },
  { nome: "Mundo", href: "/onde-estamos/", pronto: false },
];

const LINKS = [
  { nome: "Início", href: "/" },
  { nome: "Departamentos", href: "/#departamentos" },
];

export function Cabecalho() {
  const caminho = usePathname();
  // menus guardam a página em que foram abertos: ao navegar, fecham sozinhos
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const [submenuEm, setSubmenuEm] = useState<string | null>(null);
  const aberto = abertoEm === caminho;
  const submenu = submenuEm === caminho;
  const setAberto = (f: (v: boolean) => boolean) => setAbertoEm(f(aberto) ? caminho : null);
  const setSubmenu = (v: boolean | ((v: boolean) => boolean)) =>
    setSubmenuEm((typeof v === "function" ? v(submenu) : v) ? caminho : null);
  const noMapa = caminho.startsWith("/onde-estamos");

  return (
    <header
      className={`z-40 ${noMapa ? "tema-mapa absolute inset-x-0 top-0" : "sticky top-0"} px-3 pt-3 sm:px-5`}
    >
      <nav className="vidro mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-2.5 shadow-lg shadow-black/10">
        <Link href="/" aria-label="IEADMS — início">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 text-sm font-medium md:flex">
          {LINKS.map((l) => (
            <li key={l.nome}>
              <Link href={l.href} className="rounded-lg px-3 py-2 text-suave transition hover:text-texto">
                {l.nome}
              </Link>
            </li>
          ))}
          <li className="relative" onMouseLeave={() => setSubmenu(false)}>
            <button
              type="button"
              onClick={() => setSubmenu((v) => !v)}
              onMouseEnter={() => setSubmenu(true)}
              aria-expanded={submenu}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 transition ${noMapa ? "text-ouro" : "text-suave hover:text-texto"}`}
            >
              Onde Estamos
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
              </svg>
            </button>
            {submenu && (
              <div className="absolute right-0 top-full pt-2">
                <ul className="vidro animar-entrada w-60 rounded-xl p-1.5 shadow-xl">
                  {NIVEIS_ONDE_ESTAMOS.map((n) => (
                    <li key={n.nome}>
                      {n.pronto ? (
                        <Link href={n.href} className="block rounded-lg px-3 py-2 hover:bg-superficie-2">
                          {n.nome}
                        </Link>
                      ) : (
                        <span className="flex items-center justify-between rounded-lg px-3 py-2 text-suave">
                          {n.nome}
                          <span className="rounded-full border border-borda px-2 py-0.5 text-[10px] uppercase tracking-wider">
                            em breve
                          </span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
          <li>
            <Link
              href="/onde-estamos/"
              className="ml-2 rounded-xl bg-ouro px-4 py-2 font-semibold text-[#141821] transition hover:brightness-110"
            >
              Encontre uma igreja
            </Link>
          </li>
        </ul>

        <button
          type="button"
          className="rounded-lg p-2 md:hidden"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {aberto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {aberto && (
        <div className="vidro animar-entrada mx-auto mt-2 max-w-7xl rounded-2xl p-2 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.nome} href={l.href} className="block rounded-lg px-3 py-3">
              {l.nome}
            </Link>
          ))}
          <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-ouro">Onde Estamos</p>
          {NIVEIS_ONDE_ESTAMOS.map((n) =>
            n.pronto ? (
              <Link key={n.nome} href={n.href} className="block rounded-lg px-3 py-3">
                {n.nome}
              </Link>
            ) : (
              <span key={n.nome} className="flex justify-between px-3 py-3 text-suave">
                {n.nome} <span className="text-xs">em breve</span>
              </span>
            ),
          )}
        </div>
      )}
    </header>
  );
}
