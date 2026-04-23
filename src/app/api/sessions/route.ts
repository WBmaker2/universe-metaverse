import { createSession } from "@/server/room-store";

export const dynamic = "force-dynamic";

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
