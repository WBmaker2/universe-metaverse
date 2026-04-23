"use client";

import { moderateChatMessage } from "@/lib/moderation";
import type { ChatMessage } from "@/lib/types";
import { MessageCircle, Send } from "lucide-react";
import { useMemo, useState } from "react";

type ChatPanelProps = {
  code: string;
  participantId: string;
  messages: ChatMessage[];
  onSent: () => void;
};

export function ChatPanel({ code, participantId, messages, onSent }: ChatPanelProps) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const latestMessages = useMemo(() => messages.slice(-40), [messages]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const moderation = moderateChatMessage(text);
    if (!moderation.allowed) {
      setNotice(moderation.reason ?? "메시지를 보낼 수 없습니다.");
      return;
    }

    const response = await fetch(`/api/sessions/${code}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participantId,
        body: moderation.sanitized,
      }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setNotice(data.error ?? "메시지를 보낼 수 없습니다.");
      return;
    }

    setText("");
    onSent();
  }

  return (
    <aside className="chat-panel" aria-label="세션 채팅">
      <div className="panel-title">
        <MessageCircle size={19} aria-hidden="true" />
        <h2>채팅</h2>
      </div>

      <div className="message-list" aria-live="polite">
        {latestMessages.length > 0 ? (
          latestMessages.map((message) => (
            <p className="message-row" key={message.id}>
              <strong>{message.displayName}</strong>
              <span>{message.body}</span>
            </p>
          ))
        ) : (
          <p className="empty-state">감상한 느낌을 짧게 나눠보세요.</p>
        )}
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          aria-label="채팅 입력"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="수업에 어울리는 말로 입력"
          maxLength={180}
        />
        <button type="submit" aria-label="메시지 보내기">
          <Send size={18} aria-hidden="true" />
        </button>
      </form>

      {notice ? <p className="chat-notice">{notice}</p> : null}
    </aside>
  );
}
