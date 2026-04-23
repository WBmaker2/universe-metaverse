import { joinRoom } from "@/server/room-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    avatarId?: string;
  };

  if (!body.name?.trim()) {
    return Response.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  const joined = joinRoom(code, body.name, body.avatarId);

  if (!joined) {
    return Response.json({ error: "입장할 수 있는 세션을 찾지 못했습니다." }, { status: 404 });
  }

  return Response.json(joined, { status: 201 });
}
