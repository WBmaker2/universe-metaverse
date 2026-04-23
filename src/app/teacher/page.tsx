import { TeacherConsole } from "@/components/TeacherConsole";
import Link from "next/link";

export default function TeacherPage() {
  return (
    <main className="page-shell teacher-shell">
      <nav className="top-nav" aria-label="상단 이동">
        <Link href="/">우주 음악 메타버스</Link>
      </nav>
      <TeacherConsole />
    </main>
  );
}
