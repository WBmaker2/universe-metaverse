import { getRoomState, updateParticipant } from "@/server/room-store";
import type { PlanetId } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const state = getRoomState(code);

  if (!state) {
    return Response.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json(state);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    participantId?: string;
    x?: number;
    y?: number;
    activePlanetId?: PlanetId | null;
  };

  if (!body.participantId) {
    return Response.json({ error: "참가자 정보가 필요합니다." }, { status: 400 });
  }

  const participant = updateParticipant(code, body.participantId, {
    x: body.x,
    y: body.y,
    activePlanetId: body.activePlanetId,
  });

  if (!participant) {
    return Response.json({ error: "참가자 정보를 갱신할 수 없습니다." }, { status: 404 });
  }

  return Response.json({ participant });
}
