"use client";

import { AVATARS, DEFAULT_AVATAR_ID, type AvatarId } from "@/lib/avatars";
import { hasFirebaseConfig, joinFirebaseRoom } from "@/lib/firebase/client";
import { LogIn, Music2 } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { JoinResponse } from "@/lib/types";

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code")?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsJoining(true);

    try {
      const normalizedCode = code.trim().toUpperCase();
      const data = hasFirebaseConfig()
        ? await joinFirebaseRoom(normalizedCode, name, avatarId)
        : await joinLocalRoom(normalizedCode, name, avatarId);

      localStorage.setItem(`universe:participant:${data.session.code}`, JSON.stringify(data));
      router.push(`/room/${data.session.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "입장 중 문제가 생겼습니다.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <section className="join-panel" aria-labelledby="join-title">
      <div className="section-heading">
        <p className="eyebrow">학생 입장</p>
        <h1 id="join-title">세션코드로 우주에 들어갑니다</h1>
        <p>입장 버튼을 누르면 오디오 재생을 시작할 수 있는 상태로 수업 공간이 열립니다.</p>
      </div>

      <form className="tool-panel join-form" onSubmit={handleJoin}>
        <label>
          세션코드
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="예: A3B7QK"
            maxLength={8}
            required
          />
        </label>
        <label>
          이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="수업에서 보일 이름"
            maxLength={16}
            required
          />
        </label>

        <fieldset className="avatar-fieldset">
          <legend>캐릭터 선택</legend>
          <div className="avatar-grid">
            {AVATARS.map((avatar) => (
              <button
                aria-pressed={avatarId === avatar.id}
                className={avatarId === avatar.id ? "avatar-option selected" : "avatar-option"}
                key={avatar.id}
                onClick={() => setAvatarId(avatar.id)}
                style={{ "--avatar-accent": avatar.accent } as React.CSSProperties}
                type="button"
              >
                <Image alt="" height={84} src={avatar.idlePath} unoptimized width={63} />
                <span>{avatar.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <button className="primary-action" type="submit" disabled={isJoining}>
          {isJoining ? (
            <Music2 size={20} aria-hidden="true" />
          ) : (
            <LogIn size={20} aria-hidden="true" />
          )}
          {isJoining ? "입장 중" : "우주 입장"}
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    </section>
  );
}

async function joinLocalRoom(normalizedCode: string, name: string, avatarId: AvatarId) {
  const response = await fetch("/api/sessions", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "join",
      code: normalizedCode,
      name,
      avatarId,
    }),
  });

  const data = (await response.json()) as JoinResponse | { error: string };

  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "입장에 실패했습니다.");
  }

  return data;
}
