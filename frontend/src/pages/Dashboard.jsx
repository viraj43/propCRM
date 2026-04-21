import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, UserCheck, Handshake,
  TrendingUp, Bell, ArrowRight, LayoutDashboard
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip
} from 'recharts';
import api from '../services/api';

/* ── Colour palette synced with new design system ── */
const STATUS_COLORS = {
  NEW: '#60a5fa',
  CONTACTED: '#f59e0b',
  QUALIFIED: '#a78bfa',
  CLOSED: '#4ade80',
  LOST: '#fb7185',
};

const STAGE_COLORS = {
  INQUIRY: '#60a5fa',
  NEGOTIATION: '#f59e0b',
  AGREEMENT: '#a78bfa',
  CLOSED: '#4ade80',
  LOST: '#fb7185',
};

function fmt(num) {
  if (!num) return '₹0';
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(1) + ' Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + ' L';
  return '₹' + num.toLocaleString('en-IN');
}

/* Compact donut with legend */
function DonutCard({ title, data }) {
  if (!data?.length) return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-title">{title}</div>
      <div className="empty-state" style={{ padding: 24 }}><p>No data yet</p></div>
    </div>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-md)',
        borderRadius: 8, padding: '7px 12px', fontSize: 12,
        color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)',
      }}>
        <strong>{payload[0].name}</strong>: {payload[0].value}
      </div>
    );
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-title">{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={40} outerRadius={62}
              dataKey="value"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <ReTooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {data.map(item => (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: item.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', flex: 1 }}>{item.name}</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 13, color: 'var(--text-primary)',
              }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Single stat card */
function StatCard({ label, value, Icon, color, bg, onClick }) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="stat-icon" style={{ background: bg }}>
        <Icon size={18} strokeWidth={1.75} color={color} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/* Recent item row */
function RecentRow({ onClick, primary, secondary, right }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 13px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 8, cursor: 'pointer',
        transition: 'border-color var(--duration) var(--ease)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{primary}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{secondary}</div>
      </div>
      <div style={{ flexShrink: 0, marginLeft: 12 }}>{right}</div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" style={{ width: 36, height: 36 }} />
    </div>
  );

  if (!data) return (
    <div className="page-content">
      <div className="empty-state">
        <div className="empty-state-icon"><LayoutDashboard size={36} strokeWidth={1} /></div>
        <h3>Could not load dashboard</h3>
        <p>Make sure the backend server is running.</p>
      </div>
    </div>
  );

  const { stats, leadsByStatus, dealsByStage, recentLeads, recentDeals } = data;

  const statCards = [
    { label: 'Total Leads', value: stats.totalLeads, Icon: Users, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', to: '/leads' },
    { label: 'New Leads', value: stats.newLeads, Icon: TrendingUp, color: '#4ade80', bg: 'rgba(74,222,128,0.12)', to: '/leads' },
    { label: 'Properties', value: `${stats.availableProperties} / ${stats.totalProperties}`, Icon: Building2, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', to: '/properties' },
    { label: 'Total Clients', value: stats.totalClients, Icon: UserCheck, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', to: '/clients' },
    { label: 'Total Deals', value: stats.totalDeals, Icon: Handshake, color: '#fb7185', bg: 'rgba(251,113,133,0.12)', to: '/deals' },
    { label: 'Closed Deals', value: stats.closedDeals, Icon: Handshake, color: '#4ade80', bg: 'rgba(74,222,128,0.12)', to: '/deals' },
    { label: 'Total Revenue', value: fmt(stats.totalRevenue), Icon: TrendingUp, color: '#4ade80', bg: 'rgba(74,222,128,0.12)', to: '/deals' },
    { label: 'Conversion Rate', value: stats.conversionRate + '%', Icon: TrendingUp, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', to: '/leads' },
  ];

  const pieLeads = leadsByStatus.map(s => ({ name: s.status, value: s._count.status, color: STATUS_COLORS[s.status] ?? '#888' }));
  const pieDeals = dealsByStage.map(s => ({ name: s.stage, value: s._count.stage, color: STAGE_COLORS[s.stage] ?? '#888' }));

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Welcome back — here's what's happening today.</p>
        </div>
        {stats.pendingFollowUps > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 13, color: 'var(--warning)', fontWeight: 500,
          }}>
            <Bell size={13} strokeWidth={2} />
            {stats.pendingFollowUps} follow-up{stats.pendingFollowUps > 1 ? 's' : ''} overdue
          </div>
        )}
      </div>

      <div className="page-content">

        {/* ── KPI stat grid ── */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {statCards.map(s => (
            <StatCard
              key={s.label}
              label={s.label}
              value={s.value}
              Icon={s.Icon}
              color={s.color}
              bg={s.bg}
              onClick={() => navigate(s.to)}
            />
          ))}
        </div>

        {/* ── Charts row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <DonutCard title="Leads by Status" data={pieLeads} />
          <DonutCard title="Deals by Stage" data={pieDeals} />
        </div>

        {/* ── Recent activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Recent Leads */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Recent Leads</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')} style={{ gap: 5 }}>
                View all <ArrowRight size={12} strokeWidth={2} />
              </button>
            </div>
            {recentLeads.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><p>No leads yet</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentLeads.map(lead => (
                  <RecentRow
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    primary={lead.name}
                    secondary={lead.assignedTo?.name ?? 'Unassigned'}
                    right={<span className={`badge badge-${lead.status.toLowerCase()}`}>{lead.status}</span>}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Deals */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Recent Deals</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/deals')} style={{ gap: 5 }}>
                View all <ArrowRight size={12} strokeWidth={2} />
              </button>
            </div>
            {recentDeals.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}><p>No deals yet</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentDeals.map(deal => (
                  <RecentRow
                    key={deal.id}
                    onClick={() => navigate('/deals')}
                    primary={deal.client?.name}
                    secondary={deal.property?.title}
                    right={
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700,
                          fontSize: 13, color: 'var(--accent)', marginBottom: 3,
                        }}>
                          {fmt(deal.value)}
                        </div>
                        <span className={`badge badge-${deal.stage.toLowerCase()}`}>{deal.stage}</span>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}