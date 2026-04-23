import type { PlanetId } from "@/lib/types";
import {
  addChatMessage,
  createSession,
  getRoomState,
  joinRoom,
  updateParticipant,
} from "@/server/room-store";

export const dynamic = "force-dynamic";

type SessionActionBody = {
  action?: string;
  code?: string;
  name?: string;
  avatarId?: string;
  participantId?: string;
  body?: string;
  x?: number;
  y?: number;
  activePlanetId?: PlanetId | null;
};

function missingSessionResponse() {
  return Response.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");

  if (!code) {
    return Response.json({ error: "세션코드가 필요합니다." }, { status: 400 });
  }

  const state = getRoomState(code);

  if (!state) {
    return missingSessionResponse();
  }

  return Response.json(state);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    teacherName?: string;
    title?: string;
  };

  const session = createSession({
    teacherName: body.teacherName,
    title: body.title,
  });

  return Response.json({ session }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as SessionActionBody;

  if (!body.code) {
    return Response.json({ error: "세션코드가 필요합니다." }, { status: 400 });
  }

  if (body.action === "join") {
    if (!body.name?.trim()) {
      return Response.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }

    const joined = joinRoom(body.code, body.name, body.avatarId);

    if (!joined) {
      return Response.json({ error: "입장할 수 있는 세션을 찾지 못했습니다." }, { status: 404 });
    }

    return Response.json(joined, { status: 201 });
  }

  if (body.action === "update-participant") {
    if (!body.participantId) {
      return Response.json({ error: "참가자 정보가 필요합니다." }, { status: 400 });
    }

    const participant = updateParticipant(body.code, body.participantId, {
      x: body.x,
      y: body.y,
      activePlanetId: body.activePlanetId,
    });

    if (!participant) {
      return Response.json({ error: "참가자 정보를 갱신할 수 없습니다." }, { status: 404 });
    }

    return Response.json({ participant });
  }

  if (body.action === "chat") {
    if (!body.participantId || typeof body.body !== "string") {
      return Response.json({ error: "메시지 정보를 확인해주세요." }, { status: 400 });
    }

    const result = addChatMessage(body.code, body.participantId, body.body);

    if (!result.ok) {
      return Response.json({ error: result.reason }, { status: 400 });
    }

    return Response.json({ message: result.message }, { status: 201 });
  }

  return Response.json({ error: "지원하지 않는 세션 작업입니다." }, { status: 400 });
}
