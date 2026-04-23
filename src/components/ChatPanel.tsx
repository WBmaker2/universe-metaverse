"use client";

import { moderateChatMessage } from "@/lib/moderation";
import type { ChatMessage } from "@/lib/types";
import { MessageCircle, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (body: string) => Promise<ChatMessage>;
  onSent: (message: ChatMessage) => void;
};

export function ChatPanel({ messages, onSend, onSent }: ChatPanelProps) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestMessages = useMemo(() => messages.slice(-40), [messages]);
  const latestMessageId = latestMessages.at(-1)?.id ?? "";

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) {
      return;
    }

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: "smooth",
    });
  }, [latestMessageId]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const moderation = moderateChatMessage(text);
    if (!moderation.allowed) {
      setNotice(moderation.reason ?? "메시지를 보낼 수 없습니다.");
      return;
    }

    try {
      const message = await onSend(moderation.sanitized);
      setText("");
      onSent(message);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "메시지를 보낼 수 없습니다.");
    }
  }

  function keepInputVisible() {
    window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 120);
  }

  return (
    <aside className="chat-panel" aria-label="세션 채팅">
      <div className="panel-title">
        <MessageCircle size={19} aria-hidden="true" />
        <h2>채팅</h2>
      </div>

      <div className="message-list" aria-live="polite" ref={messageListRef}>
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
          autoComplete="off"
          inputMode="text"
          onFocus={keepInputVisible}
          ref={inputRef}
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
