import { addChatMessage } from "@/server/room-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    participantId?: string;
    body?: string;
  };

  if (!body.participantId || typeof body.body !== "string") {
    return Response.json({ error: "메시지 정보를 확인해주세요." }, { status: 400 });
  }

  const result = addChatMessage(code, body.participantId, body.body);

  if (!result.ok) {
    return Response.json({ error: result.reason }, { status: 400 });
  }

  return Response.json({ message: result.message }, { status: 201 });
}
