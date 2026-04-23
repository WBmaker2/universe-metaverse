import { JoinForm } from "@/components/JoinForm";
import Link from "next/link";
import { Suspense } from "react";

export default function JoinPage() {
  return (
    <main className="page-shell join-shell">
      <nav className="top-nav" aria-label="상단 이동">
        <Link href="/">우주 음악 메타버스</Link>
      </nav>
      <Suspense fallback={<p className="notice">입장 화면을 준비하고 있습니다.</p>}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
