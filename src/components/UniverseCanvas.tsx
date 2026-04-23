"use client";

import { AVATARS, normalizeAvatarId, type AvatarId } from "@/lib/avatars";
import { PLANETS, WORLD_SIZE, getNearestActivePlanet } from "@/lib/planets";
import type { Participant, PlanetTrack } from "@/lib/types";
import { useEffect, useRef } from "react";

type MoveSnapshot = {
  x: number;
  y: number;
  activePlanetId: PlanetTrack["id"] | null;
};

type UniverseCanvasProps = {
  self: Participant;
  peers: Participant[];
  onMove: (snapshot: MoveSnapshot) => void;
  onPlanetFocus: (planet: PlanetTrack | null) => void;
  onPlanetClick: (planet: PlanetTrack) => void;
};

type SceneBridge = {
  syncParticipants: (self: Participant, peers: Participant[]) => void;
};

export function UniverseCanvas({
  self,
  peers,
  onMove,
  onPlanetFocus,
  onPlanetClick,
}: UniverseCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({ onMove, onPlanetFocus, onPlanetClick });
  const participantsRef = useRef({ self, peers });
  const sceneRef = useRef<SceneBridge | null>(null);

  useEffect(() => {
    callbacksRef.current = { onMove, onPlanetFocus, onPlanetClick };
  }, [onMove, onPlanetFocus, onPlanetClick]);

  useEffect(() => {
    participantsRef.current = { self, peers };
    sceneRef.current?.syncParticipants(self, peers);
  }, [self, peers]);

  useEffect(() => {
    let destroyed = false;
    let game: import("phaser").Game | null = null;

    async function bootGame() {
      if (!containerRef.current) {
        return;
      }

      const PhaserModule = await import("phaser");
      const Phaser = (
        "default" in PhaserModule && PhaserModule.default ? PhaserModule.default : PhaserModule
      ) as typeof import("phaser");

      if (destroyed || !containerRef.current) {
        return;
      }

      class SpaceScene extends Phaser.Scene implements SceneBridge {
        private localAvatar?: Phaser.GameObjects.Sprite;
        private localMarker?: Phaser.GameObjects.Ellipse;
        private localName?: Phaser.GameObjects.Text;
        private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
        private keys?: Record<string, Phaser.Input.Keyboard.Key>;
        private moveTarget: Phaser.Math.Vector2 | null = null;
        private peerObjects = new Map<
          string,
          {
            avatar: Phaser.GameObjects.Sprite;
            marker: Phaser.GameObjects.Ellipse;
            label: Phaser.GameObjects.Text;
          }
        >();
        private activePlanetId: PlanetTrack["id"] | null = null;
        private selectedPlanet: PlanetTrack | null = null;
        private lastSentAt = 0;

        constructor() {
          super("space");
        }

        preload() {
          for (const avatar of AVATARS) {
            this.load.image(this.avatarTextureKey(avatar.id, "idle"), avatar.idlePath);
            this.load.image(this.avatarTextureKey(avatar.id, "walk"), avatar.walkPath);
          }
        }

        create() {
          sceneRef.current = this;
          this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
          this.physics.world.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);

          this.drawBackground();
          this.drawPlanets();
          this.createLocalPlayer();

          this.cursors = this.input.keyboard?.createCursorKeys();
          this.keys = this.input.keyboard?.addKeys("W,A,S,D") as
            | Record<string, Phaser.Input.Keyboard.Key>
            | undefined;

          this.input.on(
            "pointerdown",
            (pointer: Phaser.Input.Pointer, hoveredObjects: Phaser.GameObjects.GameObject[]) => {
              if (hoveredObjects.length === 0) {
                this.selectedPlanet = null;
              }

              const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
              this.moveTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
            },
          );
        }

        update(_time: number, delta: number) {
          if (!this.localAvatar) {
            return;
          }

          const seconds = delta / 1000;
          const speed = 270;
          const velocity = new Phaser.Math.Vector2(0, 0);
          const usingKeyboard =
            this.cursors?.left.isDown ||
            this.cursors?.right.isDown ||
            this.cursors?.up.isDown ||
            this.cursors?.down.isDown ||
            this.keys?.A.isDown ||
            this.keys?.D.isDown ||
            this.keys?.W.isDown ||
            this.keys?.S.isDown;

          if (usingKeyboard) {
            this.moveTarget = null;
            if (this.cursors?.left.isDown || this.keys?.A.isDown) velocity.x -= 1;
            if (this.cursors?.right.isDown || this.keys?.D.isDown) velocity.x += 1;
            if (this.cursors?.up.isDown || this.keys?.W.isDown) velocity.y -= 1;
            if (this.cursors?.down.isDown || this.keys?.S.isDown) velocity.y += 1;
          } else if (this.moveTarget) {
            velocity.set(
              this.moveTarget.x - this.localAvatar.x,
              this.moveTarget.y - this.localAvatar.y,
            );
            if (velocity.length() < 8) {
              this.moveTarget = null;
              velocity.set(0, 0);
            }
          }

          if (velocity.length() > 0) {
            velocity.normalize().scale(speed * seconds);
            this.localAvatar.setPosition(
              Phaser.Math.Clamp(this.localAvatar.x + velocity.x, 0, WORLD_SIZE.width),
              Phaser.Math.Clamp(this.localAvatar.y + velocity.y, 0, WORLD_SIZE.height),
            );
            this.localMarker?.setPosition(this.localAvatar.x, this.localAvatar.y - 3);
            this.localName?.setPosition(this.localAvatar.x, this.localAvatar.y - 72);
          }

          const selfAvatarId = normalizeAvatarId(participantsRef.current.self.avatarId);
          this.localAvatar.setTexture(
            this.avatarTextureKey(selfAvatarId, velocity.length() > 0 ? "walk" : "idle"),
          );
          this.localAvatar.setFlipX(velocity.x < -0.1);

          const nearbyPlanet = getNearestActivePlanet(this.localAvatar.x, this.localAvatar.y);
          if (usingKeyboard && !nearbyPlanet) {
            this.selectedPlanet = null;
          }

          const activePlanet = nearbyPlanet ?? this.selectedPlanet;
          const nextPlanetId = activePlanet?.id ?? null;

          if (nextPlanetId !== this.activePlanetId) {
            this.activePlanetId = nextPlanetId;
            callbacksRef.current.onPlanetFocus(activePlanet);
          }

          if (this.time.now - this.lastSentAt > 140) {
            this.lastSentAt = this.time.now;
            callbacksRef.current.onMove({
              x: this.localAvatar.x,
              y: this.localAvatar.y,
              activePlanetId: this.activePlanetId,
            });
          }
        }

        syncParticipants(nextSelf: Participant, nextPeers: Participant[]) {
          if (this.localAvatar) {
            const selfAvatarId = normalizeAvatarId(nextSelf.avatarId);
            this.localAvatar.setTexture(this.avatarTextureKey(selfAvatarId, "idle"));
            this.localMarker?.setFillStyle(
              Phaser.Display.Color.HexStringToColor(nextSelf.color).color,
              0.45,
            );
            this.localName?.setText(nextSelf.displayName);

            const drift = Phaser.Math.Distance.Between(
              this.localAvatar.x,
              this.localAvatar.y,
              nextSelf.x,
              nextSelf.y,
            );

            if (drift > 120) {
              this.localAvatar.setPosition(nextSelf.x, nextSelf.y);
              this.localMarker?.setPosition(nextSelf.x, nextSelf.y - 3);
              this.localName?.setPosition(nextSelf.x, nextSelf.y - 72);
            }
          }

          const nextPeerIds = new Set(nextPeers.map((peer) => peer.id));
          for (const [peerId, objects] of this.peerObjects.entries()) {
            if (!nextPeerIds.has(peerId)) {
              objects.avatar.destroy();
              objects.marker.destroy();
              objects.label.destroy();
              this.peerObjects.delete(peerId);
            }
          }

          for (const peer of nextPeers) {
            const existing = this.peerObjects.get(peer.id);
            if (existing) {
              const peerAvatarId = normalizeAvatarId(peer.avatarId);
              existing.avatar.setPosition(peer.x, peer.y);
              existing.avatar.setTexture(this.avatarTextureKey(peerAvatarId, "idle"));
              existing.marker.setPosition(peer.x, peer.y - 3);
              existing.marker.setFillStyle(
                Phaser.Display.Color.HexStringToColor(peer.color).color,
                0.36,
              );
              existing.label.setPosition(peer.x, peer.y - 68);
              existing.label.setText(peer.displayName);
              continue;
            }

            const peerAvatarId = normalizeAvatarId(peer.avatarId);
            const marker = this.add
              .ellipse(
                peer.x,
                peer.y - 3,
                42,
                16,
                Phaser.Display.Color.HexStringToColor(peer.color).color,
                0.36,
              )
              .setStrokeStyle(2, 0x050711, 0.8)
              .setDepth(6);
            const avatar = this.add
              .sprite(peer.x, peer.y, this.avatarTextureKey(peerAvatarId, "idle"))
              .setOrigin(0.5, 0.85)
              .setScale(0.48)
              .setDepth(7);
            const label = this.add
              .text(peer.x, peer.y - 68, peer.displayName, {
                color: "#ffffff",
                fontSize: "14px",
                fontFamily: "Arial, sans-serif",
                backgroundColor: "rgba(3, 6, 18, 0.64)",
                padding: { left: 7, right: 7, top: 3, bottom: 3 },
              })
              .setOrigin(0.5)
              .setDepth(8);

            this.peerObjects.set(peer.id, { avatar, marker, label });
          }
        }

        private drawBackground() {
          this.add.rectangle(0, 0, WORLD_SIZE.width, WORLD_SIZE.height, 0x050711).setOrigin(0);

          const stars = this.add.graphics().setDepth(0);
          for (let index = 0; index < 360; index += 1) {
            const x = Math.random() * WORLD_SIZE.width;
            const y = Math.random() * WORLD_SIZE.height;
            const alpha = 0.35 + Math.random() * 0.55;
            const size = Math.random() > 0.88 ? 2 : 1;
            stars.fillStyle(0xffffff, alpha);
            stars.fillCircle(x, y, size);
          }

          const orbitGraphics = this.add.graphics().setDepth(1);
          orbitGraphics.lineStyle(1, 0x7dd3fc, 0.16);
          for (const planet of PLANETS) {
            orbitGraphics.strokeCircle(planet.x, planet.y, planet.activationRadius);
          }
        }

        private drawPlanets() {
          for (const planet of PLANETS) {
            const activation = this.add
              .circle(planet.x, planet.y, planet.activationRadius, 0xffffff, 0.025)
              .setStrokeStyle(1, 0xffffff, 0.18)
              .setDepth(2);
            activation.setInteractive({ useHandCursor: true });

            const body = this.add
              .circle(
                planet.x,
                planet.y,
                planet.radius,
                Phaser.Display.Color.HexStringToColor(planet.color).color,
                1,
              )
              .setStrokeStyle(
                4,
                Phaser.Display.Color.HexStringToColor(planet.accent).color,
                0.55,
              )
              .setDepth(4);
            body.setInteractive({ useHandCursor: true });

            if (planet.id === "saturn") {
              this.add
                .ellipse(
                  planet.x,
                  planet.y,
                  planet.radius * 2.9,
                  planet.radius * 0.85,
                  0xffffff,
                  0,
                )
                .setStrokeStyle(8, 0xfff0ba, 0.58)
                .setAngle(-12)
                .setDepth(3);
            }

            const label = this.add
              .text(planet.x, planet.y + planet.radius + 17, planet.name, {
                color: "#f8fafc",
                fontSize: "17px",
                fontFamily: "Arial, sans-serif",
                backgroundColor: "rgba(3, 6, 18, 0.58)",
                padding: { left: 8, right: 8, top: 4, bottom: 4 },
              })
              .setOrigin(0.5)
              .setDepth(5);

            const clickHandler = () => {
              this.selectedPlanet = planet;
              callbacksRef.current.onPlanetClick(planet);
              callbacksRef.current.onPlanetFocus(planet);
              this.activePlanetId = planet.id;
              if (this.localAvatar) {
                callbacksRef.current.onMove({
                  x: this.localAvatar.x,
                  y: this.localAvatar.y,
                  activePlanetId: planet.id,
                });
              }
            };

            body.on("pointerdown", clickHandler);
            activation.on("pointerdown", clickHandler);
            label.setInteractive({ useHandCursor: true }).on("pointerdown", clickHandler);
          }
        }

        private createLocalPlayer() {
          const { self: currentSelf, peers: currentPeers } = participantsRef.current;
          const selfAvatarId = normalizeAvatarId(currentSelf.avatarId);
          this.localMarker = this.add
            .ellipse(
              currentSelf.x,
              currentSelf.y - 3,
              48,
              18,
              Phaser.Display.Color.HexStringToColor(currentSelf.color).color,
              0.45,
            )
            .setStrokeStyle(2, 0xffffff, 0.42)
            .setDepth(8);
          this.localAvatar = this.add
            .sprite(currentSelf.x, currentSelf.y, this.avatarTextureKey(selfAvatarId, "idle"))
            .setOrigin(0.5, 0.85)
            .setScale(0.52)
            .setDepth(9);
          this.localName = this.add
            .text(currentSelf.x, currentSelf.y - 72, currentSelf.displayName, {
              color: "#ffffff",
              fontSize: "15px",
              fontFamily: "Arial, sans-serif",
              backgroundColor: "rgba(3, 6, 18, 0.7)",
              padding: { left: 8, right: 8, top: 4, bottom: 4 },
            })
            .setOrigin(0.5)
            .setDepth(10);

          this.cameras.main.startFollow(this.localAvatar, true, 0.08, 0.08);
          this.cameras.main.setZoom(1);
          this.syncParticipants(currentSelf, currentPeers);
        }

        private avatarTextureKey(avatarId: AvatarId, pose: "idle" | "walk") {
          return `avatar-${avatarId}-${pose}`;
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: "#050711",
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: "arcade",
          arcade: {
            debug: false,
          },
        },
        scene: SpaceScene,
      });
    }

    void bootGame();

    return () => {
      destroyed = true;
      sceneRef.current = null;
      game?.destroy(true);
    };
  }, []);

  return <div className="universe-canvas" ref={containerRef} aria-label="2D 우주 메타버스" />;
}
