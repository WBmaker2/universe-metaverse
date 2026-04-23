"use client";

import {
  createFirebaseSession,
  hasFirebaseConfig,
  signInTeacherWithGoogle,
} from "@/lib/firebase/client";
import { Clipboard, LogIn, Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClassroomSession } from "@/lib/types";

export function TeacherConsole() {
  const [teacherName, setTeacherName] = useState("선생님");
  const [title, setTitle] = useState("우주 음악 감상 수업");
  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [notice, setNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const firebaseReady = hasFirebaseConfig();

  const joinUrl = useMemo(() => {
    if (!session || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/join?code=${session.code}`;
  }, [session]);

  async function handleGoogleLogin() {
    if (!firebaseReady) {
      setNotice("Firebase 환경변수를 연결하면 Google 로그인을 사용할 수 있습니다.");
      return;
    }

    await signInTeacherWithGoogle();
    setNotice("Google 로그인이 완료되었습니다.");
  }

  async function handleCreateSession() {
    setIsCreating(true);
    setNotice("");

    try {
      const nextSession = firebaseReady
        ? await createFirebaseSession({ teacherName, title })
        : await createLocalSession({ teacherName, title });

      setSession(nextSession);
      setNotice("세션이 생성되었습니다. 학생들에게 코드를 공유해주세요.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "세션 생성 중 문제가 생겼습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyJoinInfo() {
    if (!session) {
      return;
    }

    const text = `세션코드: ${session.code}\n입장 링크: ${joinUrl}`;
    await navigator.clipboard?.writeText(text);
    setNotice("세션코드와 입장 링크를 복사했습니다.");
  }

  return (
    <section className="teacher-console" aria-labelledby="teacher-title">
      <div className="section-heading">
        <p className="eyebrow">교사용 콘솔</p>
        <h1 id="teacher-title">수업 세션을 만듭니다</h1>
        <p>
          Firebase 연결 시 Google 로그인과 영속 세션을 사용하고, 연결 전에는 로컬
          데모 세션으로 체험합니다.
        </p>
      </div>

      <div className="teacher-grid">
        <form
          className="tool-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateSession();
          }}
        >
          <label>
            교사 표시 이름
            <input
              value={teacherName}
              onChange={(event) => setTeacherName(event.target.value)}
              maxLength={18}
            />
          </label>
          <label>
            수업 이름
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={32}
            />
          </label>
          <div className="button-row">
            <button className="primary-action" type="submit" disabled={isCreating}>
              <Plus size={20} aria-hidden="true" />
              {isCreating ? "생성 중" : "세션 생성"}
            </button>
            <button className="secondary-action" type="button" onClick={handleGoogleLogin}>
              <LogIn size={20} aria-hidden="true" />
              {firebaseReady ? "Google 로그인" : "로그인 연결 전"}
            </button>
          </div>
        </form>

        <div className="session-output" aria-live="polite">
          {session ? (
            <>
              <p className="eyebrow">학생 입장 코드</p>
              <strong className="session-code">{session.code}</strong>
              <p className="join-link">{joinUrl}</p>
              <div className="button-row">
                <button className="secondary-action" type="button" onClick={copyJoinInfo}>
                  <Clipboard size={19} aria-hidden="true" />
                  복사
                </button>
                <Link className="primary-action" href={`/join?code=${session.code}`}>
                  <Share2 size={19} aria-hidden="true" />
                  입장 화면
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">대기 중</p>
              <strong>세션을 만들면 코드가 표시됩니다.</strong>
              <p>학생들은 이 코드와 자신의 이름으로 우주 공간에 입장합니다.</p>
            </>
          )}
        </div>
      </div>

      {notice ? <p className="notice">{notice}</p> : null}
    </section>
  );
}

async function createLocalSession(input: { teacherName: string; title: string }) {
  const response = await fetch("/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("세션 생성에 실패했습니다.");
  }

  const data = (await response.json()) as { session: ClassroomSession };
  return data.session;
}
