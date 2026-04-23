import type { PlanetId, PlanetTrack } from "./types";

export const WORLD_SIZE = {
  width: 2200,
  height: 1400,
};

export const PLANETS: PlanetTrack[] = [
  {
    id: "mercury",
    name: "수성",
    trackTitle: "행성 중 제3곡 수성",
    audioPath: "/audio/mercury.mp3",
    color: "#d7c0a1",
    accent: "#fff3d1",
    x: 370,
    y: 360,
    radius: 34,
    activationRadius: 150,
    note: "빠르게 반짝이는 선율에 집중해 보세요.",
  },
  {
    id: "venus",
    name: "금성",
    trackTitle: "행성 중 제2곡 금성",
    audioPath: "/audio/venus.mp3",
    color: "#f2c27d",
    accent: "#ffe2aa",
    x: 650,
    y: 850,
    radius: 50,
    activationRadius: 175,
    note: "부드럽고 평화로운 분위기를 느껴 보세요.",
  },
  {
    id: "earth",
    name: "지구",
    trackTitle: "푸른 바다 만들기",
    audioPath: "/audio/earth-blue-sea.mp3",
    color: "#3e9fe8",
    accent: "#8de2cf",
    x: 930,
    y: 520,
    radius: 58,
    activationRadius: 190,
    note: "지구의 물과 생명을 떠올리며 감상해 보세요.",
  },
  {
    id: "mars",
    name: "화성",
    trackTitle: "행성 중 제1곡 화성",
    audioPath: "/audio/mars.mp3",
    color: "#c4513b",
    accent: "#ff9a77",
    x: 1190,
    y: 980,
    radius: 48,
    activationRadius: 180,
    note: "강한 리듬과 긴장감을 찾아보세요.",
  },
  {
    id: "jupiter",
    name: "목성",
    trackTitle: "행성 중 제4곡 목성",
    audioPath: "/audio/jupiter.mp3",
    color: "#d49a63",
    accent: "#ffd0a0",
    x: 1450,
    y: 420,
    radius: 88,
    activationRadius: 235,
    note: "웅장한 선율이 어떻게 펼쳐지는지 들어보세요.",
  },
  {
    id: "saturn",
    name: "토성",
    trackTitle: "행성 중 제5곡 토성",
    audioPath: "/audio/saturn.mp3",
    color: "#d9c58d",
    accent: "#fff0ba",
    x: 1670,
    y: 950,
    radius: 76,
    activationRadius: 220,
    note: "느린 흐름과 깊은 울림을 관찰해 보세요.",
  },
  {
    id: "uranus",
    name: "천왕성",
    trackTitle: "행성 중 제6곡 천왕성",
    audioPath: "/audio/uranus.mp3",
    color: "#7cdad7",
    accent: "#c8fffb",
    x: 1870,
    y: 280,
    radius: 62,
    activationRadius: 195,
    note: "예상 밖의 변화와 장난스러운 느낌을 찾아보세요.",
  },
  {
    id: "neptune",
    name: "해왕성",
    trackTitle: "행성 중 제7곡 해왕성",
    audioPath: "/audio/neptune.mp3",
    color: "#557be8",
    accent: "#aabfff",
    x: 2040,
    y: 760,
    radius: 62,
    activationRadius: 200,
    note: "멀어지는 듯한 신비로운 소리를 느껴보세요.",
  },
];

export const PLANET_BY_ID = PLANETS.reduce(
  (map, planet) => {
    map[planet.id] = planet;
    return map;
  },
  {} as Record<PlanetId, PlanetTrack>,
);

export function getNearestActivePlanet(x: number, y: number): PlanetTrack | null {
  let nearest: PlanetTrack | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const planet of PLANETS) {
    const distance = Math.hypot(x - planet.x, y - planet.y);
    if (distance <= planet.activationRadius && distance < nearestDistance) {
      nearest = planet;
      nearestDistance = distance;
    }
  }

  return nearest;
}
