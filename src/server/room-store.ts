import { DEFAULT_AVATAR_ID, normalizeAvatarId } from "@/lib/avatars";
import { PLANETS, WORLD_SIZE } from "@/lib/planets";
import { moderateChatMessage } from "@/lib/moderation";
import type {
  ChatMessage,
  ClassroomSession,
  Participant,
  PlanetId,
  RoomState,
} from "@/lib/types";

type RoomRecord = {
  session: ClassroomSession;
  participants: Map<string, Participant>;
  messages: ChatMessage[];
};

type MemoryStore = {
  rooms: Map<string, RoomRecord>;
};

const SESSION_HOURS = 8;
const STALE_PARTICIPANT_MS = 2 * 60 * 1000;
const MAX_MESSAGES = 80;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PARTICIPANT_COLORS = [
  "#7dd3fc",
  "#fda4af",
  "#86efac",
  "#fde68a",
  "#c4b5fd",
  "#f0abfc",
  "#67e8f9",
  "#fdba74",
];

const globalForRooms = globalThis as unknown as {
  __universeMetaverseStore?: MemoryStore;
};

const store =
  globalForRooms.__universeMetaverseStore ??
  (globalForRooms.__universeMetaverseStore = {
    rooms: new Map<string, RoomRecord>(),
  });

function isoNow() {
  return new Date().toISOString();
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function generateSessionCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }

    if (!store.rooms.has(code)) {
      return code;
    }
  }

  return crypto.randomUUID().slice(0, 6).toUpperCase();
}

function createStartPosition(index: number) {
  const angle = (index / 8) * Math.PI * 2;
  return {
    x: WORLD_SIZE.width / 2 + Math.cos(angle) * 120,
    y: WORLD_SIZE.height / 2 + Math.sin(angle) * 120,
  };
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function sanitizeDisplayName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 16) || "학생";
}

function pruneRoom(room: RoomRecord) {
  const cutoff = Date.now() - STALE_PARTICIPANT_MS;

  for (const [participantId, participant] of room.participants.entries()) {
    if (new Date(participant.lastSeenAt).getTime() < cutoff) {
      room.participants.delete(participantId);
    }
  }
}

export function createSession(input: { teacherName?: string; title?: string }) {
  const now = new Date();
  const code = generateSessionCode();
  const session: ClassroomSession = {
    id: crypto.randomUUID(),
    code,
    title: input.title?.trim() || "우주 음악 감상 수업",
    teacherName: input.teacherName?.trim() || "선생님",
    status: "active",
    createdAt: now.toISOString(),
    expiresAt: addHours(now, SESSION_HOURS).toISOString(),
  };

  store.rooms.set(code, {
    session,
    participants: new Map<string, Participant>(),
    messages: [],
  });

  return session;
}

export function getRoom(codeInput: string) {
  const code = normalizeCode(codeInput);
  const room = store.rooms.get(code);

  if (!room) {
    return null;
  }

  pruneRoom(room);
  return room;
}

export function getRoomState(codeInput: string): RoomState | null {
  const room = getRoom(codeInput);

  if (!room) {
    return null;
  }

  return {
    session: room.session,
    participants: [...room.participants.values()],
    messages: room.messages,
  };
}

export function joinRoom(codeInput: string, name: string, avatarId: unknown = DEFAULT_AVATAR_ID) {
  const room = getRoom(codeInput);

  if (!room || room.session.status !== "active") {
    return null;
  }

  const participantIndex = room.participants.size;
  const position = createStartPosition(participantIndex);
  const participant: Participant = {
    id: crypto.randomUUID(),
    sessionCode: room.session.code,
    displayName: sanitizeDisplayName(name),
    avatarId: normalizeAvatarId(avatarId),
    color: PARTICIPANT_COLORS[participantIndex % PARTICIPANT_COLORS.length],
    x: position.x,
    y: position.y,
    activePlanetId: null,
    joinedAt: isoNow(),
    lastSeenAt: isoNow(),
  };

  room.participants.set(participant.id, participant);

  return {
    session: room.session,
    participant,
  };
}

export function updateParticipant(
  codeInput: string,
  participantId: string,
  input: { x?: number; y?: number; activePlanetId?: PlanetId | null },
) {
  const room = getRoom(codeInput);

  if (!room) {
    return null;
  }

  const participant = room.participants.get(participantId);

  if (!participant) {
    return null;
  }

  const nextX = typeof input.x === "number" ? input.x : participant.x;
  const nextY = typeof input.y === "number" ? input.y : participant.y;
  let activePlanetId: PlanetId | null = participant.activePlanetId;

  const requestedPlanetId = input.activePlanetId;

  if (requestedPlanetId === null) {
    activePlanetId = null;
  } else if (
    typeof requestedPlanetId === "string" &&
    PLANETS.some((planet) => planet.id === requestedPlanetId)
  ) {
    activePlanetId = requestedPlanetId;
  }

  const updated: Participant = {
    ...participant,
    x: Math.min(WORLD_SIZE.width, Math.max(0, nextX)),
    y: Math.min(WORLD_SIZE.height, Math.max(0, nextY)),
    activePlanetId,
    lastSeenAt: isoNow(),
  };

  room.participants.set(participant.id, updated);
  return updated;
}

export function addChatMessage(codeInput: string, participantId: string, body: string) {
  const room = getRoom(codeInput);

  if (!room) {
    return {
      ok: false as const,
      reason: "세션을 찾을 수 없습니다.",
    };
  }

  const participant = room.participants.get(participantId);

  if (!participant) {
    return {
      ok: false as const,
      reason: "참가자 정보를 찾을 수 없습니다.",
    };
  }

  const moderation = moderateChatMessage(body);

  if (!moderation.allowed) {
    return {
      ok: false as const,
      reason: moderation.reason ?? "메시지를 보낼 수 없습니다.",
    };
  }

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    sessionCode: room.session.code,
    participantId: participant.id,
    displayName: participant.displayName,
    body: moderation.sanitized,
    createdAt: isoNow(),
    moderationStatus: "allowed",
  };

  room.messages = [...room.messages, message].slice(-MAX_MESSAGES);
  participant.lastSeenAt = isoNow();
  room.participants.set(participant.id, participant);

  return {
    ok: true as const,
    message,
  };
}
