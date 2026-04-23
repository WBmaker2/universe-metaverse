import { getRoomState } from "@/server/room-store";

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
