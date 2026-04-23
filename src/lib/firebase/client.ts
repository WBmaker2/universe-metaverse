"use client";

import { DEFAULT_AVATAR_ID, normalizeAvatarId, type AvatarId } from "@/lib/avatars";
import { WORLD_SIZE } from "@/lib/planets";
import type { ChatMessage, ClassroomSession, Participant, PlanetId, RoomState } from "@/lib/types";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInAnonymously,
  signInWithPopup,
  type Auth,
  type User,
} from "firebase/auth";
import {
  get,
  getDatabase,
  onValue,
  push,
  ref,
  set,
  update,
  type DataSnapshot,
  type Database,
} from "firebase/database";

type FirebaseClients = {
  app: FirebaseApp;
  auth: Auth;
  db: Database;
};

type FirebaseSession = ClassroomSession & {
  teacherUid?: string;
};

const SESSION_HOURS = 8;
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

let cachedClients: FirebaseClients | null = null;

export function hasFirebaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );
}

export function getFirebaseClients() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  if (!cachedClients) {
    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          });

    cachedClients = {
      app,
      auth: getAuth(app),
      db: getDatabase(app),
    };
  }

  return cachedClients;
}

export async function signInTeacherWithGoogle() {
  const clients = requireFirebaseClients();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(clients.auth, provider);
  return credential.user;
}

export async function createFirebaseSession(input: { teacherName: string; title: string }) {
  const clients = requireFirebaseClients();
  const user =
    clients.auth.currentUser && !clients.auth.currentUser.isAnonymous
      ? clients.auth.currentUser
      : await signInTeacherWithGoogle();
  const code = await createUniqueSessionCode(clients.db);
  const now = new Date();
  const session: FirebaseSession = {
    id: crypto.randomUUID(),
    code,
    title: sanitizeText(input.title, 32) || "우주 음악 감상 수업",
    teacherName: sanitizeText(input.teacherName, 18) || user.displayName || "선생님",
    teacherUid: user.uid,
    status: "active",
    createdAt: now.toISOString(),
    expiresAt: addHours(now, SESSION_HOURS).toISOString(),
  };

  await set(ref(clients.db, `rooms/${code}/session`), session);
  return sessionToClassroomSession(session);
}

export async function joinFirebaseRoom(codeInput: string, name: string, avatarId: AvatarId) {
  const clients = requireFirebaseClients();
  const code = normalizeCode(codeInput);
  const sessionSnapshot = await get(ref(clients.db, `rooms/${code}/session`));

  if (!sessionSnapshot.exists()) {
    throw new Error("입장할 수 있는 세션을 찾지 못했습니다.");
  }

  const session = sessionFromSnapshot(sessionSnapshot, code);
  if (session.status !== "active" || Date.parse(session.expiresAt) <= Date.now()) {
    throw new Error("입장할 수 있는 세션을 찾지 못했습니다.");
  }

  const user = await ensureFirebaseUser(clients.auth);
  const participantsSnapshot = await get(ref(clients.db, `rooms/${code}/participants`));
  const participantCount = participantsSnapshot.exists()
    ? Object.keys(participantsSnapshot.val() as Record<string, unknown>).length
    : 0;
  const position = createStartPosition(participantCount);
  const participant: Participant = {
    id: user.uid,
    sessionCode: code,
    displayName: sanitizeText(name, 16) || "학생",
    avatarId: normalizeAvatarId(avatarId),
    color: PARTICIPANT_COLORS[participantCount % PARTICIPANT_COLORS.length],
    x: position.x,
    y: position.y,
    activePlanetId: null,
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  await set(ref(clients.db, `rooms/${code}/participants/${user.uid}`), participant);

  return {
    session,
    participant,
  };
}

export function subscribeFirebaseRoom(
  codeInput: string,
  onState: (state: RoomState) => void,
  onError: (error: Error) => void,
) {
  const clients = getFirebaseClients();
  if (!clients) {
    return null;
  }

  const code = normalizeCode(codeInput);
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void ensureFirebaseUser(clients.auth)
    .then(() => {
      if (cancelled) {
        return;
      }

      unsubscribe = onValue(
        ref(clients.db, `rooms/${code}`),
        (snapshot) => {
          const state = roomStateFromSnapshot(snapshot, code);
          if (state) {
            onState(state);
          } else {
            onError(new Error("세션 상태를 불러오지 못했습니다."));
          }
        },
        (error) => onError(error),
      );
    })
    .catch((error) => onError(error instanceof Error ? error : new Error(String(error))));

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function updateFirebaseParticipant(
  codeInput: string,
  participantId: string,
  input: {
    x: number;
    y: number;
    activePlanetId: PlanetId | null;
  },
) {
  const clients = requireFirebaseClients();
  const code = normalizeCode(codeInput);
  await update(ref(clients.db, `rooms/${code}/participants/${participantId}`), {
    x: clamp(input.x, 0, WORLD_SIZE.width),
    y: clamp(input.y, 0, WORLD_SIZE.height),
    activePlanetId: input.activePlanetId,
    lastSeenAt: new Date().toISOString(),
  });
}

export async function sendFirebaseChatMessage(input: {
  code: string;
  participantId: string;
  displayName: string;
  body: string;
}) {
  const clients = requireFirebaseClients();
  const code = normalizeCode(input.code);
  const messageRef = push(ref(clients.db, `rooms/${code}/messages`));
  const message: ChatMessage = {
    id: messageRef.key ?? crypto.randomUUID(),
    sessionCode: code,
    participantId: input.participantId,
    displayName: sanitizeText(input.displayName, 16) || "학생",
    body: input.body.trim().slice(0, 180),
    createdAt: new Date().toISOString(),
    moderationStatus: "allowed",
  };

  await set(messageRef, message);
  return message;
}

function requireFirebaseClients() {
  const clients = getFirebaseClients();
  if (!clients) {
    throw new Error("Firebase 환경변수가 필요합니다.");
  }

  return clients;
}

async function ensureFirebaseUser(auth: Auth): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

async function createUniqueSessionCode(db: Database) {
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const code = generateSessionCode();
    const snapshot = await get(ref(db, `rooms/${code}/session`));
    if (!snapshot.exists()) {
      return code;
    }
  }

  return crypto.randomUUID().slice(0, 6).toUpperCase();
}

function generateSessionCode() {
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }

  return code;
}

function createStartPosition(index: number) {
  const angle = (index / 8) * Math.PI * 2;
  return {
    x: WORLD_SIZE.width / 2 + Math.cos(angle) * 120,
    y: WORLD_SIZE.height / 2 + Math.sin(angle) * 120,
  };
}

function roomStateFromSnapshot(snapshot: DataSnapshot, code: string): RoomState | null {
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val() as {
    session?: unknown;
    participants?: Record<string, unknown>;
    messages?: Record<string, unknown>;
  };
  const sessionSnapshot = snapshot.child("session");
  const session = sessionFromSnapshot(sessionSnapshot, code);
  const participants = Object.values(data.participants ?? {})
    .map(participantFromData)
    .filter((participant): participant is Participant => Boolean(participant))
    .sort((a, b) => Date.parse(a.joinedAt) - Date.parse(b.joinedAt));
  const messages = Object.values(data.messages ?? {})
    .map(messageFromData)
    .filter((message): message is ChatMessage => Boolean(message))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-80);

  return {
    session,
    participants,
    messages,
  };
}

function sessionFromSnapshot(snapshot: DataSnapshot, code: string): ClassroomSession {
  const data = (snapshot.val() ?? {}) as Partial<FirebaseSession>;
  return sessionToClassroomSession({
    id: typeof data.id === "string" ? data.id : crypto.randomUUID(),
    code,
    title: sanitizeText(data.title, 32) || "우주 음악 감상 수업",
    teacherName: sanitizeText(data.teacherName, 18) || "선생님",
    status: data.status === "ended" ? "ended" : "active",
    createdAt: safeIso(data.createdAt),
    expiresAt: safeIso(data.expiresAt, addHours(new Date(), SESSION_HOURS).toISOString()),
  });
}

function participantFromData(data: unknown): Participant | null {
  if (!isRecord(data) || typeof data.id !== "string" || typeof data.sessionCode !== "string") {
    return null;
  }

  return {
    id: data.id,
    sessionCode: normalizeCode(data.sessionCode),
    displayName: sanitizeText(data.displayName, 16) || "학생",
    avatarId: normalizeAvatarId(data.avatarId ?? DEFAULT_AVATAR_ID),
    color: sanitizeColor(data.color),
    x: clamp(typeof data.x === "number" ? data.x : WORLD_SIZE.width / 2, 0, WORLD_SIZE.width),
    y: clamp(typeof data.y === "number" ? data.y : WORLD_SIZE.height / 2, 0, WORLD_SIZE.height),
    activePlanetId: isPlanetId(data.activePlanetId) ? data.activePlanetId : null,
    joinedAt: safeIso(data.joinedAt),
    lastSeenAt: safeIso(data.lastSeenAt),
  };
}

function messageFromData(data: unknown): ChatMessage | null {
  if (
    !isRecord(data) ||
    typeof data.id !== "string" ||
    typeof data.sessionCode !== "string" ||
    typeof data.participantId !== "string" ||
    typeof data.body !== "string"
  ) {
    return null;
  }

  return {
    id: data.id,
    sessionCode: normalizeCode(data.sessionCode),
    participantId: data.participantId,
    displayName: sanitizeText(data.displayName, 16) || "학생",
    body: data.body.trim().slice(0, 180),
    createdAt: safeIso(data.createdAt),
    moderationStatus: data.moderationStatus === "blocked" ? "blocked" : "allowed",
  };
}

function sessionToClassroomSession(session: FirebaseSession): ClassroomSession {
  return {
    id: session.id,
    code: session.code,
    title: session.title,
    teacherName: session.teacherName,
    status: session.status,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function sanitizeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#7dd3fc";
}

function safeIso(value: unknown, fallback = new Date().toISOString()) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlanetId(value: unknown): value is PlanetId {
  return (
    value === "mercury" ||
    value === "venus" ||
    value === "earth" ||
    value === "mars" ||
    value === "jupiter" ||
    value === "saturn" ||
    value === "uranus" ||
    value === "neptune"
  );
}
