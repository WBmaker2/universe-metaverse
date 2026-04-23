const NON_WORD_PATTERN = /[^\p{L}\p{N}]+/gu;
const REPEATED_CHAR_PATTERN = /(.)\1{2,}/gu;

const BLOCKED_TERMS = [
  "시발",
  "씨발",
  "ㅅㅂ",
  "병신",
  "븅신",
  "바보새끼",
  "새끼",
  "꺼져",
  "죽어",
  "닥쳐",
  "개새",
  "개같",
  "미친놈",
  "미친년",
  "존나",
  "좆",
  "ㅈㄴ",
  "ㅂㅅ",
];

export type ModerationResult = {
  allowed: boolean;
  reason?: string;
  sanitized: string;
};

export function normalizeMessage(input: string) {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(REPEATED_CHAR_PATTERN, "$1$1")
    .replace(NON_WORD_PATTERN, "");
}

export function moderateChatMessage(input: string): ModerationResult {
  const sanitized = input.trim().replace(/\s+/g, " ").slice(0, 180);

  if (sanitized.length === 0) {
    return {
      allowed: false,
      reason: "내용을 입력해주세요.",
      sanitized,
    };
  }

  const normalized = normalizeMessage(sanitized);
  const blocked = BLOCKED_TERMS.some((term) => normalized.includes(normalizeMessage(term)));

  if (blocked) {
    return {
      allowed: false,
      reason: "수업 채팅에 어울리는 말로 다시 적어주세요.",
      sanitized,
    };
  }

  return {
    allowed: true,
    sanitized,
  };
}
