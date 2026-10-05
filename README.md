# Site IEADMS — Onde Estamos

Novo site da **IEADMS** (Igreja Evangélica Assembleia de Deus em Mato Grosso do Sul), com um mapa interativo em 3D para encontrar nossas igrejas e um painel administrativo para mapeamento evangelístico.

> 🚧 Projeto em fase inicial. Veja o [CLAUDE.md](CLAUDE.md) para objetivos, regras e roadmap completos.

## O que o site vai oferecer

### Para todos (site público)
- **Onde Estamos**: mapas do **Mundo**, **Brasil**, **Estados** e **Campo Grande/MS**.
- Campo Grande dividida em **13 setores**, cada um com suas congregações, pastores e supervisor.
- **Busca** por bairro, igreja, pastor, supervisor, setor, cidade, estado ou país.
- **Igrejas perto de mim**, usando a localização do celular ou um endereço.
- **Efeito 3D**: ao clicar num setor, cidade, estado ou país, a área se eleva e mostra nome, pastor responsável, endereço com link de navegação e **Saiba mais** (fotos, Instagram, horários de culto).

### Para a liderança (painel administrativo)
- Cadastro de setores, congregações e pastores.
- Camadas de dados do IBGE: população, religião, escolaridade e renda por região.
- Definição da **área de atuação** de cada congregação.
- **Campanhas evangelísticas**: área do evento, contagem de ruas e domicílios, divisão em equipes e registro do alcance (casas visitadas, folhetos, convites).
- Em breve: acompanhamento do alcance de **tráfego pago** no mesmo mapa.

## Tecnologias (proposta)
Next.js · TypeScript · Tailwind CSS · MapLibre GL (3D) · Supabase (PostgreSQL + PostGIS) · Vercel

## Como trabalhar neste projeto em qualquer computador

```bash
git clone https://github.com/thiagodsrosa-glitch/site-ieadms.git
cd site-ieadms
# antes de começar
git pull
# depois de alterar
git add .
git commit -m "descrição da alteração"
git push
```

Também é possível editar pelo navegador em [claude.ai/code](https://claude.ai/code) ou pelo [github.dev](https://github.dev/thiagodsrosa-glitch/site-ieadms).

## Privacidade
Este repositório é **público**. Nenhum dado pessoal de membros, pessoas visitadas ou chaves de acesso deve ser enviado para cá. Fotos e nomes de pastores só são publicados com autorização.
