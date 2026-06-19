# -*- coding: utf-8 -*-
import re

DOMAIN = "https://www.votre-domaine.com"

FOOTER = '''    <footer class="site-footer">
      <div class="container ft-top">
        <div class="ft-brand">
          <a href="index.html#top" class="ft-logo" aria-label="Juste à temps, accueil">
            <img src="assets/logo.webp" alt="juste à temps" width="200" height="28" />
          </a>
          <div class="ft-social">
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7h2.3l.4-2.7h-2.7V9.5c0-.8.2-1.3 1.3-1.3h1.4V5.8c-.2 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2H8.3V14h2.5v7h2.7z"/></svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="#" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6.94 7.5a1.94 1.94 0 11-.01-3.88 1.94 1.94 0 01.01 3.88zM5.3 9h3.28v10.5H5.3V9zm5.4 0h3.14v1.44h.05c.44-.83 1.5-1.7 3.1-1.7 3.3 0 3.9 2.17 3.9 5v5.76h-3.27v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7v5.18H10.7V9z"/></svg>
            </a>
          </div>
        </div>
        <form class="ft-news">
          <h4 class="ft-news__title">recevoir notre newsletter caféinée</h4>
          <div class="ft-form">
            <input type="email" placeholder="votre email" aria-label="Email newsletter" required />
            <button type="submit" class="btn btn-primary">s'inscrire</button>
          </div>
        </form>
      </div>
      <div class="container"><hr class="ft-divider" /></div>
      <div class="container ft-body">
        <nav class="ft-links" aria-label="Pied de page">
          <div class="ft-group">
            <h4 class="ft-group__title">nos services</h4>
            <ul>
              <li><a href="index.html">machines à café</a></li>
              <li><a href="fontaines-a-eau.html">fontaines à eau</a></li>
              <li><a href="distributeurs-automatiques.html">distributeur automatique</a></li>
              <li><a href="index.html#simulateur">votre solution café</a></li>
            </ul>
          </div>
          <div class="ft-group">
            <h4 class="ft-group__title">l'entreprise</h4>
            <ul>
              <li><a href="a-propos.html">à propos</a></li>
              <li><a href="a-propos.html">démarche RSE</a></li>
              <li><a href="index.html#bcorp">certification B Corp</a></li>
              <li><a href="contact.html">nous contacter</a></li>
            </ul>
          </div>
          <div class="ft-group">
            <h4 class="ft-group__title">en savoir +</h4>
            <ul>
              <li><a href="index.html#avis">avis clients</a></li>
              <li><a href="#">mentions légales</a></li>
              <li><a href="#">politique de confidentialité</a></li>
              <li><a href="mailto:contact@justeatemps.com">contact@justeatemps.com</a></li>
            </ul>
          </div>
        </nav>
        <div class="ft-trust">
          <div class="ft-trust__badges">
            <img src="assets/bcorp-logo.webp" alt="Certified B Corporation" width="64" height="64" loading="lazy" decoding="async" />
            <img src="assets/ecovadis-bronze.webp" alt="EcoVadis Sustainability Rating, Bronze" width="72" height="72" loading="lazy" decoding="async" />
          </div>
          <div class="ft-score">
            <span class="ft-score__stars" aria-hidden="true">★★★★★</span>
            <span class="ft-score__value"><strong>4,8 / 5</strong> · satisfaction client</span>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="container footer-bottom__inner">
          <p>© 2026 Juste à temps</p>
          <nav class="ft-legal" aria-label="Mentions légales">
            <a href="#">politique de confidentialité</a>
            <a href="#">mentions légales</a>
          </nav>
        </div>
      </div>
    </footer>'''

def header(active):
    def cls(key):
        return ' nav-link--active' if key == active else ''
    return '''    <header class="site-header" id="top">
      <div class="container header-inner">
        <a href="index.html" class="logo" aria-label="Juste à temps, accueil">
          <img src="assets/logo.webp" alt="juste à temps" width="220" height="40" decoding="async" />
        </a>
        <nav class="nav-main" aria-label="Navigation principale">
          <ul class="nav-list">
            <li class="nav-item"><a class="nav-link%s" href="index.html">machines à café</a></li>
            <li class="nav-item"><a class="nav-link%s" href="fontaines-a-eau.html">fontaines à eau</a></li>
            <li class="nav-item"><a class="nav-link%s" href="distributeurs-automatiques.html">distributeur automatique</a></li>
            <li class="nav-item"><a class="nav-link" href="a-propos.html">à propos</a></li>
          </ul>
        </nav>
        <div class="header-actions">
          <a href="tel:0820001030" class="header-phone">08 20 00 10 30</a>
          <a href="contact.html" class="btn btn-primary">nous contacter</a>
          <button type="button" class="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>''' % (cls('cafe'), cls('fontaines'), cls('distributeurs'))

# ----- catégories : specs + pricing communs -----
CAT = {
  "fontaines": {
    "label": "fontaines à eau",
    "index": "fontaines-a-eau.html",
    "nav": "fontaines",
    "similar_title": "Nos fontaines à eau similaires :",
    "outro_lead": "Nos consultants étudient la configuration de vos locaux et vous proposent la fontaine la plus adaptée à vos équipes, sans engagement.",
    "specs": {
      "g1t": "Usage et distribution",
      "g1": ["Eau froide, tempérée et chaude à la demande", "Distribution sans contact disponible", "Commande tactile intuitive", "Bec haut pour bouteilles et carafes"],
      "g2t": "Dimensions et installation",
      "g2": ["Encastrable sous évier ou pose libre", "Raccordement au réseau d'eau", "Alimentation 230 V"],
      "g3t": "Spécifications",
      "g3": ["Refroidissement à détente directe", "Débit jusqu'à 30 L/h", "Cuve et circuit inox hygiéniques", "Surpresseur CO₂ pour eau pétillante (selon modèle)"],
      "g4t": "Filtration et hygiène",
      "g4": "Micro-filtration à charbon actif, traitement UV en option et cycle d'auto-désinfection pour une eau pure et saine à chaque service.",
    },
    "pricing": [
      ("achat", "à partir de", "1290", "€", "", [
        "<strong>Achat de la fontaine. Vous gérez vos consommables librement.</strong>",
        "Entretien régulier, pour une eau toujours pure.",
        "SAV 100% gratuit et illimité.",
        "Changement des filtres inclus."], False),
      ("location", "à partir de", "39", "€", "par mois", [
        "<strong>Fontaine en location. Filtration et CO₂ fournis.</strong>",
        "Entretien régulier, pour une eau toujours pure.",
        "SAV 100% gratuit et illimité.",
        "Changement des filtres inclus."], True),
      ("dépôt", "à partir de", "0.05", "€", "par litre", [
        "<strong>Mise à disposition de la fontaine, ne payez que votre consommation !</strong>",
        "Entretien régulier, pour une eau toujours pure.",
        "SAV 100% gratuit et illimité.",
        "Changement des filtres inclus."], False),
    ],
  },
  "distributeurs": {
    "label": "distributeurs automatiques",
    "index": "distributeurs-automatiques.html",
    "nav": "distributeurs",
    "similar_title": "Nos distributeurs similaires :",
    "outro_lead": "Nos consultants évaluent vos flux de passage et vous orientent vers le distributeur le plus adapté à vos espaces, sans engagement.",
    "specs": {
      "g1t": "Usage et distribution",
      "g1": ["Écran de sélection intuitif", "Boissons chaudes et fraîches", "Service en gobelet ou contenant personnel", "Paiement sans contact, badge ou monnayeur"],
      "g2t": "Dimensions et installation",
      "g2": ["Pose libre, raccordement réseau d'eau", "Alimentation 230 V", "Mise en service par nos techniciens"],
      "g3t": "Spécifications",
      "g3": ["Réservoir et circuits hygiéniques", "Grande capacité de stockage", "Comptage et télémétrie des consommations", "Réglage des recettes et des doses"],
      "g4t": "Hygiène et entretien",
      "g4": "Nettoyage automatique des circuits, réassort régulier et maintenance préventive pour un service fiable et conforme aux normes d'hygiène.",
    },
    "pricing": [
      ("achat", "à partir de", "3490", "€", "", [
        "<strong>Achat du distributeur. Vous choisissez vos produits.</strong>",
        "Entretien régulier, pour un service sans panne.",
        "SAV 100% gratuit et illimité.",
        "Réassort et recyclage des gobelets inclus."], False),
      ("location", "à partir de", "119", "€", "par mois", [
        "<strong>Distributeur en location. Nous gérons le réassort.</strong>",
        "Entretien régulier, pour un service sans panne.",
        "SAV 100% gratuit et illimité.",
        "Réassort et recyclage des gobelets inclus."], True),
      ("dépôt", "à partir de", "0.45", "€", "par boisson", [
        "<strong>Mise à disposition du distributeur, ne payez que les boissons !</strong>",
        "Entretien régulier, pour un service sans panne.",
        "SAV 100% gratuit et illimité.",
        "Réassort et recyclage des gobelets inclus."], False),
    ],
  },
}

# ----- produits -----
PRODUCTS = [
  # cat, slug, name, brand, img, stage_bg, subtitle, lead, text, stats[3]
  ("fontaines", "fontaine-alpes-d-huez", "Alpes d'Huez", "Blupura", "assets/fontaines/blupura-compact.webp", "assets/machine-stage-bg.webp",
    "discrète et performante",
    "Intégration parfaite à votre plan de travail pour un accès permanent à l'eau fraîche en open space ou salle de pause.",
    "Encastrée sous l'évier, l'Alpes d'Huez libère le plan de travail tout en offrant une eau filtrée à température idéale, idéale pour les bureaux soucieux du design.",
    [("2", "températures d'eau"), ("30", "litres par heure"), ("micro", "filtration")]),
  ("fontaines", "fontaine-les-arcs", "Les Arcs", "Blupura", "assets/fontaines/blupura-triple.webp", "assets/machine-stage-bg.webp",
    "eau froide, tiède et chaude",
    "Trois becs de distribution pour couvrir tous les besoins d'hydratation sur un même point d'eau encastrable.",
    "La fontaine Les Arcs réunit l'eau froide, tiède et chaude en un seul point pratique, parfaite pour les espaces partagés à fort passage.",
    [("3", "températures d'eau"), ("30", "litres par heure"), ("micro", "filtration")]),
  ("fontaines", "fontaine-auron", "Auron", "Blupura", "assets/fontaines/blupura-colonne.webp", "assets/machine-stage-bg.webp",
    "élégance au quotidien",
    "Silhouette colonne en inox et finitions soignées pour les espaces d'accueil, halls et bureaux visibles.",
    "Avec sa colonne inox élancée, l'Auron habille les halls et zones d'accueil tout en délivrant une eau pure à grand débit.",
    [("3", "températures d'eau"), ("45", "litres par heure"), ("inox", "finition premium")]),
  ("fontaines", "fontaine-cluza", "Cluza", "Blupura", "assets/fontaines/blupura-noir.webp", "assets/machine-stage-bg.webp",
    "polyvalence pour toutes les pauses",
    "Eau froide, chaude et tiède pour le thé, les tisanes et l'hydratation des équipes tout au long de la journée.",
    "La Cluza accompagne toutes les pauses, du grand verre d'eau fraîche au thé brûlant, avec une finition noire sobre et élégante.",
    [("3", "températures d'eau"), ("30", "litres par heure"), ("micro", "filtration")]),
  ("fontaines", "fontaine-hydrazon", "Hydrazon", "Blupura", "assets/fontaines/blupura-usage.webp", "assets/machine-stage-bg.webp",
    "fraîcheur pétillante à la demande",
    "Eau plate et gazeuse pour varier les plaisirs et réduire les bouteilles plastique en entreprise.",
    "L'Hydrazon propose une eau plate ou pétillante à la demande, une alternative responsable et conviviale aux bouteilles plastique.",
    [("2", "types d'eau"), ("CO₂", "eau pétillante"), ("micro", "filtration")]),
  ("fontaines", "fontaine-tignes", "Tignes", "Borg & Overström", "assets/fontaines/borg-tignes.webp", "assets/machine-stage-bg.webp",
    "robinet encastrable haut de gamme",
    "Fontaine discrète intégrée au plan de travail, eau froide, tempérée et pétillante en un geste.",
    "Le robinet Tignes s'intègre au plan de travail pour une eau froide, tempérée ou pétillante immédiate, dans une finition inox haut de gamme.",
    [("3", "types d'eau"), ("inox", "finition premium"), ("micro", "filtration")]),
  ("fontaines", "fontaine-tania", "Tania", "Borg & Overström", "assets/fontaines/borg-tania.webp", "assets/machine-stage-bg.webp",
    "design minimaliste encastrable",
    "Solution compacte et élégante pour bureaux et salles de réunion exigeants, avec commandes tactiles intuitives.",
    "La Tania mise sur un design minimaliste et des commandes tactiles pour une expérience d'hydratation moderne et sans contact.",
    [("3", "types d'eau"), ("tactile", "commandes"), ("micro", "filtration")]),

  ("distributeurs", "distributeur-animo", "Animo", "Animo", "assets/machines/animo.webp", "assets/stage-animo.webp",
    "robustesse professionnelle",
    "Distributeur de boissons chaudes fiable et simple d'utilisation, conçu pour un usage intensif en entreprise.",
    "L'Animo enchaîne les services sans faiblir, une valeur sûre pour les salles de pause à fort passage qui exigent fiabilité et simplicité.",
    [("10", "boissons au choix"), ("120", "services par jour"), ("24/7", "disponibilité")]),
  ("distributeurs", "distributeur-wmf", "WMF", "WMF", "assets/machines/wmf.webp", "assets/stage-wmf.webp",
    "polyvalence et efficacité",
    "Grand écran tactile et large choix de boissons pour accueil, open space et zones à fort passage.",
    "La WMF combine grand écran tactile et large carte de boissons pour offrir une expérience moderne dans les espaces les plus fréquentés.",
    [("10", "boissons au choix"), ("150", "services par jour"), ("tactile", "grand écran")]),
  ("distributeurs", "distributeur-necta-concerto", "Necta Concerto", "Necta", "assets/machines/necta-concerto.png", "assets/machine-stage-bg.webp",
    "fiabilité au quotidien",
    "Distributeur de boissons chaudes compact et robuste, avec sélection intuitive pour un usage intensif en entreprise.",
    "Compact et robuste, le Necta Concerto délivre un large choix de boissons chaudes avec une sélection intuitive, idéal pour les espaces réduits.",
    [("20", "boissons au choix"), ("120", "gobelets par jour"), ("compact", "format")]),
  ("distributeurs", "distributeur-robimat-xs", "Robimat XS", "Sielaff", "assets/machines/sielaff-robimat.webp", "assets/machine-stage-bg.webp",
    "fraîcheur et visibilité",
    "Distributeur de boissons fraîches à vitrine lumineuse, idéal pour les zones de pause à fort passage.",
    "Le Robimat XS met en valeur boissons fraîches et snacks derrière une vitrine lumineuse, parfait pour les zones de pause animées.",
    [("40", "références fraîches"), ("5", "niveaux de vitrine"), ("24/7", "disponibilité")]),
  ("distributeurs", "distributeur-necta-opera", "Necta Opera", "Necta", "assets/machines/necta-opera.webp", "assets/machine-stage-bg.webp",
    "expérience tactile premium",
    "Grand écran tactile et large gamme de boissons chaudes pour une pause café moderne en entreprise.",
    "Le Necta Opera offre une expérience premium grâce à son grand écran tactile et sa large gamme de boissons chaudes personnalisables.",
    [("12", "boissons au choix"), ("620", "gobelets par jour"), ("tactile", "grand écran")]),
]

def slug_of(p): return p[1]

def build(p, cat_items):
    cat, slug, name, brand, img, stage_bg, subtitle, lead, text, stats = p
    c = CAT[cat]
    url = "%s/%s.html" % (DOMAIN, slug)
    img_url = "%s/%s" % (DOMAIN, img)
    title = "%s | %s | Juste à temps" % (name, c["label"].capitalize())

    # stats html
    stats_html = "\n".join(
      '              <div class="machine-detail__stat">\n'
      '                <span class="machine-detail__stat-value">%s</span>\n'
      '                <span class="machine-detail__stat-label">%s</span>\n'
      '              </div>' % (v, l) for v, l in stats)

    sp = c["specs"]
    g1 = "\n".join('                  <li>%s</li>' % x for x in sp["g1"])
    g2 = "\n".join('                  <li>%s</li>' % x for x in sp["g2"])
    g3 = "\n".join('                  <li>%s</li>' % x for x in sp["g3"])

    pricing_cards = ""
    for nm, frm, price, cur, per, items, feat in c["pricing"]:
        per_html = ('<span class="pricing-card__per">%s</span>' % per) if per else ""
        items_html = "\n".join('                  <li>%s</li>' % x for x in items)
        featcls = " pricing-card--featured" if feat else ""
        pricing_cards += '''            <article class="pricing-card%s">
              <h3 class="pricing-card__name">%s</h3>
              <p class="pricing-card__from">%s</p>
              <p class="pricing-card__price">%s<span class="pricing-card__cur">%s</span>%s</p>
              <ul class="pricing-card__list">
%s
              </ul>
              <a href="contact.html" class="btn btn-outline pricing-card__btn">Choisir</a>
              <a href="contact.html" class="pricing-card__link">En savoir plus sur notre offre de %s</a>
            </article>
''' % (featcls, nm, frm, price, cur, per_html, items_html, nm)

    # similar = 3 autres de la même catégorie (rotation)
    idx = cat_items.index(slug)
    others = [x for x in cat_items if x != slug]
    start = cat_items.index(slug)
    rotated = (cat_items[start+1:] + cat_items[:start])
    sims = rotated[:3]
    sim_html = ""
    for ss in sims:
        sp2 = next(x for x in PRODUCTS if x[1] == ss)
        _, sslug, sname, _, simg, _, stag, _, _, sstats = sp2
        s1 = sstats[0]; s2 = sstats[1]
        sim_html += '''            <article class="similar-card">
              <div class="similar-card__media">
                <img src="%s" alt="%s" width="240" height="210" loading="lazy" decoding="async" />
              </div>
              <h3 class="similar-card__name">%s</h3>
              <p class="similar-card__tagline">%s</p>
              <div class="similar-card__stats">
                <div class="similar-card__stat">
                  <span class="similar-card__stat-value">%s</span>
                  <span class="similar-card__stat-label">%s</span>
                </div>
                <div class="similar-card__stat">
                  <span class="similar-card__stat-value">%s</span>
                  <span class="similar-card__stat-label">%s</span>
                </div>
              </div>
              <a href="%s.html" class="btn btn-primary similar-card__btn">En savoir +</a>
            </article>
''' % (simg, sname, sname, stag, s1[0], s1[1], s2[0], s2[1], sslug)

    breadcrumb_pos2 = c["label"].capitalize()
    jsonld = '''    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Accueil", "item": "%s/" },
        { "@type": "ListItem", "position": 2, "name": "%s", "item": "%s/%s" },
        { "@type": "ListItem", "position": 3, "name": "%s", "item": "%s" }
      ]
    }
    </script>

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "%s",
      "image": "%s",
      "description": "%s",
      "category": "%s",
      "brand": { "@type": "Brand", "name": "%s" },
      "offers": { "@type": "Offer", "availability": "https://schema.org/InStock", "priceCurrency": "EUR", "url": "%s" }
    }
    </script>''' % (DOMAIN, breadcrumb_pos2, DOMAIN, c["index"], name, url,
                    name, img_url, lead, c["label"].capitalize(), brand, url)

    html = '''<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="%s" />
    <title>%s</title>
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="author" content="Juste à temps" />
    <meta name="theme-color" content="#c36043" />
    <link rel="canonical" href="%s" />

    <meta property="og:type" content="website" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:site_name" content="Juste à temps" />
    <meta property="og:title" content="%s" />
    <meta property="og:description" content="%s" />
    <meta property="og:url" content="%s" />
    <meta property="og:image" content="%s" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="%s" />
    <meta name="twitter:description" content="%s" />
    <meta name="twitter:image" content="%s" />

    <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png" />
    <link rel="apple-touch-icon" href="assets/apple-touch-icon.png" />
    <link rel="manifest" href="site.webmanifest" />

    <link rel="stylesheet" href="styles/main.min.css" />

%s
  </head>
  <body>
%s

    <main class="main--machine">
      <section class="machine-stage" aria-label="%s">
        <div class="machine-stage__bg" aria-hidden="true" style="background-image:url('%s')"></div>
        <img class="machine-stage__img" src="%s" alt="%s" width="480" height="480" decoding="async" />
      </section>

      <section class="machine-detail">
        <div class="container">
          <div class="machine-detail__grid">
            <div class="machine-detail__intro">
              <nav aria-label="Fil d'Ariane">
                <ol class="breadcrumb">
                  <li><a href="index.html">accueil</a></li>
                  <li><a href="%s">%s</a></li>
                  <li>%s</li>
                </ol>
              </nav>
              <h1 class="machine-detail__name">%s</h1>
              <p class="machine-detail__subtitle">%s</p>
              <p class="machine-detail__lead">%s</p>
              <hr class="machine-detail__divider" />
              <p class="machine-detail__text">%s</p>
              <a href="contact.html" class="btn btn-primary">Voir nos offres</a>
            </div>

            <div class="machine-detail__stats">
%s
            </div>
          </div>
        </div>
      </section>

      <section class="section machine-specs">
        <div class="container">
          <div class="machine-specs__head">
            <span class="machine-specs__eyebrow">fiche technique</span>
            <h2 class="machine-specs__title">Caractéristiques techniques</h2>
          </div>
          <div class="machine-specs__grid">
            <div class="machine-specs__media">
              <img src="%s" alt="%s" width="300" height="300" loading="lazy" decoding="async" />
            </div>
            <div class="machine-specs__body">
              <div class="machine-specs__cols">
                <div class="machine-specs__col">
                  <div class="spec-group">
                    <h3>%s</h3>
                    <ul>
%s
                    </ul>
                  </div>
                  <div class="spec-group">
                    <h3>%s</h3>
                    <ul>
%s
                    </ul>
                  </div>
                </div>
                <div class="machine-specs__col">
                  <div class="spec-group">
                    <h3>%s</h3>
                    <ul>
%s
                    </ul>
                  </div>
                  <div class="spec-group">
                    <h3>%s</h3>
                    <p>%s</p>
                  </div>
                </div>
                <form class="machine-specs__form" action="#" method="post">
                  <p class="machine-specs__form-title">Recevoir la fiche technique</p>
                  <div class="machine-specs__fields">
                    <input type="email" name="email" placeholder="e-mail*" required autocomplete="email" aria-label="E-mail" />
                    <div class="machine-specs__row2">
                      <input type="text" name="firstname" placeholder="prénom" autocomplete="given-name" aria-label="Prénom" />
                      <input type="text" name="lastname" placeholder="nom" autocomplete="family-name" aria-label="Nom" />
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary">Recevoir la fiche technique par e-mail</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section machine-pricing">
        <div class="container">
          <h2 class="machine-pricing__title">Tarifs</h2>
          <div class="pricing-grid">
%s          </div>
          <div class="machine-pricing__cta">
            <a href="contact.html" class="btn btn-primary">Être contacté</a>
          </div>
        </div>
      </section>

      <section class="section machine-similar">
        <div class="container">
          <h2 class="machine-similar__title">%s</h2>
          <div class="similar-grid">
%s          </div>
        </div>
      </section>

      <section class="section machine-outro">
        <div class="container">
          <h2 class="machine-outro__title">Intéressé par la %s ?</h2>
          <p class="machine-outro__lead">%s</p>
          <div class="machine-outro__actions">
            <a href="contact.html" class="btn btn-primary">Demander un devis</a>
            <a href="%s" class="btn btn-outline">Voir les autres modèles</a>
          </div>
        </div>
      </section>
    </main>

%s

    <script src="scripts/lenis.min.js" defer></script>
    <script src="scripts/main.min.js" defer></script>
  </body>
</html>
''' % (lead, title, url, title, lead, url, img_url, title, lead, img_url,
       jsonld, header(c["nav"]),
       name, stage_bg, img, name,
       c["index"], c["label"], name, name, subtitle, lead, text, stats_html,
       img, name,
       sp["g1t"], g1, sp["g2t"], g2, sp["g3t"], g3, sp["g4t"], sp["g4"],
       pricing_cards, c["similar_title"], sim_html,
       name, c["outro_lead"], c["index"], FOOTER)
    return html

# génération
by_cat = {}
for p in PRODUCTS:
    by_cat.setdefault(p[0], []).append(p[1])

created = []
for p in PRODUCTS:
    cat_items = by_cat[p[0]]
    html = build(p, cat_items)
    fn = p[1] + ".html"
    with open(fn, "w", encoding="utf-8") as f:
        f.write(html)
    created.append(fn)
    print("ecrit:", fn)

print("total:", len(created))
