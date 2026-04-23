"use client";

import {
  createFirebaseSession,
  hasFirebaseConfig,
  signInTeacherWithGoogle,
} from "@/lib/firebase/client";
import { Clipboard, LogIn, Maximize2, Plus, QrCode, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import type { ClassroomSession } from "@/lib/types";

export function TeacherConsole() {
  const [teacherName, setTeacherName] = useState("선생님");
  const [title, setTitle] = useState("우주 음악 감상 수업");
  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [notice, setNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const firebaseReady = hasFirebaseConfig();

  const joinUrl = useMemo(() => {
    if (!session || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/join?code=${session.code}`;
  }, [session]);

  useEffect(() => {
    let isCurrent = true;

    if (!joinUrl) return;

    void QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (isCurrent) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setQrDataUrl("");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [joinUrl]);

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
    setQrDataUrl("");

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

  function openLargeQrCode() {
    if (!session || !joinUrl || !qrDataUrl) {
      setNotice("QR코드를 아직 준비하는 중입니다.");
      return;
    }

    const popup = window.open("", `universe-qr-${session.code}`, "popup,width=560,height=720");
    if (!popup) {
      setNotice("팝업이 차단되었습니다. 브라우저에서 팝업 허용 후 다시 눌러주세요.");
      return;
    }

    const escapedCode = escapeHtml(session.code);
    const escapedJoinUrl = escapeHtml(joinUrl);
    const escapedQrDataUrl = escapeHtml(qrDataUrl);

    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>우주 음악 메타버스 입장 QR</title>
    <style>
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background: #050711;
        color: #f8fafc;
        font-family: Arial, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      }
      main {
        width: min(92vw, 480px);
        display: grid;
        gap: 18px;
        justify-items: center;
        padding: 28px;
        text-align: center;
      }
      p { margin: 0; color: #b8c2d6; line-height: 1.55; }
      .label { color: #f6c76b; font-weight: 800; }
      .code { color: #f6c76b; font-size: clamp(3rem, 14vw, 5.5rem); font-weight: 900; line-height: 0.95; }
      img { width: min(82vw, 360px); border-radius: 8px; background: #fff; padding: 12px; }
      .url { overflow-wrap: anywhere; }
      button {
        min-height: 44px;
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 8px;
        background: #f6c76b;
        color: #1c1303;
        padding: 0 18px;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main>
      <p class="label">학생 입장 코드</p>
      <strong class="code">${escapedCode}</strong>
      <img src="${escapedQrDataUrl}" alt="${escapedCode} 입장 QR코드" />
      <p class="url">${escapedJoinUrl}</p>
      <button type="button" onclick="window.print()">인쇄</button>
    </main>
  </body>
</html>`);
    popup.document.close();
    popup.focus();
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
              <div className="session-share-layout">
                <div className="session-code-block">
                  <p className="eyebrow">학생 입장 코드</p>
                  <strong className="session-code">{session.code}</strong>
                  <p className="join-link">{joinUrl}</p>
                </div>
                <div className="qr-card" aria-label="학생 입장 QR코드">
                  {qrDataUrl ? (
                    <Image
                      src={qrDataUrl}
                      alt={`${session.code} 입장 QR코드`}
                      width={152}
                      height={152}
                      unoptimized
                    />
                  ) : (
                    <div className="qr-placeholder" aria-hidden="true">
                      <QrCode size={42} />
                    </div>
                  )}
                  <p>휴대폰 카메라로 바로 입장</p>
                </div>
              </div>
              <div className="button-row">
                <button className="secondary-action" type="button" onClick={copyJoinInfo}>
                  <Clipboard size={19} aria-hidden="true" />
                  복사
                </button>
                <Link className="primary-action" href={`/join?code=${session.code}`}>
                  <Share2 size={19} aria-hidden="true" />
                  입장 화면
                </Link>
                <button className="secondary-action" type="button" onClick={openLargeQrCode}>
                  <Maximize2 size={19} aria-hidden="true" />
                  QR 크게 보기
                </button>
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

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
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
