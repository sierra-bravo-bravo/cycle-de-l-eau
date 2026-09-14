/**
 * Source de vérité unique du parcours.
 *
 * Le rail de progression, le panneau de texte, les pastilles et la timeline de
 * scroll dérivent tous de ce tableau. Les cadrages sont exprimés en
 * coordonnées monde `{ u, v, zoom }`, donc valables aussi bien pour le rendu
 * SVG actuel que pour le rendu Three.js de la phase B.
 */

import { ORIGIN } from "./plan";

export type Hotspot = {
  u: number;
  v: number;
  h: number;
  title: string;
  detail: string;
};

export type Chapter = {
  id: string;
  index: string;
  label: string;
  title: string;
  body: string;
  /** Station mise en avant ; les autres sont estompées. `null` = vue d'ensemble. */
  station: string | null;
  focus: { u: number; v: number; zoom: number };
  hotspots: Hotspot[];
};

const on = (id: string, du = 0, dv = 0, zoom = 1.55) => ({
  u: ORIGIN[id].u + du,
  v: ORIGIN[id].v + dv,
  zoom,
});

const spot = (id: string, du: number, dv: number, h: number, title: string, detail: string): Hotspot => ({
  u: ORIGIN[id].u + du,
  v: ORIGIN[id].v + dv,
  h,
  title,
  detail,
});

export const CHAPTERS: Chapter[] = [
  {
    id: "cycle",
    index: "00",
    label: "Le cycle",
    title: "De la ressource au milieu naturel",
    body: "Un même métier, six maillons. SOGEA conçoit, construit et exploite les ouvrages qui rendent l'eau potable, la distribuent, puis la collectent et la dépolluent avant son retour au milieu naturel.",
    station: null,
    focus: { u: 0, v: 0, zoom: 0.6 },
    hotspots: [],
  },
  {
    id: "captage",
    index: "01",
    label: "Étape 1.0",
    title: "Captage et stockage d'eau brute",
    body: "Prélèvement de la ressource en rivière, en nappe ou en retenue. Ouvrages de prise, stations de pompage et réservoirs d'eau brute dimensionnés pour absorber les variations de débit.",
    station: "captage",
    focus: on("captage", 8, 8),
    hotspots: [
      spot("captage", -20, -10, 3, "Bassin de stockage", "Réserve tampon qui sécurise l'alimentation de l'usine en cas d'étiage ou de pollution amont."),
      spot("captage", 26, -40, 15, "Station de pompage", "Groupes immergés à vitesse variable, pilotés à distance depuis la supervision."),
    ],
  },
  {
    id: "production",
    index: "02",
    label: "Étape 2.0",
    title: "Production d'eau potable",
    body: "Clarification, filtration et désinfection. L'usine transforme la ressource brute en eau conforme aux exigences sanitaires, avec un contrôle continu de la qualité en sortie.",
    station: "production",
    focus: on("production", 6, 6),
    hotspots: [
      spot("production", 0, -44, 19, "Filtration", "Files de filtres à sable et charbon actif, lavables automatiquement."),
      spot("production", 0, 6, 22, "Hall de traitement", "Coagulation, floculation et décantation avant affinage."),
    ],
  },
  {
    id: "distribution",
    index: "03",
    label: "Étape 3.0",
    title: "Distribution d'eau potable",
    body: "Réservoirs sur tour, conduites maîtresses et réseau de desserte. La pose, le renouvellement et la réparation des canalisations constituent le cœur historique du métier.",
    station: "distribution",
    focus: on("distribution", 10, 4, 1.35),
    hotspots: [
      spot("distribution", -14, -8, 80, "Château d'eau", "Mise en charge du réseau par gravité et réserve de sécurité incendie."),
      spot("distribution", 50, 20, 4, "Pose de canalisation", "Tranchée ouverte ou techniques sans tranchée selon la contrainte urbaine."),
    ],
  },
  {
    id: "collecte",
    index: "04",
    label: "Étape 4.0",
    title: "Collecte et transfert des eaux usées",
    body: "Branchements, collecteurs gravitaires et postes de relevage acheminent les effluents domestiques vers la station d'épuration, sans rupture de service.",
    station: "collecte",
    focus: on("collecte", 0, 6),
    hotspots: [
      spot("collecte", -46, 12, 13, "Poste de relevage", "Relève les effluents lorsque la pente naturelle ne suffit plus."),
      spot("collecte", -24, 34, 4, "Regard de visite", "Point d'accès pour l'inspection télévisée et le curage du collecteur."),
    ],
  },
  {
    id: "traitement",
    index: "05",
    label: "Étape 5.0",
    title: "Traitement des eaux usées",
    body: "Prétraitement, traitement biologique et clarification. Les boues sont épaissies et valorisées, l'eau traitée est contrôlée avant rejet.",
    station: "traitement",
    focus: on("traitement", -4, 6, 1.25),
    hotspots: [
      spot("traitement", -44, -32, 54, "Digesteur", "Méthanisation des boues et valorisation du biogaz produit."),
      spot("traitement", 32, -26, 7, "Clarificateur", "Séparation finale des boues activées et de l'eau épurée."),
    ],
  },
  {
    id: "rejet",
    index: "06",
    label: "Étape 6.0",
    title: "Retour au milieu naturel",
    body: "L'eau épurée rejoint la rivière par un ouvrage de rejet instrumenté. Les paramètres de sortie sont mesurés en continu et transmis à l'autorité de contrôle.",
    station: "traitement",
    focus: on("traitement", 120, 90, 0.9),
    hotspots: [
      spot("traitement", 150, 110, 3, "Ouvrage de rejet", "Mesure en continu du débit, de la turbidité et de l'oxygène dissous."),
    ],
  },
  {
    id: "bureau",
    index: "07",
    label: "Étape 7.0",
    title: "Bureau d'études",
    body: "En amont de chaque maillon, la conception : modélisation hydraulique, dimensionnement des ouvrages et méthodes d'exécution. C'est là que le cycle se referme.",
    station: "bureau",
    focus: on("bureau", 0, 0, 1.3),
    hotspots: [
      spot("bureau", 0, 0, 24, "Conception intégrée", "Modélisation du réseau, choix des matériaux et phasage des travaux."),
    ],
  },
];

export const OUTRO_ZOOM = 0.5;
