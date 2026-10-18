# SobreRodas

Site e app de ciclismo (uso pessoal). Este repositório tem, para já, o **recolector de dados**: um programa
que vai buscar ao [ProCyclingStats](https://www.procyclingstats.com) (gratuito) o calendário, resultados,
classificações, perfis das etapas, ciclistas e equipas, e grava tudo em ficheiros JSON na pasta `data/`.
O site vai ler estes ficheiros diretamente.

## O que é recolhido

- **Calendário** de todas as provas masculinas de estrada onde correm as melhores equipas: UCI WorldTour,
  UCI ProSeries, Mundiais e Europeus (elite masculina), Volta a Portugal e Campeonatos Nacionais de Portugal.
  A lista é configurável em [`collector/scope.json`](collector/scope.json).
- **Cada edição**: etapas, vencedores e camisolas, classificações completas de cada etapa (etapa, geral,
  pontos, montanha, juventude, equipas e classificações do dia), metas volantes e prémios de montanha com
  quem passou em primeiro, startlist com desistências (DNF/DNS e em que etapa), e o resumo do dia.
- **Perfil da etapa** (provas desde 2026): altimetria ponto a ponto, inclinação por quilómetro, e para cada
  subida o início, topo, comprimento, desnível, inclinação média e máxima; altitude de cada meta volante.
  Nas clássicas sem prémios de montanha oficiais, as subidas são detetadas automaticamente pelo perfil.
- **Direto**: durante as etapas, estado da corrida (km para a meta, velocidade) e a cronologia de eventos.
- **Histórico**: pódios de todas as edições (geral, pontos, montanha, juventude) desde a primeira edição;
  classificações finais completas das edições anteriores desde 2015, e detalhe etapa a etapa das três grandes
  voltas e da Volta a Portugal desde 2020.
- **Ciclistas**: ficha (idade, nacionalidade, peso, altura, foto), especialidades, equipas por época,
  melhores resultados, vitórias, ranking por época, resultados da época atual e lesões.
- **Equipas**: plantel com fotos, staff, material e vitórias da época.

Pistas cobertas (Europeus/Mundiais de pista) ainda não estão incluídas: o ProCyclingStats não as cobre e os
outros sites gratuitos testados (FirstCycling) bloqueiam acessos automáticos.

## Quando corre

Os workflows do GitHub Actions em `.github/workflows/` fazem tudo sozinhos:

| Workflow | Quando | O quê |
| --- | --- | --- |
| `daily.yml` | todos os dias às 05:15 UTC | calendário, provas a decorrer, próximas e recentes, histórico, equipas e ciclistas |
| `live.yml` | de 20 em 20 min entre as 11h e as 18h UTC, mais 19:30, 21:30 e de madrugada para provas na Ásia/Oceânia | só se houver etapa nesse dia: resultados, classificações e cronologia |
| `ci.yml` | em cada pull request | testes e verificação de que o ProCyclingStats responde |

Os dados atualizados são gravados como commits em `data/` (autor `sobrerodas-bot`).

Nota sobre custos: num repositório privado o GitHub dá 2000 minutos grátis por mês; estes horários ficam
abaixo disso. Se o repositório for público, os minutos são ilimitados.

## Usar à mão

```bash
pip install -r requirements.txt
python -m collector calendar --year 2026            # calendário
python -m collector race tour-de-france 2025        # uma edição completa
python -m collector daily                           # o mesmo que o workflow diário
python -m collector live                            # etapas de hoje
python -m collector backfill --since 2015           # edições anteriores
python -m collector rider tadej-pogacar             # uma ficha de ciclista
python -m pytest -q tests                           # testes
```

O recolector faz um pedido de cada vez com pausas (variável `PCS_DELAY`, 1,2 s por omissão) para não
sobrecarregar o site.

## Formato dos dados (`data/`)

| Ficheiro | Conteúdo |
| --- | --- |
| `meta.json` | data da última atualização |
| `live.json` | etapas a decorrer hoje: estado, últimos eventos, top-10, líder |
| `calendar/<ano>.json` | `races[]`: `slug`, `name`, `country`, `class`, `start`, `end`, `stage_race`, `winner` |
| `races/index.json` | todas as provas com as edições disponíveis |
| `races/<slug>/<ano>.json` | edição: `stages[]` (resumo de cada etapa), `final` (gc, points, kom, youth, teams), `standings_after`, `startlist[]`; nas provas de um dia `results[]`, `info`, `profile`, `analysis` |
| `races/<slug>/<ano>/<etapa>.json` | etapa: `info` (distância, desnível, partida, chegada, hora, tipo de percurso), `classifications`, `intermediate[]` (metas volantes e prémios de montanha com resultados), `profile` (`points` = `[km, altitude]`), `analysis` (`climbs[]`, `sprints[]`, `gradients` = `[km, %]`), `live` |
| `races/<slug>/history.json` | pódios por ano: `gc`, `points`, `kom`, `youth` (ou `result` nas provas de um dia) |
| `riders/index.json`, `riders/<slug>.json` | ciclistas |
| `teams/index-<ano>.json`, `teams/<slug>.json` | equipas |

Em cada linha de classificação: `rank` (número, ou DNF/DNS/OTL), `rider`, `name`, `nation` (código do
país), `team`, `team_name`, `time` (tempo do primeiro, diferença nos restantes), `secs` (tempo total em
segundos), `points`, `bonus`, `prev`/`delta` (posição anterior e variação), `uci_pts`, `pcs_pts`.

As fotos e imagens dos perfis são ligações para o ProCyclingStats. Os dados vêm do ProCyclingStats e são
para uso pessoal.

## Site

O site está em `site/` (HTML, CSS e JavaScript simples, sem build). Lê os dados primeiro do GitHub
(`raw.githubusercontent.com`, sempre atualizados se o repositório for público) e, se falhar, da cópia
`data/` publicada com o site (ver `site/config.js`).

Para o ver no computador: `ln -s ../data site/data && python3 -m http.server -d site 8000` e abrir http://localhost:8000.

Publicação no Netlify: o `netlify.toml` já tem tudo (pasta `site`, cópia dos dados). O
`scripts/netlify-ignore.sh` faz com que o Netlify só publique quando o site muda ou na atualização diária dos dados.
