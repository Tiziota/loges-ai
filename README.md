# Eclat Pro AI

Application Node.js complete, prete pour GitHub et Render.

## Fonctionnalites

- Interface chat type Gemini
- Support multi-modeles: OpenAI, Anthropic, Google Gemini, OpenRouter
- Gestion des cles API par provider (stockage local navigateur)
- Proxy backend Node/Express pour appeler les API IA
- Endpoint de sante pour Render: `/api/health`
- Configuration de deploiement Render incluse (`render.yaml`)

## Stack

- Node.js 20+
- Express
- Frontend HTML/CSS/JS

## Installation locale

```bash
npm install
npm run dev
```

Puis ouvrir: `http://localhost:3000`

## Variables d'environnement

Creer un fichier `.env` (optionnel pour le local):

```env
PORT=3000
ALLOWED_ORIGIN=*
```

## Deploiement sur Render

1. Push ce repo sur GitHub.
2. Sur Render, creer un "New +" > "Blueprint" et selectionner le repo.
3. Render lira `render.yaml` automatiquement.
4. Deployer.

## Connexion GitHub rapide

```bash
git init
git add .
git commit -m "Initial commit: Eclat Pro AI"
git branch -M main
git remote add origin <URL_DE_TON_REPO>
git push -u origin main
```

## Notes securite

- Les cles API sont saisies par l'utilisateur et envoyees au backend a chaque requete.
- Pour une production stricte, prevoir un vrai systeme d'authentification utilisateur + chiffrement serveur des cles.