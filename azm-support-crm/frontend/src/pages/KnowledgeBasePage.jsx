import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../i18n';

const empty = { title: '', body: '', tags: '' };

export default function KnowledgeBasePage() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [articles, setArticles] = useState([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);

  async function load() {
    setArticles(await api.listArticles(q));
  }

  useEffect(() => {
    load();
  }, [q]);

  async function handleSubmit(e) {
    e.preventDefault();
    const tags = form.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    await api.createArticle(token, { title: form.title, body: form.body, tags });
    setForm(empty);
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    await api.deleteArticle(token, id);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <input className="search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{t('newArticle')}</button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleSubmit}>
          <p className="inline-form-title">{t('newArticle')}</p>
          <label className="span-2">
            <span>{t('title')}</span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="span-2">
            <span>{t('body')}</span>
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          <label className="span-2">
            <span>{t('tags')}</span>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </label>
          <div className="inline-form-actions">
            <button type="button" onClick={() => setShowForm(false)}>{t('cancel')}</button>
            <button type="submit" className="btn-primary">{t('save')}</button>
          </div>
        </form>
      )}

      <div className="kb-list">
        {articles.map((article) => (
          <article key={article.id} className="kb-article">
            <h3>{article.title}</h3>
            <p>{article.body}</p>
            <div className="tags">{article.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
            <button className="btn-danger" onClick={() => handleDelete(article.id)}>{t('delete')}</button>
          </article>
        ))}
        {!articles.length && <p>{t('noResults')}</p>}
      </div>
    </div>
  );
}
