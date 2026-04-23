"use client";

import { hasFirebaseConfig } from "@/lib/firebase/client";
import { GraduationCap, LogIn } from "lucide-react";
import Link from "next/link";

export function HomeActions() {
  const firebaseReady = hasFirebaseConfig();

  return (
    <div className="home-actions">
      <div className="button-row">
        <Link className="primary-action" href="/teacher">
          <GraduationCap size={20} aria-hidden="true" />
          교사 세션 만들기
        </Link>
        <Link className="secondary-action" href="/join">
          <LogIn size={20} aria-hidden="true" />
          학생으로 입장
        </Link>
      </div>
      <p className="mode-note">
        현재 모드: {firebaseReady ? "Firebase 실시간 DB" : "로컬 데모"}
      </p>
    </div>
  );
}
