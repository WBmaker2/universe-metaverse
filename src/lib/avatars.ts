export type AvatarId =
  | "female-adventurer"
  | "female-person"
  | "male-adventurer"
  | "male-person"
  | "robot";

export type AvatarDefinition = {
  id: AvatarId;
  label: string;
  idlePath: string;
  walkPath: string;
  accent: string;
};

export const AVATARS: AvatarDefinition[] = [
  {
    id: "female-adventurer",
    label: "노란 탐험가",
    idlePath: "/characters/female-adventurer-idle.png",
    walkPath: "/characters/female-adventurer-walk0.png",
    accent: "#f9d66d",
  },
  {
    id: "female-person",
    label: "파란 학생",
    idlePath: "/characters/female-person-idle.png",
    walkPath: "/characters/female-person-walk0.png",
    accent: "#78c7ff",
  },
  {
    id: "male-adventurer",
    label: "초록 탐험가",
    idlePath: "/characters/male-adventurer-idle.png",
    walkPath: "/characters/male-adventurer-walk0.png",
    accent: "#79dfa6",
  },
  {
    id: "male-person",
    label: "빨간 학생",
    idlePath: "/characters/male-person-idle.png",
    walkPath: "/characters/male-person-walk0.png",
    accent: "#ff8b72",
  },
  {
    id: "robot",
    label: "은빛 로봇",
    idlePath: "/characters/robot-idle.png",
    walkPath: "/characters/robot-walk0.png",
    accent: "#d7e2f0",
  },
];

export const DEFAULT_AVATAR_ID: AvatarId = "female-adventurer";

export const AVATAR_BY_ID = AVATARS.reduce(
  (map, avatar) => {
    map[avatar.id] = avatar;
    return map;
  },
  {} as Record<AvatarId, AvatarDefinition>,
);

export function normalizeAvatarId(input: unknown): AvatarId {
  return typeof input === "string" && input in AVATAR_BY_ID
    ? (input as AvatarId)
    : DEFAULT_AVATAR_ID;
}
