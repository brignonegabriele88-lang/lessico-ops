# LESSICO OPS

Duello di parole in italiano: griglia, missioni, dossier e 1 vs 1 sulla stessa rete.

## Layout

```
src/                 gioco, interfaccia, accesso, profilo, multiplayer
public/              dizionario italiano, icona, card
public/dict/         lessico (it.txt.gz) e parole comuni
migrations/          schema accesso e profili
scripts/             avvio, build, migrazioni
server/              middleware
.grok/app-env.json   flag di deploy
```

## Avvio

```bash
npm install
npm run dev
```

Build di produzione: `npm run build`.
