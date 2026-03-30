'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  ChevronLeft,
  CheckCheck,
  User,
  Wrench,
} from 'lucide-react';

interface Message {
  id: string;
  job_id: string | null;
  sender_type: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface JobThread {
  id: string;
  title: string;
  status: string;
  scheduled_date: string;
}

export default function PortalMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [jobs, setJobs] = useState<JobThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = (jobId?: string | null) => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    const url = jobId
      ? `/api/portal?action=messages&jobId=${jobId}`
      : '/api/portal?action=messages';

    fetch(url, { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
        if (!jobId) setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectJob = (jobId: string) => {
    setSelectedJob(jobId);
    fetchMessages(jobId);

    // Mark messages as read
    const token = localStorage.getItem('portal_token');
    if (token) {
      fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-portal-token': token },
        body: JSON.stringify({ action: 'mark_messages_read', jobId }),
      });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);

    const token = localStorage.getItem('portal_token');
    const response = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-portal-token': token || '' },
      body: JSON.stringify({
        action: 'send_message',
        jobId: selectedJob,
        message: newMessage.trim(),
      }),
    });

    if (response.ok) {
      setNewMessage('');
      fetchMessages(selectedJob);
    }
    setSending(false);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading messages...</div>;

  // Thread list view
  if (!selectedJob) {
    // Group messages by job to show thread preview
    const threadMap = new Map<string, { job: JobThread | null; lastMessage: Message; unread: number }>();

    for (const msg of messages) {
      const key = msg.job_id || '_general';
      const existing = threadMap.get(key);
      const isUnread = msg.sender_type === 'contractor' && !msg.is_read;

      if (!existing || new Date(msg.created_at) > new Date(existing.lastMessage.created_at)) {
        threadMap.set(key, {
          job: jobs.find(j => j.id === msg.job_id) || null,
          lastMessage: msg,
          unread: (existing?.unread || 0) + (isUnread ? 1 : 0),
        });
      } else if (isUnread) {
        existing.unread++;
      }
    }

    const threads = Array.from(threadMap.entries()).sort(
      (a, b) => new Date(b[1].lastMessage.created_at).getTime() - new Date(a[1].lastMessage.created_at).getTime()
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              {unreadCount} unread
            </span>
          )}
        </div>

        {threads.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-medium text-gray-700">No messages yet</h3>
            <p className="text-sm text-gray-500 mt-1">Messages from your contractor will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map(([key, thread]) => (
              <button
                key={key}
                onClick={() => handleSelectJob(thread.lastMessage.job_id || key)}
                className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {thread.job ? thread.job.title : 'General'}
                    </p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {thread.lastMessage.sender_type === 'customer' ? 'You: ' : ''}
                      {thread.lastMessage.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(thread.lastMessage.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  {thread.unread > 0 && (
                    <span className="ml-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium flex-shrink-0">
                      {thread.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Start new message if there are jobs */}
        {jobs.length > 0 && threads.length === 0 && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-700">
              Have a question about an upcoming job? Select it below to start a conversation.
            </p>
            <div className="mt-3 space-y-2">
              {jobs.slice(0, 5).map(job => (
                <button
                  key={job.id}
                  onClick={() => handleSelectJob(job.id)}
                  className="w-full text-left px-3 py-2 bg-white rounded-lg text-sm hover:bg-blue-50 transition-colors"
                >
                  {job.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat view
  const jobTitle = jobs.find(j => j.id === selectedJob)?.title || 'Conversation';
  const jobMessages = messages.filter(m => m.job_id === selectedJob);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <button onClick={() => { setSelectedJob(null); fetchMessages(); }} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h2 className="font-semibold text-gray-900">{jobTitle}</h2>
          <p className="text-xs text-gray-400">{jobMessages.length} messages</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {jobMessages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">No messages yet. Send one below.</p>
        )}

        {jobMessages.map(msg => {
          const isCustomer = msg.sender_type === 'customer';
          return (
            <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isCustomer ? 'order-2' : ''}`}>
                <div className={`flex items-center gap-1.5 mb-1 ${isCustomer ? 'justify-end' : ''}`}>
                  {isCustomer ? (
                    <User className="w-3 h-3 text-gray-400" />
                  ) : (
                    <Wrench className="w-3 h-3 text-gray-400" />
                  )}
                  <span className="text-xs text-gray-400">{msg.sender_name}</span>
                </div>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  isCustomer
                    ? 'bg-navy-500 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 ${isCustomer ? 'justify-end' : ''}`}>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {isCustomer && msg.is_read && (
                    <CheckCheck className="w-3 h-3 text-blue-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Compose */}
      <div className="border-t pt-3 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          className="px-4 py-2.5 bg-navy-500 text-white rounded-xl hover:bg-navy-600 disabled:opacity-50 transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
