import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useI18n } from '../i18n';

const STORAGE_KEY = 'chat_conversation_id';
const POLL_MS = 3000;

export default function ChatWidget() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const lastIdRef = useRef(0);
  const listRef = useRef(null);

  async function startChat(e) {
    e.preventDefault();
    const conversation = await api.startConversation({ visitorName: name, visitorEmail: email });
    localStorage.setItem(STORAGE_KEY, String(conversation.id));
    setConversationId(conversation.id);
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const message = await api.sendVisitorMessage(conversationId, draft);
    setMessages((prev) => [...prev, message]);
    lastIdRef.current = message.id;
    setDraft('');
  }

  useEffect(() => {
    if (!open || !conversationId) return;
    let cancelled = false;

    async function poll() {
      const newMessages = await api.pollVisitorMessages(conversationId, lastIdRef.current);
      if (cancelled || !newMessages.length) return;
      lastIdRef.current = newMessages[newMessages.length - 1].id;
      setMessages((prev) => [...prev, ...newMessages]);
    }

    api.pollVisitorMessages(conversationId, 0).then((all) => {
      if (cancelled) return;
      setMessages(all);
      lastIdRef.current = all.length ? all[all.length - 1].id : 0;
    });

    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget-panel">
          <div className="chat-widget-head">
            <span>{t('chatWithUs')}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="close">×</button>
          </div>

          {!conversationId ? (
            <form className="chat-widget-intake" onSubmit={startChat}>
              <input placeholder={t('yourName')} required value={name} onChange={(e) => setName(e.target.value)} />
              <input placeholder={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit">{t('startChat')}</button>
            </form>
          ) : (
            <>
              <div className="chat-widget-messages" ref={listRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`chat-bubble chat-bubble-${m.sender.toLowerCase()}`}>
                    {m.body}
                  </div>
                ))}
                {!messages.length && <p className="muted chat-widget-empty">…</p>}
              </div>
              <form className="chat-widget-composer" onSubmit={sendMessage}>
                <input
                  placeholder={t('typeMessage')}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit">{t('send')}</button>
              </form>
            </>
          )}
        </div>
      )}

      <button type="button" className="chat-widget-bubble" onClick={() => setOpen((o) => !o)} aria-label={t('chatWithUs')}>
        {open ? (
          '×'
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
