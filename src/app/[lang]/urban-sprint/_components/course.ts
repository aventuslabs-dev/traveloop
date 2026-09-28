/**
 * The landmarks of the Urban Sprint course, as the entrance map shows them.
 *
 * Teams must cross 6 of them, in any order, so there is no official
 * sequence: they are numbered here in the order of a walking loop from the
 * fort, which is also the order the map's tour flies them in. Coordinates are
 * the landmarks' own (OpenStreetMap; Wikipedia for Sri Mahamariamman), photos
 * are the ones from the campaign deck.
 */

export type Checkpoint = {
  id: string;
  name: string;
  blurb: string;
  /** [longitude, latitude] — the order MapLibre takes them in. */
  at: [number, number];
  photo: string;
};

export const CHECKPOINTS_TO_CROSS = 6;
export const SIDE_MISSIONS = "50+";

export const CHECKPOINTS: Checkpoint[] = [
  {
    id: "fort-cornwallis",
    name: "Fort Cornwallis",
    blurb: "The star fort on the cape where Francis Light landed in 1786. Its cannons still face the sea.",
    at: [100.34433, 5.42045],
    photo: "/urban-sprint/landmarks/fort-cornwallis.jpg",
  },
  {
    id: "town-hall",
    name: "Town Hall",
    blurb: "George Town's grand colonial hall, white as icing, looking out over the Padang.",
    at: [100.34111, 5.42116],
    photo: "/urban-sprint/landmarks/town-hall.jpg",
  },
  {
    id: "st-georges",
    name: "St George's Church",
    blurb: "The oldest Anglican church in Southeast Asia, consecrated in 1819.",
    at: [100.33909, 5.41962],
    photo: "/urban-sprint/landmarks/st-georges.jpg",
  },
  {
    id: "kuan-yin",
    name: "Kuan Yin Temple",
    blurb: "The Goddess of Mercy temple, one of Penang's oldest, always thick with incense smoke.",
    at: [100.33856, 5.41869],
    photo: "/urban-sprint/landmarks/kuan-yin.jpg",
  },
  {
    id: "sri-mariamman",
    name: "Sri Maha Mariamman Temple",
    blurb: "Penang's oldest Hindu temple, its gopuram crowded with carved deities, in the heart of Little India.",
    at: [100.33972, 5.4175],
    photo: "/urban-sprint/landmarks/sri-mariamman.jpg",
  },
  {
    id: "kapitan-keling",
    name: "Masjid Kapitan Keling",
    blurb: "Domes, arches and a minaret, built for the Indian Muslim community in 1801.",
    at: [100.33705, 5.41695],
    photo: "/urban-sprint/landmarks/kapitan-keling.jpg",
  },
  {
    id: "acheen-mosque",
    name: "Acheen Street Mosque",
    blurb: "The Malay mosque founded in 1808 by an Acehnese merchant prince, with its slender minaret.",
    at: [100.33613, 5.4144],
    photo: "/urban-sprint/landmarks/acheen-mosque.jpg",
  },
  {
    id: "khoo-kongsi",
    name: "Khoo Kongsi",
    blurb: "The most ornate clan house in Malaysia, gilded and carved, tucked away off Cannon Square.",
    at: [100.33759, 5.41427],
    photo: "/urban-sprint/landmarks/khoo-kongsi.jpg",
  },
  {
    id: "clan-jetties",
    name: "The Clan Jetties",
    blurb: "Villages on stilts over the strait, each jetty home to one Chinese clan.",
    at: [100.34003, 5.41197],
    photo: "/urban-sprint/landmarks/clan-jetties.jpg",
  },
];

/** The box every landmark fits in. */
export const COURSE_BOUNDS: [[number, number], [number, number]] = CHECKPOINTS.reduce<
  [[number, number], [number, number]]
>(
  ([[w, s], [e, n]], { at: [x, y] }) => [
    [Math.min(w, x), Math.min(s, y)],
    [Math.max(e, x), Math.max(n, y)],
  ],
  [
    [180, 90],
    [-180, -90],
  ],
);
