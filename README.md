# Néron UI

Néron UI est une interface homme-machine minimaliste pour un assistant IA entièrement local. Elle permet aux utilisateurs d'interagir avec Néron de manière conviviale et efficace : poser des questions à la voix ou par texte, effectuer des tâches spécifiques, obtenir des recommandations, ou générer du contenu. L'objectif est de rendre l'expérience intuitive et accessible, tout en s'appuyant sur un pipeline IA puissant tournant 100% en local — sans cloud, sans abonnement.

Sous le capot : Ollama pour le LLM, faster-whisper pour la reconnaissance vocale, pyttsx3 pour la synthèse vocale, et une API FastAPI qui orchestre le tout en un seul processus Python.

Pour en savoir plus et explorer le projet, rendez-vous sur [neron-ai.vercel.app](https://neron-ai.vercel.app).

Ce client (`neron-mobile`) est l'interface web du projet, construite avec [Next.js](https://nextjs.org).

## Configuration

Avant de lancer le client, copiez le template d'environnement et renseignez vos valeurs :

```bash
cp .env .env.local
```

Éditez `.env.local` :

- `NEXT_PUBLIC_NERON_HOST` — IP ou hostname du serveur Néron (ex: `localhost` ou une IP Tailscale)
- `NEXT_PUBLIC_NERON_PORT` — port du gateway WebSocket Néron (défaut: `18789`)
- `NEXT_PUBLIC_NERON_TOKEN` — token d'authentification du gateway (voir `neron.yaml` côté serveur)

⚠️ Ces variables sont injectées au **build**, pas au runtime : après toute modification de `.env.local`, il faut relancer `pnpm build` (ou `pnpm dev` en développement) pour qu'elles soient prises en compte.

## Développement

```bash
pnpm dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) pour voir le résultat. La page se recharge automatiquement lors de l'édition de `app/page.tsx`.

## Production

```bash
pnpm build
pnpm start
```

En production (via systemd, service `neron-client`), le client sert sur le port configuré (voir `next.config.ts` / script de démarrage), par exemple [http://localhost:4100](http://localhost:4100).

## Stack technique

Ce projet utilise [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) pour charger [Geist](https://vercel.com/font).

Pour en savoir plus sur Next.js :

- [Documentation Next.js](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Dépôt GitHub Next.js](https://github.com/vercel/next.js)
