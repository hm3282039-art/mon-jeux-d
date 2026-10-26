// ============================================================================
// Feuille de Route & Journal Officiel des Mises à Jour (Patch Notes)
// À mettre à jour à chaque nouvelle version déployée dans la Citadelle !
// ============================================================================

export const CURRENT_VERSION = 'v1.2';

export const PATCH_NOTES = [
  {
    version: 'v1.2.0',
    date: '26 Octobre 2026',
    title: 'Feuille de Route Intégrée & Synchronisation Continue',
    tag: 'MISE À JOUR ACTUELLE',
    isLatest: true,
    changes: [
      'Ajout du codex « Feuille de Route & Mises à Jour » directement accessible depuis la barre supérieure (bouton 📜 v1.2 ou touche R).',
      'Historique détaillé de toutes les versions déployées afin de suivre chaque nouveauté directement en jeu.',
      'Présentation des prochaines phases de développement de Chroniques d’Astria (Combat tactique animé, Sets de reliques, Raids & Guildes).',
      'Versionnage anti-cache renforcé et publication systématique sur le lien public permanent GitHub Pages.',
    ],
  },
  {
    version: 'v1.1.0',
    date: '26 Octobre 2026',
    title: 'Raffinement UI/UX, Auras Magiques & Immersion Plein Écran',
    tag: 'INTERFACE & VFX',
    isLatest: false,
    changes: [
      'Suppression complète de la barre de navigation inférieure pour dégager 100 % de l’illustration panoramique de la Citadelle.',
      'Intégration compacte du statut Auto-Bot et de l’indicateur « ∞ Farm Illimité » dans la barre supérieure.',
      'Refonte du Profil Seigneur (haut-gauche) : cadre d’avatar en or ouvragé à coins filigranés, badge de niveau lumineux et barre d’EXP ciselée.',
      'Effets de survol améliorés sur les 6 monuments : halo pulsant en arrière-plan, zoom fluide +5 % sur les bannières, sceaux runiques rotatifs et particules dédiées.',
      'Polissage des fenêtres modales : fond en verre dépoli sombre (backdrop-filter: blur), bordures dorées dynamiques et bouton « ✕ » ciselé.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '26 Octobre 2026',
    title: 'Fondation de la Citadelle Céleste d’Astria',
    tag: 'LANCEMENT INITIAL',
    isLatest: false,
    changes: [
      'Moteur HTML5 Canvas 60 FPS plein écran avec parallaxe fluide, rayons lumineux célestes (God Rays) et particules de mana en fusion additive.',
      'Ouverture des 6 bâtiments interactifs : Caserne des Héros, Forge & Atelier (+0 → +15), Portail de Combat (Campagne & Tour Infinie), Temple d’Invocation (Gacha & Pity 5★), Grand Colisée et Console Auto-Bot.',
      'Économie 100 % sans énergie ni stamina : compteurs animés d’Or Impérial (+Or/s continu), Cristaux Astraux, Insignes d’Honneur et PC d’Équipe.',
      'Framework sonore procédural Web Audio API (notes cristallines au survol, clics, onglets, enclume de forge et fanfares d’invocation).',
    ],
  },
];

export const ROADMAP_PHASES = [
  {
    phase: 'Phase I',
    status: 'done',
    statusLabel: 'Terminé ✓',
    title: 'Sanctuaire Céleste, UI Royale & Économie Illimitée',
    progress: 100,
    items: [
      'Panorama interactif 60 FPS avec parallaxe, God Rays et auras runiques au survol',
      '6 bâtiments cliquables reliés à leurs systèmes (Gacha, Héros, Forge +15, Portail, Colisée, Auto-Bot)',
      'Interface Haute-Fantaisie sans barre inférieure intrusive, profil doré ouvragé et verre dépoli',
    ],
  },
  {
    phase: 'Phase II',
    status: 'next',
    statusLabel: 'Prochaine Étape ⚡',
    title: 'Arène de Combat Tactique Animée & Cinématiques d’Ultime',
    progress: 35,
    items: [
      'Scène de combat temps réel / tour par tour avec sprites animés et attaques élémentaires',
      'Jauges d’action (ATB), déclenchement manuel ou Auto des compétences Ultimes avec cut-in illustré',
      'Boss de chapitres aux mécaniques uniques et récompenses de première victoire',
    ],
  },
  {
    phase: 'Phase III',
    status: 'planned',
    statusLabel: 'Prévu ✦',
    title: 'Sets de Reliques, Éveil 6★ & Donjons de Chasse',
    progress: 10,
    items: [
      'Bonus de sets d’équipement (Set Vitesse, Set Critique, Set Solaire, Set Vol de Vie)',
      'Sous-statistiques aléatoires, transmutation de runes à la Forge et Éveil stellaire 6★',
      'Chasses aux Wyvernes & Golems sans limite d’énergie pour récolter des matériaux rares',
    ],
  },
  {
    phase: 'Phase IV',
    status: 'planned',
    statusLabel: 'Prévu ✦',
    title: 'Hauts Faits Royaux, Ligues Saisonnières & Événements Astraux',
    progress: 0,
    items: [
      'Système de quêtes et Hauts Faits permanents offrant Cristaux Astraux et titres exclusifs',
      'Tournois saisonniers du Grand Colisée contre des escouades de Bots d’Élite',
      'Bannières d’invocation limitées avec nouveaux Champions Légendaires Lumière & Ombre',
    ],
  },
];
