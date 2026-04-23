"use client";

import { AVATARS, normalizeAvatarId, type AvatarId } from "@/lib/avatars";
import { PLANETS, WORLD_SIZE, getNearestActivePlanet } from "@/lib/planets";
import type { ChatMessage, Participant, PlanetTrack } from "@/lib/types";
import { useEffect, useRef } from "react";

type MoveSnapshot = {
  x: number;
  y: number;
  activePlanetId: PlanetTrack["id"] | null;
};

type UniverseCanvasProps = {
  self: Participant;
  peers: Participant[];
  messages: ChatMessage[];
  onMove: (snapshot: MoveSnapshot) => void;
  onPlanetFocus: (planet: PlanetTrack | null) => void;
  onPlanetClick: (planet: PlanetTrack) => void;
};

type SceneBridge = {
  syncParticipants: (self: Participant, peers: Participant[]) => void;
  syncMessages: (messages: ChatMessage[]) => void;
};

export function UniverseCanvas({
  self,
  peers,
  messages,
  onMove,
  onPlanetFocus,
  onPlanetClick,
}: UniverseCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbacksRef = useRef({ onMove, onPlanetFocus, onPlanetClick });
  const participantsRef = useRef({ self, peers });
  const messagesRef = useRef(messages);
  const sceneRef = useRef<SceneBridge | null>(null);

  useEffect(() => {
    callbacksRef.current = { onMove, onPlanetFocus, onPlanetClick };
  }, [onMove, onPlanetFocus, onPlanetClick]);

  useEffect(() => {
    participantsRef.current = { self, peers };
    sceneRef.current?.syncParticipants(self, peers);
  }, [self, peers]);

  useEffect(() => {
    messagesRef.current = messages;
    sceneRef.current?.syncMessages(messages);
  }, [messages]);

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
            avatarId: AvatarId;
            targetX: number;
            targetY: number;
          }
        >();
        private activePlanetId: PlanetTrack["id"] | null = null;
        private selectedPlanet: PlanetTrack | null = null;
        private lastSentAt = 0;
        private displayedMessageIds = new Set<string>();
        private initializedMessages = false;
        private speechBubbles = new Map<
          string,
          {
            container: Phaser.GameObjects.Container;
            participantId: string;
          }
        >();
        private participantBubbleIds = new Map<string, string>();

        constructor() {
          super("space");
        }

        preload() {
          for (const avatar of AVATARS) {
            this.load.image(this.avatarTextureKey(avatar.id, "idle"), avatar.idlePath);
            this.load.image(this.avatarTextureKey(avatar.id, "walk"), avatar.walkPath);
          }

          for (const planet of PLANETS) {
            this.load.image(this.planetTextureKey(planet.id), planet.imagePath);
          }
        }

        create() {
          sceneRef.current = this;
          this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
          this.physics.world.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);

          this.drawBackground();
          this.drawPlanets();
          this.createLocalPlayer();
          this.syncMessages(messagesRef.current);

          this.cursors = this.input.keyboard?.createCursorKeys();
          this.keys = this.input.keyboard?.addKeys("W,A,S,D") as
            | Record<string, Phaser.Input.Keyboard.Key>
            | undefined;

          this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
            const clickedPlanet = PLANETS.find(
              (planet) =>
                Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, planet.x, planet.y) <=
                planet.activationRadius,
            );

            if (!clickedPlanet) {
              this.selectedPlanet = null;
            }

            this.moveTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
          });
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

          this.updatePeerPositions(delta);
          this.updateSpeechBubblePositions();
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
          }

          const nextPeerIds = new Set(nextPeers.map((peer) => peer.id));
          for (const [peerId, objects] of this.peerObjects.entries()) {
            if (!nextPeerIds.has(peerId)) {
              objects.avatar.destroy();
              objects.marker.destroy();
              objects.label.destroy();
              this.clearSpeechBubbleForParticipant(peerId);
              this.peerObjects.delete(peerId);
            }
          }

          for (const peer of nextPeers) {
            const existing = this.peerObjects.get(peer.id);
            if (existing) {
              const peerAvatarId = normalizeAvatarId(peer.avatarId);
              existing.avatarId = peerAvatarId;
              existing.avatar.setTexture(this.avatarTextureKey(peerAvatarId, "idle"));
              existing.marker.setFillStyle(
                Phaser.Display.Color.HexStringToColor(peer.color).color,
                0.36,
              );
              existing.label.setText(peer.displayName);
              existing.targetX = peer.x;
              existing.targetY = peer.y;

              if (
                Phaser.Math.Distance.Between(existing.avatar.x, existing.avatar.y, peer.x, peer.y) >
                520
              ) {
                existing.avatar.setPosition(peer.x, peer.y);
                existing.marker.setPosition(peer.x, peer.y - 3);
                existing.label.setPosition(peer.x, peer.y - 68);
              }
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

            this.peerObjects.set(peer.id, {
              avatar,
              marker,
              label,
              avatarId: peerAvatarId,
              targetX: peer.x,
              targetY: peer.y,
            });
          }

          this.updateSpeechBubblePositions();
        }

        syncMessages(nextMessages: ChatMessage[]) {
          if (!this.initializedMessages) {
            for (const message of nextMessages) {
              this.displayedMessageIds.add(message.id);
            }
            this.initializedMessages = true;
            return;
          }

          for (const message of nextMessages.slice(-12)) {
            if (message.moderationStatus !== "allowed" || this.displayedMessageIds.has(message.id)) {
              continue;
            }

            this.displayedMessageIds.add(message.id);
            this.showSpeechBubble(message);
          }

          if (this.displayedMessageIds.size > 140) {
            const recentIds = new Set(nextMessages.slice(-80).map((message) => message.id));
            for (const messageId of this.displayedMessageIds) {
              if (!recentIds.has(messageId)) {
                this.displayedMessageIds.delete(messageId);
              }
            }
          }
        }

        private showSpeechBubble(message: ChatMessage) {
          const position = this.getParticipantPosition(message.participantId);
          if (!position) {
            return;
          }

          const previousMessageId = this.participantBubbleIds.get(message.participantId);
          if (previousMessageId) {
            this.destroySpeechBubble(previousMessageId);
          }

          const text = this.add
            .text(0, 0, this.formatSpeechBody(message.body), {
              align: "center",
              color: "#f8fafc",
              fontSize: "14px",
              fontFamily: "Arial, sans-serif",
              lineSpacing: 3,
              wordWrap: { width: 184, useAdvancedWrap: true },
            })
            .setOrigin(0.5);

          const width = Math.min(236, Math.max(118, text.width + 30));
          const height = Math.min(98, Math.max(48, text.height + 22));
          text.setPosition(0, -height / 2);

          const bubble = this.add.graphics();
          bubble.fillStyle(0x04101f, 0.9);
          bubble.lineStyle(2, 0x9ed9ff, 0.72);
          bubble.fillRoundedRect(-width / 2, -height, width, height, 14);
          bubble.strokeRoundedRect(-width / 2, -height, width, height, 14);
          bubble.fillTriangle(-12, -1, 12, -1, 0, 16);

          const container = this.add
            .container(position.x, position.y - 104, [bubble, text])
            .setDepth(13)
            .setAlpha(0)
            .setScale(0.92);

          this.speechBubbles.set(message.id, {
            container,
            participantId: message.participantId,
          });
          this.participantBubbleIds.set(message.participantId, message.id);
          this.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            duration: 180,
            ease: "Back.Out",
          });
          this.time.delayedCall(5000, () => this.fadeOutSpeechBubble(message.id));
        }

        private updateSpeechBubblePositions() {
          for (const bubble of this.speechBubbles.values()) {
            const position = this.getParticipantPosition(bubble.participantId);
            if (position) {
              bubble.container.setPosition(position.x, position.y - 104);
            }
          }
        }

        private updatePeerPositions(delta: number) {
          const smoothing = 1 - Math.exp(-delta / 220);

          for (const objects of this.peerObjects.values()) {
            const nextX = Phaser.Math.Linear(objects.avatar.x, objects.targetX, smoothing);
            const nextY = Phaser.Math.Linear(objects.avatar.y, objects.targetY, smoothing);
            const movedDistance = Phaser.Math.Distance.Between(
              objects.avatar.x,
              objects.avatar.y,
              nextX,
              nextY,
            );

            objects.avatar.setPosition(nextX, nextY);
            if (Math.abs(objects.targetX - objects.avatar.x) > 1.5) {
              objects.avatar.setFlipX(objects.targetX < objects.avatar.x);
            }
            objects.marker.setPosition(nextX, nextY - 3);
            objects.label.setPosition(nextX, nextY - 68);
            if (movedDistance > 0.18) {
              objects.avatar.setTexture(this.avatarTextureKey(objects.avatarId, "walk"));
            } else {
              objects.avatar.setTexture(this.avatarTextureKey(objects.avatarId, "idle"));
            }
          }
        }

        private getParticipantPosition(participantId: string) {
          const { self: currentSelf, peers: currentPeers } = participantsRef.current;
          if (currentSelf.id === participantId) {
            return this.localAvatar
              ? { x: this.localAvatar.x, y: this.localAvatar.y }
              : { x: currentSelf.x, y: currentSelf.y };
          }

          const peerObject = this.peerObjects.get(participantId);
          if (peerObject) {
            return { x: peerObject.avatar.x, y: peerObject.avatar.y };
          }

          const peer = currentPeers.find((candidate) => candidate.id === participantId);
          return peer ? { x: peer.x, y: peer.y } : null;
        }

        private fadeOutSpeechBubble(messageId: string) {
          const bubble = this.speechBubbles.get(messageId);
          if (!bubble) {
            return;
          }

          this.tweens.add({
            targets: bubble.container,
            alpha: 0,
            scale: 0.96,
            duration: 300,
            ease: "Sine.easeInOut",
            onComplete: () => this.destroySpeechBubble(messageId),
          });
        }

        private destroySpeechBubble(messageId: string) {
          const bubble = this.speechBubbles.get(messageId);
          if (!bubble) {
            return;
          }

          this.tweens.killTweensOf(bubble.container);
          bubble.container.destroy(true);
          this.speechBubbles.delete(messageId);
          if (this.participantBubbleIds.get(bubble.participantId) === messageId) {
            this.participantBubbleIds.delete(bubble.participantId);
          }
        }

        private clearSpeechBubbleForParticipant(participantId: string) {
          const messageId = this.participantBubbleIds.get(participantId);
          if (messageId) {
            this.destroySpeechBubble(messageId);
          }
        }

        private formatSpeechBody(body: string) {
          const compactBody = body.replace(/\s+/g, " ").trim();
          return compactBody.length > 58 ? `${compactBody.slice(0, 57)}...` : compactBody;
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

            const planetColor = Phaser.Display.Color.HexStringToColor(planet.color).color;
            const accentColor = Phaser.Display.Color.HexStringToColor(planet.accent).color;
            const isSaturn = planet.id === "saturn";
            const bodyWidth = isSaturn ? planet.radius * 4.4 : planet.radius * 2.3;
            const bodyHeight = isSaturn ? planet.radius * 2.45 : planet.radius * 2.3;

            const glow = this.add
              .circle(planet.x, planet.y, planet.radius * 1.36, planetColor, 0.2)
              .setStrokeStyle(2, accentColor, 0.34)
              .setDepth(3);

            const body = this.add
              .image(planet.x, planet.y, this.planetTextureKey(planet.id))
              .setDisplaySize(bodyWidth, bodyHeight)
              .setDepth(4);
            body.setInteractive({ useHandCursor: true });

            if (isSaturn) {
              this.add
                .ellipse(
                  planet.x,
                  planet.y,
                  planet.radius * 4.08,
                  planet.radius * 1.34,
                  0xffffff,
                  0,
                )
                .setStrokeStyle(2, accentColor, 0.46)
                .setAngle(-12)
                .setDepth(3);
            }

            const label = this.add
              .text(planet.x, planet.y + bodyHeight / 2 + 17, planet.name, {
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
            glow.setInteractive({ useHandCursor: true }).on("pointerdown", clickHandler);
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

        private planetTextureKey(planetId: PlanetTrack["id"]) {
          return `planet-${planetId}`;
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
