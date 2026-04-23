import type { AvatarId } from "./avatars";

export type PlanetId =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export type PlanetTrack = {
  id: PlanetId;
  name: string;
  trackTitle: string;
  audioPath: string;
  imagePath: string;
  color: string;
  accent: string;
  x: number;
  y: number;
  radius: number;
  activationRadius: number;
  note: string;
};

export type SessionStatus = "active" | "ended";

export type ClassroomSession = {
  id: string;
  code: string;
  title: string;
  teacherName: string;
  status: SessionStatus;
  createdAt: string;
  expiresAt: string;
};

export type Participant = {
  id: string;
  sessionCode: string;
  displayName: string;
  avatarId: AvatarId;
  color: string;
  x: number;
  y: number;
  activePlanetId: PlanetId | null;
  joinedAt: string;
  lastSeenAt: string;
};

export type ChatMessage = {
  id: string;
  sessionCode: string;
  participantId: string;
  displayName: string;
  body: string;
  createdAt: string;
  moderationStatus: "allowed" | "blocked";
};

export type RoomState = {
  session: ClassroomSession;
  participants: Participant[];
  messages: ChatMessage[];
};

export type JoinResponse = {
  session: ClassroomSession;
  participant: Participant;
};
