"use client";

import { useEffect, useRef, useState } from "react";
import type { PlanetTrack } from "@/lib/types";

type AudioStatus = "locked" | "idle" | "playing" | "blocked" | "error";

export function usePlanetAudio(planet: PlanetTrack | null, enabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playback, setPlayback] = useState<{
    planetId: PlanetTrack["id"] | null;
    status: Extract<AudioStatus, "playing" | "blocked" | "error">;
  } | null>(null);

  useEffect(() => {
    if (!enabled) {
      audioRef.current?.pause();
      return;
    }

    if (!planet) {
      audioRef.current?.pause();
      return;
    }

    const audio = new Audio(planet.audioPath);
    audio.loop = true;
    audio.volume = 0.76;
    audioRef.current?.pause();
    audioRef.current = audio;

    let cancelled = false;

    audio
      .play()
      .then(() => {
        if (!cancelled) {
          setPlayback({ planetId: planet.id, status: "playing" });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlayback({ planetId: planet.id, status: "blocked" });
        }
      });

    return () => {
      cancelled = true;
      audio.pause();
      audio.currentTime = 0;
    };
  }, [enabled, planet]);

  const status: AudioStatus = !enabled
    ? "locked"
    : !planet
      ? "idle"
      : playback?.planetId === planet.id
        ? playback.status
        : "idle";

  return {
    status,
  };
}
