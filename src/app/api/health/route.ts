export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    mode:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        ? "firebase-ready"
        : "local-demo",
    timestamp: new Date().toISOString(),
  });
}
