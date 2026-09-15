/**
 * Source de vérité unique du parcours.
 *
 * Cadrages en fractions d'image `{ x, y, zoom }` et `flow` relevé sur la carte
 * d'écoulement (`scripts/sample-flow.mjs`) : l'eau atteint chaque ouvrage au
 * moment où le chapitre correspondant prend la main.
 */

export type Hotspot = {
  x: number;
  y: number;
  title: string;
  detail: string;
};

export type Chapter = {
  id: string;
  index: string;
  label: string;
  title: string;
  body: string;
  focus: { x: number; y: number; zoom: number; flow: number };
  hotspots: Hotspot[];
};

export const CHAPTERS: Chapter[] = [
  {
    id: "cycle",
    index: "00",
    label: "Vue d'ensemble",
    title: "De la ressource au milieu naturel",
    body: "Un même métier, six maillons. SOGEA conçoit, construit et exploite les ouvrages qui rendent l'eau potable, la distribuent, puis la collectent et la dépolluent avant son retour au milieu naturel.",
    focus: { x: 0.499, y: 0.511, zoom: 0.75, flow: 0 },
    hotspots: [],
  },
  {
    id: "captage",
    index: "1",
    label: "Étape 1",
    title: "Captage et stockage d'eau brute",
    body: "Prélèvement de la ressource en rivière, en nappe ou en retenue. Ouvrages de prise, stations de pompage et réservoirs d'eau brute dimensionnés pour absorber les variations de débit.",
    focus: { x: 0.3, y: 0.209, zoom: 1.76, flow: 0.18 },
    hotspots: [
      {
        x: 0.305,
        y: 0.138,
        title: "Bassin de stockage",
        detail:
          "Réserve tampon qui sécurise l'alimentation de l'usine en cas d'étiage ou de pollution amont.",
      },
      {
        x: 0.075,
        y: 0.247,
        title: "Prise d'eau",
        detail:
          "Ouvrage de prélèvement en rivière, premier maillon du réseau d'adduction.",
      },
    ],
  },
  {
    id: "production",
    index: "2",
    label: "Étape 2",
    title: "Production d'eau potable",
    body: "Clarification, filtration et désinfection. L'usine transforme la ressource brute en eau conforme aux exigences sanitaires, avec un contrôle continu de la qualité en sortie.",
    focus: { x: 0.185, y: 0.397, zoom: 1.8, flow: 0.22 },
    hotspots: [
      {
        x: 0.185,
        y: 0.369,
        title: "Usine de production",
        detail:
          "Coagulation, floculation, filtration et désinfection avant mise en distribution.",
      },
    ],
  },
  {
    id: "distribution",
    index: "3",
    label: "Étape 3",
    title: "Distribution d'eau potable",
    body: "Réservoirs sur tour, conduites maîtresses et réseau de desserte. La pose, le renouvellement et la réparation des canalisations constituent le cœur historique du métier.",
    focus: { x: 0.32, y: 0.604, zoom: 1.61, flow: 0.32 },
    hotspots: [
      {
        x: 0.262,
        y: 0.604,
        title: "Château d'eau",
        detail:
          "Mise en charge du réseau par gravité et réserve de sécurité incendie.",
      },
      {
        x: 0.439,
        y: 0.586,
        title: "Pose de canalisation",
        detail:
          "Tranchée ouverte ou techniques sans tranchée selon la contrainte urbaine.",
      },
    ],
  },
  {
    id: "collecte",
    index: "4",
    label: "Étape 4",
    title: "Collecte et transfert des eaux usées",
    body: "Branchements, collecteurs gravitaires et postes de relevage acheminent les effluents domestiques vers la station d'épuration, sans rupture de service.",
    focus: { x: 0.559, y: 0.266, zoom: 1.76, flow: 0.68 },
    hotspots: [
      {
        x: 0.572,
        y: 0.257,
        title: "Abonnés",
        detail:
          "Le branchement domestique restitue les eaux usées au collecteur, premier maillon de l'assainissement.",
      },
    ],
  },
  {
    id: "traitement",
    index: "5",
    label: "Étape 5",
    title: "Traitement des eaux usées",
    body: "Prétraitement, traitement biologique et clarification. Les boues sont épaissies et valorisées, l'eau traitée est contrôlée avant rejet.",
    focus: { x: 0.779, y: 0.416, zoom: 1.65, flow: 0.76 },
    hotspots: [
      {
        x: 0.789,
        y: 0.435,
        title: "Clarificateurs",
        detail:
          "Séparation finale des boues activées et de l'eau épurée avant rejet.",
      },
    ],
  },
  {
    id: "rejet",
    index: "6",
    label: "Étape 6",
    title: "Retour au milieu naturel",
    body: "L'eau épurée rejoint la rivière par un ouvrage de rejet instrumenté. Les paramètres de sortie sont mesurés en continu et transmis à l'autorité de contrôle.",
    focus: { x: 0.82, y: 0.52, zoom: 1.55, flow: 1 },
    hotspots: [
      {
        x: 0.903,
        y: 0.595,
        title: "Ouvrage de rejet",
        detail:
          "Mesure en continu du débit, de la turbidité et de l'oxygène dissous.",
      },
    ],
  },
];
