import { useState, useRef, useEffect, useCallback } from 'react';
import { DEMO_INITIAL_MESSAGE, OLIVIA_REPLIES, QUICK_CHIPS } from '../lib/demo-data';
import { BottomNav } from '../components/bottom-nav';

type MessageRole = 'olivia' | 'user';

type Message = {
  id: string;
  role: MessageRole;
  text: string;
  showDraftCard?: boolean;
};

const DRAFT_PREVIEW =
  "Hi Mike, just checking in on the quote from earlier this week — we're keen to get the bathroom project moving and would love to hear back when you have a moment. Any update on timing? Thanks!";

export function OliviaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'olivia',
      text: DEMO_INITIAL_MESSAGE,
      showDraftCard: false,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [replyIndex, setReplyIndex] = useState(0);
  const [showChips, setShowChips] = useState(true);
  const [draftSent, setDraftSent] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTo({ top: chatAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (messages.length >= 3) setShowChips(false);
    scrollToBottom();

    // Check if this is the "yes draft it" response to trigger draft card
    const lowerText = text.toLowerCase();
    const isYesDraft =
      lowerText.includes('yes') ||
      lowerText.includes('draft') ||
      lowerText.includes('write') ||
      lowerText.includes('please');

    setTimeout(() => {
      if (isYesDraft && messages.length <= 2) {
        const oliviaMsg: Message = {
          id: `olivia-${Date.now()}`,
          role: 'olivia',
          text: "Done! Here's a draft — feel free to edit before sending:",
          showDraftCard: true,
        };
        setMessages((prev) => [...prev, oliviaMsg]);
      } else {
        const reply = OLIVIA_REPLIES[replyIndex % OLIVIA_REPLIES.length];
        const oliviaMsg: Message = {
          id: `olivia-${Date.now()}`,
          role: 'olivia',
          text: reply,
        };
        setMessages((prev) => [...prev, oliviaMsg]);
        setReplyIndex((i) => i + 1);
      }
      scrollToBottom();
    }, 900);
  }, [messages.length, replyIndex, scrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleChipClick = (chip: string) => {
    setInputValue(chip.replace(/^[^\w]*/, '').trim());
    textareaRef.current?.focus();
  };

  const handleSendDraft = () => {
    setDraftSent(true);
    const sentMsg: Message = { id: `user-sent-${Date.now()}`, role: 'user', text: 'Sent! ✅' };
    setMessages((prev) => [...prev, sentMsg]);
    setTimeout(() => {
      const confirmMsg: Message = {
        id: `olivia-confirm-${Date.now()}`,
        role: 'olivia',
        text: "Perfect, I'll mark the plumber task as waiting on reply and remind you if there's no response in 2 days. 🎉",
      };
      setMessages((prev) => [...prev, confirmMsg]);
      scrollToBottom();
    }, 600);
    scrollToBottom();
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
  };

  return (
    <div className="screen">
      {/* Header — static, doesn't scroll */}
      <div className="ai-header">
        <div className="ai-title-row">
          <div className="olivia-orb" aria-hidden="true">✦</div>
          <div>
            <div className="ai-title">Olivia</div>
            <div className="ai-sub">Your household assistant · always here</div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="chat-area" ref={chatAreaRef} role="log" aria-live="polite" aria-label="Conversation with Olivia">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg msg-${msg.role}`}>
            <div className="msg-label">{msg.role === 'olivia' ? 'Olivia' : 'You'}</div>
            <div className="msg-bubble">
              {msg.text}
              {msg.showDraftCard && !draftSent && (
                <div className="olivia-action-card">
                  <div className="oa-label">✉️ Draft message</div>
                  <div className="oa-preview">{DRAFT_PREVIEW}</div>
                  <div className="oa-buttons">
                    <button type="button" className="oa-btn oa-btn-send" onClick={handleSendDraft}>
                      Send it ✓
                    </button>
                    <button type="button" className="oa-btn oa-btn-edit">
                      Edit first
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick chips — shown when conversation is short */}
      {showChips && (
        <div className="quick-chips-row">
          <div className="quick-chips" role="list" aria-label="Quick suggestions">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className="quick-chip"
                role="listitem"
                onClick={() => handleChipClick(chip)}
                aria-label={`Suggest: ${chip}`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sticky input bar */}
      <div className="chat-input-area">
        <div className="chat-input-bar">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            value={inputValue}
            placeholder="Ask Olivia anything…"
            onChange={(e) => {
              setInputValue(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Message to Olivia"
          />
          <button
            type="button"
            className="chat-send"
            onClick={() => sendMessage(inputValue)}
            aria-label="Send message"
            disabled={!inputValue.trim()}
          >
            ↑
          </button>
        </div>
      </div>

      <BottomNav activeTab="olivia" />
    </div>
  );
}
