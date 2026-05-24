'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, ExternalLink, MessageSquare } from 'lucide-react';

type Role = 'user' | 'assistant';
type ChatMessage = { role: Role; content: string };
type Source = { slug: string; title: string };

const WIKI_BASE = 'https://github.com/Missmv09/ToolTimePro-Ai/wiki';

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm Jenny. Ask me how to do anything in ToolTime Pro — like \"how do I set up online booking?\" or \"how does Jenny Lite capture leads?\".",
};

// $crisp is declared globally by CrispChat.tsx — don't redeclare here.

function openCrispChat() {
  if (typeof window === 'undefined') return;
  const w = window as Window & { $crisp?: unknown[] };
  if (!Array.isArray(w.$crisp)) w.$crisp = [];
  w.$crisp.push(['do', 'chat:open']);
  w.$crisp.push(['do', 'chat:show']);
}

export default function AskJennyDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [sourcesByIndex, setSourcesByIndex] = useState<Record<number, Source[]>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/help/ask-jenny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply: ChatMessage = {
        role: 'assistant',
        content: data.message || "I couldn't generate a reply. Try rephrasing, or open live chat.",
      };
      setMessages((prev) => {
        const updated = [...prev, reply];
        if (Array.isArray(data.sources) && data.sources.length > 0) {
          setSourcesByIndex((m) => ({ ...m, [updated.length - 1]: data.sources as Source[] }));
        }
        return updated;
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I couldn't reach the help service. Click 'Talk to a human' below to open live chat.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating launcher — bottom-left so it doesn't collide with Crisp's bubble */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Ask Jenny help"
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-navy-700 px-4 py-3 text-white shadow-lg shadow-navy-900/20 transition hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-navy-400"
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">Ask Jenny</span>
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-label="Ask Jenny help"
          className="fixed bottom-5 left-5 z-40 flex h-[560px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-gray-200 bg-navy-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <div className="text-sm font-semibold">Ask Jenny</div>
                <div className="text-xs text-navy-100">Self-help for ToolTime Pro</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Ask Jenny"
              className="rounded p-1 hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-navy-700 px-3 py-2 text-sm text-white'
                      : 'max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200'
                  }
                >
                  {m.content}
                  {m.role === 'assistant' && sourcesByIndex[i]?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-gray-100 pt-2">
                      {sourcesByIndex[i].map((s) => (
                        <a
                          key={s.slug}
                          href={`${WIKI_BASE}/${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-700 hover:bg-navy-100"
                        >
                          {s.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-gray-500 shadow-sm ring-1 ring-gray-200">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask how to do something…"
                rows={1}
                className="max-h-24 flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={openCrispChat}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Talk to a human
            </button>
          </div>
        </div>
      )}
    </>
  );
}
