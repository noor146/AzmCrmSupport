import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

const POLL_MS = 3000;

export default function LiveChatPage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState('');
  const lastIdRef = useRef(0);
  const listRef = useRef(null);

  async function loadList() {
    setConversations(await api.listConversations(token));
  }

  useEffect(() => {
    loadList();
    const interval = setInterval(loadList, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function loadThread() {
      const data = await api.getConversation(token, selectedId);
      if (cancelled) return;
      setConversation(data);
      lastIdRef.current = data.messages.length ? data.messages[data.messages.length - 1].id : 0;
    }

    loadThread();
    const interval = setInterval(loadThread, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [conversation]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.sendAgentMessage(token, selectedId, draft);
    setDraft('');
    const data = await api.getConversation(token, selectedId);
    setConversation(data);
    loadList();
  }

  async function handleClose() {
    await api.updateConversation(token, selectedId, { status: 'closed' });
    const data = await api.getConversation(token, selectedId);
    setConversation(data);
    loadList();
  }

  return (
    <div className="live-chat-page">
      <aside className="live-chat-list">
        {conversations.map((c) => (
          <button
            key={c.id}
            className={`live-chat-list-item${c.id === selectedId ? ' active' : ''}`}
            onClick={() => setSelectedId(c.id)}
          >
            <div className="live-chat-list-top">
              <span className="live-chat-visitor">{c.visitorName}</span>
              <span className={`status-chip ${c.status === 'OPEN' ? 'done' : 'todo'}`}>{c.status}</span>
            </div>
            <p className="muted live-chat-snippet">{c.messages[0]?.body ?? '—'}</p>
          </button>
        ))}
        {!conversations.length && <p className="muted">{t('noResults')}</p>}
      </aside>

      <section className="live-chat-thread">
        {!conversation ? (
          <p className="muted">{t('noConversationSelected')}</p>
        ) : (
          <>
            <div className="live-chat-thread-head">
              <div>
                <strong>{conversation.visitorName}</strong>
                {conversation.visitorEmail && <span className="muted"> · {conversation.visitorEmail}</span>}
              </div>
              {conversation.status === 'OPEN' && (
                <button type="button" onClick={handleClose}>{t('closeConversation')}</button>
              )}
            </div>

            <div className="chat-widget-messages live-chat-messages" ref={listRef}>
              {conversation.messages.map((m) => (
                <div key={m.id} className={`chat-bubble chat-bubble-${m.sender.toLowerCase()}`}>
                  {m.body}
                </div>
              ))}
            </div>

            {conversation.status === 'OPEN' ? (
              <form className="chat-widget-composer" onSubmit={handleSend}>
                <input placeholder={t('typeMessage')} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <button type="submit">{t('send')}</button>
              </form>
            ) : (
              <p className="muted">{t('conversationClosed')}</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
