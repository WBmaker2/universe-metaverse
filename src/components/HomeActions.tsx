"use client";

import { hasSupabaseConfig } from "@/lib/supabase/browser";
import { GraduationCap, LogIn } from "lucide-react";
import Link from "next/link";

export function HomeActions() {
  const supabaseReady = hasSupabaseConfig();

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
        현재 모드: {supabaseReady ? "Supabase 연결 준비됨" : "로컬 데모"}
      </p>
    </div>
  );
}
