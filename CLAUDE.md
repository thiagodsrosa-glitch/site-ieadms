# CLAUDE.md — Site IEADMS ("Onde Estamos")

@AGENTS.md

Guia de contexto e regras para o Claude (e qualquer pessoa) que trabalhar neste repositório.
Leia este arquivo inteiro antes de qualquer alteração.

---

## 1. Objetivo do projeto

Criar um **novo site da IEADMS** (Igreja Evangélica Assembleia de Deus em Mato Grosso do Sul), moderno e com visual arrojado, cujo carro-chefe é o mapa interativo **"Onde Estamos"**, e um **painel administrativo** para supervisores e liderança fazerem mapeamento evangelístico.

O projeto tem duas partes bem separadas:

### 1.1 Site público (consulta) — qualquer pessoa, membro ou não
- Menu principal com o item **"Onde Estamos"**, que dá acesso a mapas em 4 níveis:
  1. **Mundo** — projetos missionários (América do Sul, América do Norte, África, Europa, Ásia).
  2. **Brasil** — estados onde a IEADMS está presente.
  3. **Estados / Mato Grosso do Sul** — cidades com igrejas.
  4. **Campo Grande/MS** — os **13 setores**, cada um com **5 a 12 congregações**.
- **Busca** por: bairro, nome da igreja/congregação, pastor, supervisor, setor, região, cidade, estado, país.
- **"Igrejas perto de mim"**: usar a geolocalização do navegador (com permissão) ou um endereço digitado e listar as congregações mais próximas, com distância.
- **Efeito 3D**: ao clicar num setor, cidade, estado ou país, a área geográfica **se eleva** (extrusão 3D) e se destaca, exibindo um cartão com dados básicos:
  - nome do local / congregação;
  - pastor responsável (e supervisor do setor, quando aplicável);
  - endereço com **link de navegação** (Google Maps / Waze);
  - botão **"Saiba mais"** → foto dos pastores, foto da igreja, Instagram da igreja, horários de culto.

### 1.2 Painel administrativo (restrito, com login)
Usuários: **Presidente-Executivo**, **Supervisores de setor**, (futuramente) pastores de congregação e administradores.

- **Cadastro e edição** de setores, congregações, pastores, fotos, Instagram, horários.
- **Mapeamento demográfico** da área de atuação: camadas com dados do IBGE (população, religião, escolaridade, renda, faixa etária etc.) por setor censitário/bairro.
- **Área de atuação de cada congregação**: desenhar/ajustar no mapa o polígono de abrangência de cada igreja e ver os indicadores dentro dele.
- **Campanhas evangelísticas (ação presencial)**:
  - marcar no mapa o local do evento e desenhar a área a ser trabalhada;
  - contar automaticamente **ruas** e **estimativa de domicílios/pessoas** na área (OpenStreetMap + IBGE);
  - dividir a área em **rotas/equipes** (rua a rua, casa a casa);
  - registrar o resultado: casas visitadas, folhetos entregues, orações, convites, decisões, visitantes no culto;
  - relatório de **alcance**: quantas pessoas foram alcançadas/informadas por visita presencial.
- **Campanhas digitais (fase futura)**: estrutura pronta para tráfego pago (Meta Ads / Google Ads) — UTMs, pixel, alcance por região — exibindo no mesmo mapa o alcance digital comparado ao presencial.
- Permissões por papel: um **supervisor só edita o próprio setor**; o Presidente-Executivo vê tudo.

> Exemplo real que orienta o produto: o Supervisor do **Setor B** (5 congregações) quer mapear a área de cada uma das suas igrejas e repetir, com o sistema, o que fez à mão no evento evangelístico do ano passado (contar ruas e casas, montar equipes e medir o alcance).

---

## 2. Estrutura organizacional (modelo de dados de referência)

```
Campo (IEADMS)
 └── Presidente-Executivo
 └── Região / Nível geográfico: País → Estado → Cidade
      └── Campo Grande/MS → 13 Setores (ex.: Setor A, Setor B, ...)
           └── Supervisor do setor (Pr.)
           └── Congregações (5 a 12 por setor)
                └── Pastor da congregação (Pr.)
 └── Projetos missionários (exterior), por país/continente
```

Departamentos (aparecem no site): **CIFAD** e **Círculo de Oração** (mulheres), **KIDS** (crianças), **UMADEMATS** (jovens), **EBD** (Escola Bíblica Dominical).

Glossário:
- **Pr.** = Pastor. **Congregação** = igreja local (os dois termos são sinônimos aqui).
- **Setor** = agrupamento de congregações em Campo Grande, sob um **Pr. Supervisor**.
- **Presidente-Executivo** = liderança geral, acesso total ao painel.

---

## 3. Stack técnica (proposta inicial)

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | site público + painel no mesmo projeto, SEO, deploy fácil |
| Estilo | **Tailwind CSS** + componentes shadcn/ui | visual moderno, rápido de evoluir |
| Mapa | **MapLibre GL JS** (open source) | camadas vetoriais, `fill-extrusion` para o efeito 3D, sem custo de licença |
| 3D/animações | MapLibre extrusion + **deck.gl** (quando precisar) + Framer Motion | elevação de polígonos, transições de câmera |
| Banco de dados | **Supabase** (PostgreSQL + **PostGIS**) | consultas geográficas (proximidade, área, interseção) |
| Login | Supabase Auth | papéis: admin, presidente, supervisor, pastor |
| Arquivos | Supabase Storage | fotos de pastores e igrejas |
| Hospedagem | **GitHub Pages** agora (export estático, deploy automático a cada push na `main`); **Vercel** quando entrar o painel com login | acessível de qualquer dispositivo |
| Mapa base | **OpenFreeMap** (estilo `dark`), sem chave de API | gratuito |
| Dados geográficos | IBGE (malhas, Censo 2022, setores censitários), OpenStreetMap (ruas, bairros), Natural Earth (países) | fontes públicas e gratuitas |

Mudanças de stack devem ser discutidas e registradas neste arquivo antes de implementadas.

---

## 4. Dados de Campo Grande (como funcionam hoje)

- Fontes em `data/fontes/`:
  - `setores-2025.json` — **lista oficial** (do PDF "Setores 2025"): setores, cores e congregações. **É a fonte da verdade**: para mudar uma igreja de setor, mexa aqui.
  - `mapa-antigo-google-mymaps.kml` — pontos e endereços exportados do Google My Maps antigo.
  - `ajustes.json` — nomes diferentes entre lista e KML, coordenadas aproximadas, igrejas sem localização, dados da Sede.
  - `osm-bairros.geojson` — limites de bairros do OpenStreetMap (`npm run dados:osm`).
- `npm run dados` (scripts/gerar-dados.mjs) gera `public/dados/*.json`, usados pelo site.
- **Divisão dos setores**: diagrama de Voronoi das congregações (cada ponto da cidade pertence à igreja mais próxima), unido por setor, recortado pela área urbana e com cantos arredondados. Ao adicionar/mover igrejas, os limites se recalculam sozinhos. A área de cada congregação fica em `data/geo/areas-congregacoes.geojson` (base para o painel).
- Localização: `confirmada` (ponto do mapa antigo), `aproximada` (centro do bairro, confirmar) ou `pendente` (não aparece no mapa).
- Editou dados? Rode `npm run dados`, confira, faça commit dos arquivos gerados.

## 5. Estrutura de pastas (alvo)

```
site-ieadms/
├── app/
│   ├── (publico)/            # site público
│   │   ├── page.tsx          # home
│   │   └── onde-estamos/     # mapas mundo / brasil / estado / campo-grande
│   └── admin/                # painel administrativo (protegido)
├── components/
│   ├── mapa/                 # componentes de mapa, camadas, cartões 3D
│   └── ui/
├── lib/                      # clientes (supabase), utilitários geo, busca
├── data/
│   ├── geo/                  # GeoJSON (setores, bairros, limites) — versionados
│   └── seed/                 # dados iniciais (setores, congregações) sem dados sensíveis
├── supabase/migrations/      # schema SQL (PostGIS)
├── public/                   # imagens estáticas
├── CLAUDE.md
└── README.md
```

---

## 6. Regras do projeto

### Idioma e tom
- Interface, textos, commits e documentação em **português do Brasil**.
- Código (nomes de variáveis/funções) pode ser em inglês ou português, mas **seja consistente dentro de cada módulo**. Termos de domínio ficam em português: `setor`, `congregacao`, `supervisor`, `pastor`.
- Linguagem respeitosa e institucional; títulos "Pr." e "Pra." conforme cadastrado.

### Separação público × administrativo
- **Nada do painel administrativo pode vazar para o site público.** Dados demográficos detalhados, relatórios de campanha, contatos pessoais e áreas de atuação são **restritos**.
- O site público mostra apenas: nome da igreja, endereço, pastor/supervisor, fotos autorizadas, Instagram, horários.
- Toda rota em `app/admin` exige login e checagem de papel no servidor (não só no front-end). Usar Row Level Security (RLS) no Supabase.

### Privacidade e LGPD
- Fotos e nomes de pastores só são publicados **com autorização**.
- **Nunca** registrar dados pessoais de pessoas visitadas (nome, telefone, endereço exato da casa) sem consentimento explícito. Os relatórios de campanha usam **contagens agregadas** por rua/quadra.
- Não versionar no Git: chaves de API, `.env`, planilhas internas, dados pessoais de membros.
- Dados demográficos vêm de fontes públicas e agregadas (IBGE); citar a fonte e o ano na interface.

### Mapas e dados geográficos
- Coordenadas em **WGS84 (EPSG:4326)**, GeoJSON como formato de troca.
- Polígonos dos setores ficam em `data/geo/` e/ou no banco; toda congregação precisa de `lat/lng` válidos.
- Os 4 níveis (Mundo → Brasil → Estado → Campo Grande) devem usar **o mesmo componente de mapa**, mudando apenas a fonte de dados e o zoom.
- Estimativas (domicílios, pessoas alcançadas) devem ser exibidas como **estimativas**, com a metodologia explicada.

### Visual e experiência
- Moderno, arrojado, com efeito 3D ao selecionar áreas — mas **rápido e utilizável no celular** (a maioria do público acessa pelo celular).
- Mobile-first, responsivo, acessível (contraste, navegação por teclado, textos alternativos nas fotos).
- Modo claro e escuro: botão no cabeçalho e no mapa (lib/tema.ts); sem escolha salva, segue o sistema. O mapa base troca entre OpenFreeMap `positron` (claro) e `dark` (escuro).
- No celular, o painel de busca/informações é uma gaveta na lateral esquerda, recolhível pela aba na borda.
- Animações não podem atrasar a busca: "achar a igreja mais próxima" deve funcionar em poucos toques.

### Qualidade
- TypeScript estrito; sem `any` sem justificativa.
- Antes de commitar: `npm run lint` e `npm run build` devem passar.
- Para ver localmente: `npm install` e `npm run dev` → http://localhost:3000
- Commits pequenos e descritivos em português (ex.: `feat(mapa): extrusão 3D ao clicar no setor`).
- Não apagar nem sobrescrever dados de produção sem confirmação explícita do responsável.

### Fluxo de trabalho
- Repositório: `github.com/thiagodsrosa-glitch/site-ieadms` (público — por isso, **nenhum dado sensível no código**).
- Branch principal: `main`. Funcionalidades maiores em branches `feat/...` com Pull Request.
- O projeto é editado em mais de um computador/dispositivo: sempre `git pull` antes de começar e `git push` ao terminar.

---

## 7. Roadmap

1. ✅ **Fundação** — Next.js, Tailwind, layout, menu com "Onde Estamos", deploy no GitHub Pages.
2. ✅ **Mapa de Campo Grande** — setores com polígonos, congregações, efeito 3D, busca e "perto de mim".
3. **Saiba mais** — fotos, Instagram, horários, navegação.
4. **Níveis Mundo / Brasil / Estados** — projetos missionários e igrejas fora de Campo Grande.
5. **Painel administrativo** — login, papéis, cadastro de setores/congregações.
6. **Mapeamento demográfico** — camadas IBGE por setor censitário e por área de atuação.
7. **Campanhas presenciais** — área do evento, contagem de ruas/domicílios, equipes, registro de alcance.
8. **Campanhas digitais** — integração com tráfego pago e painel de alcance comparado.

---

## 8. Pendências de informação (a coletar com a liderança)
- Supervisores dos setores e pastores das congregações.
- A lista 2025 tem **12 setores** (A, B, C-1, C-2, D, E, F, G, H, J, M, N); confirmar se há um 13º.
- Endereço de **Pq do Sabiá** (G) e **Novo Século** (J); confirmar endereço de Moreninha IV, Jd Aero Rancho, Tarumã, Nova Serrana, Jardim Panorama, Nova Bahia e Taquaral Bosque.
- Igrejas do mapa antigo fora da lista 2025: Nova Canaã, Dom Antônio Barbosa, Jardim Bálsamo, São Conrado II, Assentamento Fazenda Estrela.
- Instagram, horários de culto e fotos (com autorização).
- Igrejas fora de Campo Grande (MS, outros estados) e projetos missionários no exterior.
- Identidade visual oficial (logo, cores, fontes) e endereço do site atual.
