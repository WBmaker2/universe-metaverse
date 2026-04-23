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
await page.locator("canvas").click({ position: { x: 240, y: 257 } });
await page.waitForTimeout(700);

const canvasBox = await page.locator("canvas").boundingBox();
const bodyText = await page.locator("body").innerText();
const storedJoinInfo = await page.evaluate((sessionCode) => {
  const stored = localStorage.getItem(`universe:participant:${sessionCode}`);
  return stored ? JSON.parse(stored) : null;
}, code);
await page.screenshot({ path: "artifacts/metaverse-smoke.png", fullPage: true });
await browser.close();

if (!canvasBox || canvasBox.width < 300 || canvasBox.height < 300) {
  throw new Error(`Canvas did not render at expected size: ${JSON.stringify(canvasBox)}`);
}

if (!bodyText.includes("감상 상태") || !bodyText.includes("채팅")) {
  throw new Error("Room UI did not render expected panels.");
}

if (storedJoinInfo?.participant?.avatarId !== "robot") {
  throw new Error("Selected avatar was not saved for the participant.");
}

if (!bodyText.includes("지구") || !bodyText.includes("푸른 바다 만들기")) {
  throw new Error("Planet click did not update listening panel to Earth.");
}

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
