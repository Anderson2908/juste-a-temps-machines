# Juste à temps : Solutions café, fontaine, distributeurs automatique 

Site vitrine solution café, fontaine et DA 

## Direction artistique

- **Couleur principale** : terracotta `#c36043` (boutons, accents — aligné sur justeatemps.com)
- **Typographie** : Jost (proche Futura BT utilisée sur le site officiel)
- **Titres** : minuscules, comme le logo « juste à temps »
- **Fonds** : hero sombre (logo sur noir), sections crème `#faf8f6`

## Lancer en local

```bash
cd "C:\Users\Anderson BANAKISSA\Projects\juste-a-temps-solutions"
cp .env.example .env   # puis renseignez CONTACT_WEBHOOK_URL
npm install
npm run dev
```

Puis ouvrir http://localhost:5173

Le serveur sert le site **et** l’API `POST /api/contact` pour le formulaire de contact.

### Formulaire de contact (.env)

Copiez `.env.example` vers `.env` et configurez :

| Variable | Rôle |
|----------|------|
| `CONTACT_WEBHOOK_URL` | URL de votre API qui reçoit les leads (JSON POST) |
| `CONTACT_API_KEY` | Clé / token (optionnel) |
| `CONTACT_API_HEADER` | Header d’auth (défaut : `Authorization`) |
| `CONTACT_FALLBACK_MODE` | `log` sans API (dev) ou `error` |

Sans API configurée, les demandes sont loguées en console (mode développement).

Site statique seul (sans API) : `npm run dev:static`

Ou ouvrir `index.html` directement dans le navigateur (formulaire non fonctionnel sans serveur).

## Structure des pages 

1. Hero animé (magnifiez / boostez / caféinez)
2. Services (4 cartes)
3. Machines (carousel)
4. Engagement RSE
5. We ? coffee (4 piliers)
6. Statistiques
7. Témoignages
8. Guides
9. Actualités
10. Logos clients
11. Contenus longs + fontaines
12. CTA simulateur + formulaire contact

## Prochaines étapes possibles

- Remplacer le logo SVG par le fichier officiel
- Intégrer les vraies photos machines / fontaines
- Brancher le simulateur et les formulaires
- Migrer vers Next.js ou le CMS existant si besoin
