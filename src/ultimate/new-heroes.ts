export type NewHeroId = 'talys' | 'ilya' | 'nox' | 'elowen' | 'brakar'
export type HeroArchetype = 'monk' | 'archer' | 'assassin' | 'druid' | 'titan'

export type NewHeroPresentation = {
  name: string
  title: string
  ultimate: string
  element: string
  portrait: string
  damage: number
  status: string
  statusDetail: string
  subtitle: string
  archetype: HeroArchetype
  color: string
  rgb: string
  secondary: string
  dark: string
}

export const NEW_HEROES: Record<NewHeroId, NewHeroPresentation> = {
  talys: {
    name: 'Talys', title: 'Le Poing de la Foudre', ultimate: 'Jugement Céleste',
    element: 'Foudre · Poings voltaïques', portrait: './assets/heroes/talys-portrait.webp',
    damage: 31800, status: 'Paralysie · 2 tours', statusDetail: 'Paralysie · 2 tours',
    subtitle: '« Le ciel rend son verdict ! »', archetype: 'monk',
    color: '#ffe477', rgb: '255, 222, 83', secondary: '112, 237, 255', dark: '#102c4a',
  },
  ilya: {
    name: 'Ilya', title: 'L’Archère de Givre', ultimate: 'Pointe de l’Hiver',
    element: 'Givre · Arc de cristal', portrait: './assets/heroes/ilya-portrait.webp',
    damage: 30500, status: 'Gel · 1 tour', statusDetail: 'Gel · 1 tour',
    subtitle: '« Que l’hiver te fige sur place ! »', archetype: 'archer',
    color: '#b9f2ff', rgb: '132, 221, 255', secondary: '225, 252, 255', dark: '#102b50',
  },
  nox: {
    name: 'Nox', title: 'La Lame du Crépuscule', ultimate: 'Danse des Éclipses',
    element: 'Ombre · Lames jumelles', portrait: './assets/heroes/nox-portrait.webp',
    damage: 34200, status: 'Saignement · 3 tours', statusDetail: 'Saignement · 3 tours',
    subtitle: '« Ton ombre était déjà à tes trousses. »', archetype: 'assassin',
    color: '#e5a4ff', rgb: '197, 105, 255', secondary: '255, 105, 190', dark: '#28123f',
  },
  elowen: {
    name: 'Elowen', title: 'La Voix de la Sylve', ultimate: 'Sanctuaire Sauvage',
    element: 'Nature · Bâton druidique', portrait: './assets/heroes/elowen-portrait.webp',
    damage: 29800, status: 'Racines · 2 tours', statusDetail: 'Entrave · 2 tours',
    subtitle: '« La forêt reprend toujours ses droits. »', archetype: 'druid',
    color: '#a8efb5', rgb: '105, 220, 137', secondary: '235, 222, 122', dark: '#123d32',
  },
  brakar: {
    name: 'Brakar', title: 'Le Titan d’Ébène', ultimate: 'Séisme du Zénith',
    element: 'Terre · Poings runiques', portrait: './assets/heroes/brakar-portrait.webp',
    damage: 35100, status: 'Armure −25 % · 3 tours', statusDetail: 'Armure réduite · 3 tours',
    subtitle: '« Je vais te rendre à la poussière ! »', archetype: 'titan',
    color: '#f0bd82', rgb: '226, 145, 72', secondary: '255, 224, 157', dark: '#3d271d',
  },
}

// Timed production storyboards: written before the five new rigs and effects.
export const NEW_STORYBOARDS: Record<NewHeroId, Array<[string, string, string, string]>> = {
  talys: [
    ['0,00 – 0,55', 'I', 'Le tonnerre retenu', 'Le dragon respire ; Talys verrouille ses appuis et retient la charge.'],
    ['0,55 – 1,35', 'II', 'Le regard voltaïque', 'Gros plan animé, arcs entre ses poings et concentration.'],
    ['1,35 – 2,35', 'III', 'Le sprint éclair', 'Accélération au sol et rémanences lumineuses en traveling.'],
    ['2,35 – 3,45', 'IV', 'Le pilier céleste', 'Ascension dans un éclair vertical et caméra orbitale.'],
    ['3,45 – 4,50', 'V', 'Jugement Céleste', 'Descente accélérée, poing avant et dragon en garde.'],
    ['4,50 – 5,65', 'VI', 'La foudre frappe', 'Dégâts uniques, arcs au sol, réaction et rugissement.'],
    ['5,65 – 8,00', 'VII', 'Après la décharge', 'Réception, dissipation des arcs et retour au combat.'],
  ],
  ilya: [
    ['0,00 – 0,55', 'I', 'La cible dans la brume', 'Ilya observe le dragon et ajuste sa garde.'],
    ['0,55 – 1,35', 'II', 'La corde de givre', 'Gros plan, respiration et cristal qui naît sur la corde.'],
    ['1,35 – 2,35', 'III', 'Le pas de chasse', 'Recul sauté, pivot et armement de l’arc en traveling.'],
    ['2,35 – 3,45', 'IV', 'La flèche de cristal', 'La flèche se déploie pendant une caméra orbitale.'],
    ['3,45 – 4,50', 'V', 'Pointe de l’Hiver', 'Tir accéléré et trajectoire lisible jusqu’au dragon.'],
    ['4,50 – 5,65', 'VI', 'L’hiver absolu', 'Dégâts uniques, cristaux, gel et réaction du dragon.'],
    ['5,65 – 8,00', 'VII', 'Le silence blanc', 'Dégel des particules, récupération et retour au combat.'],
  ],
  nox: [
    ['0,00 – 0,55', 'I', 'L’ombre avant la lame', 'Nox disparaît dans sa garde pendant que le dragon le cherche.'],
    ['0,55 – 1,35', 'II', 'Le regard du crépuscule', 'Gros plan animé et reflet violet sur les deux lames.'],
    ['1,35 – 2,35', 'III', 'Les pas sans trace', 'Course brisée et doubles résiduels en traveling.'],
    ['2,35 – 3,45', 'IV', 'Les doubles de l’éclipse', 'Rotation, clones d’action et caméra orbitale.'],
    ['3,45 – 4,50', 'V', 'Danse des Éclipses', 'Dash descendant et croisement des lames sur la cible.'],
    ['4,50 – 5,65', 'VI', 'La nuit tranche', 'Dégâts uniques, entaille double et réaction du dragon.'],
    ['5,65 – 8,00', 'VII', 'Retour des ombres', 'Les doubles se rejoignent, récupération et retour au combat.'],
  ],
  elowen: [
    ['0,00 – 0,55', 'I', 'Le souffle de la forêt', 'Elowen écoute la sève tandis que le dragon s’agite.'],
    ['0,55 – 1,35', 'II', 'Le serment de sève', 'Gros plan, yeux lumineux et feuilles autour du bâton.'],
    ['1,35 – 2,35', 'III', 'La montée du sanctuaire', 'Lévitation, tissu et cheveux portés par le vent.'],
    ['2,35 – 3,45', 'IV', 'La couronne vivante', 'Cercle de feuilles et caméra orbitale autour d’Elowen.'],
    ['3,45 – 4,50', 'V', 'Sanctuaire Sauvage', 'Les racines foncent vers le dragon en trajectoire continue.'],
    ['4,50 – 5,65', 'VI', 'La terre s’éveille', 'Dégâts uniques, racines, pétales et réaction du dragon.'],
    ['5,65 – 8,00', 'VII', 'Le sanctuaire s’apaise', 'Retour des feuilles, récupération et retour au combat.'],
  ],
  brakar: [
    ['0,00 – 0,55', 'I', 'Le poids du titan', 'Brakar frappe ses poings et le dragon répond d’un mouvement d’ailes.'],
    ['0,55 – 1,35', 'II', 'Les runes d’ébène', 'Gros plan animé, runes et muscles sous tension.'],
    ['1,35 – 2,35', 'III', 'La charge du colosse', 'Course lourde, poussière et caméra rapprochée au sol.'],
    ['2,35 – 3,45', 'IV', 'Le bond du titan', 'Saut vertical et rotation courte en caméra orbitale.'],
    ['3,45 – 4,50', 'V', 'Séisme du Zénith', 'Descente accélérée, deux poings vers le point d’impact.'],
    ['4,50 – 5,65', 'VI', 'Le monde se fend', 'Dégâts uniques, cratère, rochers et réaction du dragon.'],
    ['5,65 – 8,00', 'VII', 'La montagne demeure', 'Réception lourde, poussière et retour au combat.'],
  ],
}
