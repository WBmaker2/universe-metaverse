"use client";

import { ChatPanel } from "@/components/ChatPanel";
import { UniverseCanvas } from "@/components/UniverseCanvas";
import { PLANET_BY_ID } from "@/lib/planets";
import type { JoinResponse, Participant, PlanetTrack, RoomState } from "@/lib/types";
import { usePlanetAudio } from "@/hooks/usePlanetAudio";
import { Headphones, LogOut, Music2, Volume2, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MetaverseClientProps = {
  code: string;
};

type MoveSnapshot = {
  x: number;
  y: number;
  activePlanetId: PlanetTrack["id"] | null;
};

function readStoredJoinInfo(code: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(`universe:participant:${code}`);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as JoinResponse;
  } catch {
    localStorage.removeItem(`universe:participant:${code}`);
    return null;
  }
}

export function MetaverseClient({ code }: MetaverseClientProps) {
  const [joinInfo, setJoinInfo] = useState<JoinResponse | null>(null);
  const [joinInfoStatus, setJoinInfoStatus] = useState<"checking" | "ready">("checking");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [focusedPlanet, setFocusedPlanet] = useState<PlanetTrack | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [error, setError] = useState("");
  const lastMoveSentRef = useRef(0);
  const isMountedRef = useRef(false);
  const { status: audioStatus } = usePlanetAudio(focusedPlanet, audioEnabled);

  const self = useMemo<Participant | null>(() => {
    if (!joinInfo) {
      return null;
    }

    return (
      roomState?.participants.find((participant) => participant.id === joinInfo.participant.id) ??
      joinInfo.participant
    );
  }, [joinInfo, roomState]);

  const peers = useMemo(() => {
    if (!joinInfo || !roomState) {
      return [];
    }

    return roomState.participants.filter(
      (participant) => participant.id !== joinInfo.participant.id,
    );
  }, [joinInfo, roomState]);

  const participantCount = roomState?.participants.length ?? (self ? 1 : 0);

  const fetchState = useCallback(async () => {
    const response = await fetch(`/api/sessions?code=${encodeURIComponent(code)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("세션 상태를 불러오지 못했습니다.");
    }

    const state = (await response.json()) as RoomState;
    setRoomState(state);
  }, [code]);

  useEffect(() => {
    isMountedRef.current = true;
    const joinInfoTimer = window.setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      setJoinInfo(readStoredJoinInfo(code));
      setJoinInfoStatus("ready");
    }, 0);

    return () => {
      isMountedRef.current = false;
      window.clearTimeout(joinInfoTimer);
    };
  }, [code]);

  useEffect(() => {
    if (!joinInfo) {
      return;
    }

    const firstFetch = window.setTimeout(() => {
      void fetchState().catch((caught) => {
        if (isMountedRef.current) {
          setError(caught instanceof Error ? caught.message : "세션 상태를 불러오지 못했습니다.");
        }
      });
    }, 0);

    const timer = window.setInterval(() => {
      void fetchState().catch(() => undefined);
    }, 900);

    return () => {
      window.clearTimeout(firstFetch);
      window.clearInterval(timer);
    };
  }, [fetchState, joinInfo]);

  const handleMove = useCallback(
    (snapshot: MoveSnapshot) => {
      if (!joinInfo) {
        return;
      }

      const now = performance.now();
      if (now - lastMoveSentRef.current < 160) {
        return;
      }
      lastMoveSentRef.current = now;

      setRoomState((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          participants: current.participants.map((participant) =>
            participant.id === joinInfo.participant.id
              ? {
                  ...participant,
                  x: snapshot.x,
                  y: snapshot.y,
                  activePlanetId: snapshot.activePlanetId,
                }
              : participant,
          ),
        };
      });

      void fetch("/api/sessions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-participant",
          code,
          participantId: joinInfo.participant.id,
          x: snapshot.x,
          y: snapshot.y,
          activePlanetId: snapshot.activePlanetId,
        }),
      }).catch(() => undefined);
    },
    [code, joinInfo],
  );

  const handlePlanetFocus = useCallback((planet: PlanetTrack | null) => {
    setFocusedPlanet(planet);
  }, []);

  const handlePlanetClick = useCallback((planet: PlanetTrack) => {
    setFocusedPlanet(planet);
  }, []);

  if (joinInfoStatus === "checking") {
    return (
      <main className="room-fallback">
        <div className="section-heading">
          <p className="eyebrow">입장 확인</p>
          <h1>수업 공간을 준비하고 있습니다</h1>
          <p>브라우저에 저장된 참가자 정보를 확인하는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (!joinInfo || !self) {
    return (
      <main className="room-fallback">
        <div className="section-heading">
          <p className="eyebrow">입장 정보 필요</p>
          <h1>학생 입장을 먼저 진행해주세요</h1>
          <p>현재 브라우저에 세션 참가자 정보가 없습니다.</p>
        </div>
        <Link className="primary-action" href={`/join?code=${code}`}>
          <LogOut size={20} aria-hidden="true" />
          입장 화면으로 이동
        </Link>
      </main>
    );
  }

  const activeTrack = focusedPlanet ? PLANET_BY_ID[focusedPlanet.id] : null;

  return (
    <main className="metaverse-shell">
      <header className="room-header">
        <Link href="/" className="room-brand">
          우주 음악 메타버스
        </Link>
        <div className="room-meta">
          <span>
            <Wifi size={16} aria-hidden="true" />
            {code}
          </span>
          <span>{participantCount}명 접속</span>
        </div>
      </header>

      <section className="metaverse-stage" aria-label="우주 메타버스">
        <UniverseCanvas
          self={self}
          peers={peers}
          onMove={handleMove}
          onPlanetFocus={handlePlanetFocus}
          onPlanetClick={handlePlanetClick}
        />

        <div className="listening-panel">
          <div className="panel-title">
            <Headphones size={19} aria-hidden="true" />
            <h1>감상 상태</h1>
          </div>
          {activeTrack ? (
            <>
              <p className="eyebrow">{activeTrack.name}</p>
              <strong>{activeTrack.trackTitle}</strong>
              <p>{activeTrack.note}</p>
            </>
          ) : (
            <>
              <p className="eyebrow">이동 중</p>
              <strong>행성 가까이 가면 음악이 시작됩니다.</strong>
              <p>방향키, WASD, 클릭 또는 터치로 움직일 수 있습니다.</p>
            </>
          )}

          <button
            className={audioEnabled ? "audio-toggle enabled" : "audio-toggle"}
            type="button"
            onClick={() => setAudioEnabled((enabled) => !enabled)}
          >
            {audioEnabled ? (
              <Volume2 size={19} aria-hidden="true" />
            ) : (
              <Music2 size={19} aria-hidden="true" />
            )}
            {audioEnabled ? "오디오 켜짐" : "오디오 켜기"}
          </button>
          <p className="audio-status">
            상태:{" "}
            {audioStatus === "playing"
              ? "재생 중"
              : audioStatus === "blocked"
                ? "브라우저가 재생을 막았습니다. 오디오 버튼을 다시 눌러주세요."
                : audioStatus === "locked"
                  ? "대기"
                  : "정지"}
          </p>
        </div>

        <ChatPanel
          code={code}
          participantId={self.id}
          messages={roomState?.messages ?? []}
          onSent={() => void fetchState()}
        />
      </section>

      {error ? <p className="room-error">{error}</p> : null}
    </main>
  );
}
