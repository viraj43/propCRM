import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTasks = () => {
    api.get('/tasks').then(r => { setTasks(r.data); setLoading(false); });
  };

  useEffect(() => { fetchTasks(); }, []);

  const toggleTask = async (id, isDone) => {
    await api.put(`/tasks/${id}`, { isDone: !isDone });
    fetchTasks();
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const groups = {
    OVERDUE: [],
    TODAY: [],
    UPCOMING: [],
    COMPLETED: []
  };

  tasks.forEach(t => {
    if (t.isDone) {
      groups.COMPLETED.push(t);
      return;
    }
    const d = new Date(t.scheduledAt);
    if (d < todayStart) groups.OVERDUE.push(t);
    else if (d >= todayStart && d < tomorrowStart) groups.TODAY.push(t);
    else groups.UPCOMING.push(t);
  });

  const renderGroup = (title, groupTasks, color) => (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        {title} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({groupTasks.length})</span>
      </h3>
      {groupTasks.length === 0 ? (
        <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tasks in this category.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groupTasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', opacity: t.isDone ? 0.6 : 1 }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.isDone ? 'var(--success)' : 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} onClick={() => toggleTask(t.id, t.isDone)}>
                {t.isDone ? <CheckCircle size={20} /> : <Circle size={20} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, textDecoration: t.isDone ? 'line-through' : 'none', color: 'var(--text-primary)' }}>{t.note || 'Follow-up scheduled'}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: color === 'var(--danger)' && !t.isDone ? 'var(--danger)' : undefined }}>
                    <Calendar size={13} /> {new Date(t.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span onClick={() => navigate(`/leads/${t.lead?.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--accent-hover)' }}>
                    👤 {t.lead?.name} <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Tasks & Follow-ups</h2>
          <p className="page-subtitle">Manage your daily agenda and lead follow-ups</p>
        </div>
      </div>
      <div className="page-content" style={{ maxWidth: 800 }}>
        {renderGroup('Overdue', groups.OVERDUE, 'var(--danger)')}
        {renderGroup('Today', groups.TODAY, 'var(--warning)')}
        {renderGroup('Upcoming', groups.UPCOMING, 'var(--info)')}
        {renderGroup('Completed', groups.COMPLETED, 'var(--success)')}
      </div>
    </>
  );
}
