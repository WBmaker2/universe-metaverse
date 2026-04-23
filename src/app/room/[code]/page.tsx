import { MetaverseClient } from "@/components/MetaverseClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <MetaverseClient code={code.toUpperCase()} />;
}
