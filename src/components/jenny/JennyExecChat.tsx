'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Send,
  X,
  Bot,
  User,
  Sparkles,
  Shield,
  Users,
  TrendingUp,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface JennyExecChatProps {
  mode: 'compliance' | 'hr' | 'insights';
  complianceStats?: {
    totalViolations: number;
    mealBreakViolations: number;
    restBreakViolations: number;
    overtimeAlerts: number;
  };
  inline?: boolean;
}

const MODE_STYLE = {
  compliance: {
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'bg-blue-600',
  },
  hr: {
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    accentColor: 'bg-purple-600',
  },
  insights: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    accentColor: 'bg-green-600',
  },
};

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n(\d+)\. /g, '\n$1. ')
    .replace(/\n/g, '<br/>');
}

export default function JennyExecChat({
  mode,
  complianceStats,
  inline = false,
}: JennyExecChatProps) {
  const { company } = useAuth();
  const { t, language } = useLanguage();
  const style = MODE_STYLE[mode];
  const ModeIcon = style.icon;

  const title = t(`jenny.${mode}.title`);
  const subtitle = t(`jenny.${mode}.subtitle`);
  const greeting = t(`jenny.${mode}.greeting`);
  const placeholder = t(`jenny.${mode}.placeholder`);
  const quickQuestions = [
    t(`jenny.${mode}.q1`),
    t(`jenny.${mode}.q2`),
    t(`jenny.${mode}.q3`),
    t(`jenny.${mode}.q4`),
  ];

  const [isOpen, setIsOpen] = useState(inline);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/jenny-exec/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          mode,
          language,
          context: {
            companyName: company?.name,
            companyPlan: company?.plan,
            industry: company?.industry,
            complianceStats,
          },
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || (language === 'es'
          ? 'Lo siento, no pude generar una respuesta. Por favor intenta de nuevo.'
          : 'Sorry, I could not generate a response. Please try again.'),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: t('jenny.errorConnect'),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Floating button + panel (for compliance/hr pages)
  if (!inline) {
    return (
      <>
        {/* Floating button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 z-50 ${style.accentColor} text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-105 group`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              <span className="hidden group-hover:inline text-sm font-medium pr-1">
                {t('jenny.askJenny')}
              </span>
            </div>
          </button>
        )}

        {/* Chat panel */}
        {isOpen && (
          <div className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div
              className={`${style.accentColor} text-white px-5 py-4 flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <ModeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{title}</h3>
                  <p className="text-xs opacity-80">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 ${style.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}
                    >
                      <Bot className={`w-4 h-4 ${style.color}`} />
                    </div>
                    <div className={`${style.bgColor} rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]`}>
                      <p className="text-sm text-gray-700">
                        {greeting}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pl-11">
                    {quickQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className={`block w-full text-left text-sm px-3 py-2 rounded-lg border ${style.borderColor} ${style.bgColor} hover:opacity-80 transition-opacity`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-gray-200' : style.bgColor
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Bot className={`w-4 h-4 ${style.color}`} />
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-gray-100 rounded-tr-sm'
                          : `${style.bgColor} rounded-tl-sm`
                      }`}
                    >
                      <div
                        className="text-sm text-gray-700 leading-relaxed [&>strong]:font-semibold"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                      />
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 ${style.bgColor} rounded-full flex items-center justify-center`}
                  >
                    <Bot className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className={`${style.bgColor} rounded-2xl rounded-tl-sm px-4 py-3`}>
                    <Loader2 className={`w-4 h-4 ${style.color} animate-spin`} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`${style.accentColor} text-white p-2 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </>
    );
  }

  // Inline mode (embedded in page)
  return (
    <div className={`card border ${style.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${style.bgColor} rounded-lg flex items-center justify-center`}>
            <Sparkles className={`w-5 h-5 ${style.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-navy-500 text-sm flex items-center gap-2">
              {title}
              <span className={`text-[10px] px-1.5 py-0.5 ${style.bgColor} ${style.color} rounded-full font-medium`}>
                AI
              </span>
            </h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('jenny.clearChat')}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">
              {greeting.split('.')[0]}:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border ${style.borderColor} hover:${style.bgColor} transition-colors`}
                >
                  <MessageCircle className={`w-3 h-3 ${style.color} inline mr-1.5`} />
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-gray-200' : style.bgColor
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-3 h-3 text-gray-600" />
                  ) : (
                    <Bot className={`w-3 h-3 ${style.color}`} />
                  )}
                </div>
                <div
                  className={`rounded-xl px-3 py-2 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-gray-100 rounded-tr-sm'
                      : `${style.bgColor} rounded-tl-sm`
                  }`}
                >
                  <div
                    className="text-xs text-gray-700 leading-relaxed [&>strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 ${style.bgColor} rounded-full flex items-center justify-center`}>
                  <Bot className={`w-3 h-3 ${style.color}`} />
                </div>
                <div className={`${style.bgColor} rounded-xl rounded-tl-sm px-3 py-2`}>
                  <Loader2 className={`w-3 h-3 ${style.color} animate-spin`} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />

            {messages.length > 4 && (
              <button
                onClick={scrollToBottom}
                className="mx-auto block text-xs text-gray-400 hover:text-gray-600"
              >
                <ChevronDown className="w-4 h-4 inline" /> {t('jenny.scrollLatest')}
              </button>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`${style.accentColor} text-white p-2 rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
