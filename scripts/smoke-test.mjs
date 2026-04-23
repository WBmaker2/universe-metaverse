import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await mkdir("artifacts", { recursive: true });

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") {
    errors.push(message.text());
  }
});

await page.goto(`${baseUrl}/teacher`, { waitUntil: "networkidle" });
await page.getByLabel("교사 표시 이름").fill("김선생님");
await page.getByLabel("수업 이름").fill("스모크 테스트");
await page.getByRole("button", { name: /세션 생성/ }).click();
await page.waitForSelector(".session-code");

const code = (await page.locator(".session-code").innerText()).trim();

await page.goto(`${baseUrl}/join?code=${code}`, { waitUntil: "networkidle" });
await page.getByLabel("이름").fill("민지");
await page.getByRole("button", { name: "은빛 로봇" }).click();
await page.getByRole("button", { name: /우주 입장/ }).click();
await page.waitForURL(new RegExp(`/room/${code}`));
await page.waitForSelector("canvas", { timeout: 8000 });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /오디오 켜기/ }).click();
await page.waitForTimeout(300);
const initialJoinInfo = await page.evaluate((sessionCode) => {
  const stored = localStorage.getItem(`universe:participant:${sessionCode}`);
  return stored ? JSON.parse(stored) : null;
}, code);
const canvasBoxBeforeClick = await page.locator("canvas").boundingBox();
const targetPlanet = {
  name: "화성",
  trackTitle: "행성 중 제1곡 화성",
  x: 2300,
  y: 1050,
};

if (!canvasBoxBeforeClick || !initialJoinInfo?.participant) {
  throw new Error("Could not calculate a planet click position.");
}

await page.locator("canvas").click({
  position: {
    x: targetPlanet.x - initialJoinInfo.participant.x + canvasBoxBeforeClick.width / 2,
    y: targetPlanet.y - initialJoinInfo.participant.y + canvasBoxBeforeClick.height / 2,
  },
});
await page.waitForTimeout(700);
await page.getByLabel("채팅 입력").fill("안녕 지구");
await page.getByLabel("메시지 보내기").click();
await page.getByText("안녕 지구").waitFor({ timeout: 5000 });

const canvasBox = await page.locator("canvas").boundingBox();
const bodyText = await page.locator("body").innerText();
const storedJoinInfo = await page.evaluate((sessionCode) => {
  const stored = localStorage.getItem(`universe:participant:${sessionCode}`);
  return stored ? JSON.parse(stored) : null;
}, code);
await page.screenshot({ path: "artifacts/metaverse-smoke.png", fullPage: true });

if (!canvasBox || canvasBox.width < 300 || canvasBox.height < 300) {
  throw new Error(`Canvas did not render at expected size: ${JSON.stringify(canvasBox)}`);
}

if (!bodyText.includes("감상 상태") || !bodyText.includes("채팅")) {
  throw new Error("Room UI did not render expected panels.");
}

if (storedJoinInfo?.participant?.avatarId !== "robot") {
  throw new Error("Selected avatar was not saved for the participant.");
}

if (!bodyText.includes(targetPlanet.name) || !bodyText.includes(targetPlanet.trackTitle)) {
  throw new Error(`Planet click did not update listening panel to ${targetPlanet.name}.`);
}

if (!bodyText.includes("안녕 지구")) {
  throw new Error("Chat message did not appear in the room panel.");
}

const recoveryCode = `R${code.slice(1)}`;
const recoveryResponse = await page.request.patch(`${baseUrl}/api/sessions`, {
  data: {
    action: "chat",
    code: recoveryCode,
    participantId: "participant-recovery",
    body: "복구 테스트",
    recoveryState: {
      session: {
        id: "session-recovery",
        code: recoveryCode,
        title: "복구 테스트 수업",
        teacherName: "김선생님",
        status: "active",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      participants: [
        {
          id: "participant-recovery",
          sessionCode: recoveryCode,
          displayName: "복구학생",
          avatarId: "robot",
          color: "#7dd3fc",
          x: 1800,
          y: 1200,
          activePlanetId: null,
          joinedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        },
      ],
      messages: [],
    },
  },
});

if (!recoveryResponse.ok()) {
  throw new Error(`Chat recovery failed: ${recoveryResponse.status()}`);
}

await browser.close();

if (errors.length) {
  throw new Error(`Browser errors: ${errors.join(" | ")}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      code,
      canvas: canvasBox,
      screenshot: "artifacts/metaverse-smoke.png",
    },
    null,
    2,
  ),
);
