"use client";

// Tema claro/escuro. Sem escolha salva, segue o sistema do aparelho.
// A escolha fica em <html data-theme="light|dark"> e no localStorage.
import { useSyncExternalStore } from "react";

export type Tema = "claro" | "escuro";

const CHAVE = "ieadms-tema";

// Roda no <head> antes da página aparecer, para não "piscar" o tema errado.
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CHAVE}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

function temaAtual(): Tema {
  const escolhido = document.documentElement.dataset.theme;
  if (escolhido === "light") return "claro";
  if (escolhido === "dark") return "escuro";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

function assinar(aviso: () => void) {
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const sistema = window.matchMedia("(prefers-color-scheme: dark)");
  sistema.addEventListener("change", aviso);
  return () => {
    observador.disconnect();
    sistema.removeEventListener("change", aviso);
  };
}

export function useTema(): Tema {
  return useSyncExternalStore(assinar, temaAtual, () => "claro");
}

export function definirTema(tema: Tema) {
  const valor = tema === "claro" ? "light" : "dark";
  document.documentElement.dataset.theme = valor;
  try {
    localStorage.setItem(CHAVE, valor);
  } catch {
    // navegação privada: vale só para esta visita
  }
}
