import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import { Download, TrendingUp, Users, Handshake, IndianRupee } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import api from '../services/api';

function fmt(num) {
  if (!num) return '₹0';
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
  return '₹' + num.toLocaleString('en-IN');
}

const SOURCE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/reports').then(r => { setData(r.data); setLoading(false); });
  }, []);

  const exportLeadsExcel = () => {
    const rows = data.allLeads.map(l => ({
      Name: l.name,
      Phone: l.phone,
      Email: l.email || '',
      Budget: l.budget || '',
      Source: l.source,
      Status: l.status,
      'Assigned To': l.assignedTo?.name || '',
      'Created At': new Date(l.createdAt).toLocaleDateString('en-IN'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'PropCRM_Leads_Report.xlsx');
  };

  const exportDealsExcel = () => {
    const rows = data.allDeals.map(d => ({
      Client: d.client?.name || '',
      'Client Email': d.client?.email || '',
      Property: d.property?.title || '',
      Location: d.property?.location || '',
      Agent: d.agent?.name || '',
      Stage: d.stage,
      'Deal Value': d.value,
      Commission: d.commission || 0,
      Notes: d.notes || '',
      'Created At': new Date(d.createdAt).toLocaleDateString('en-IN'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Deals');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'PropCRM_Deals_Report.xlsx');
  };

  const exportAgentsExcel = () => {
    const rows = data.agentStats.map(a => ({
      Agent: a.name,
      Email: a.email,
      'Total Leads': a.totalLeads,
      'Closed Leads': a.closedLeads,
      'Total Deals': a.totalDeals,
      'Closed Deals': a.closedDeals,
      'Total Revenue': a.totalRevenue,
      'Total Commission': a.totalCommission,
      'Conversion Rate (%)': a.conversionRate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agent Performance');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'PropCRM_Agent_Performance.xlsx');
  };

  if (loading) return <div className="loading-screen"><div className="loading-spinner" style={{ width: 36, height: 36 }} /></div>;
  if (!data) return <div className="page-content"><div className="empty-state"><h3>Could not load reports</h3></div></div>;

  const { agentStats, monthlyRevenue, leadsBySource } = data;

  const pieSourceData = leadsBySource.map((s, i) => ({
    name: s.source, value: s._count.source, color: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));

  const totalRevenue = agentStats.reduce((s, a) => s + a.totalRevenue, 0);
  const totalCommission = agentStats.reduce((s, a) => s + a.totalCommission, 0);
  const totalClosedDeals = agentStats.reduce((s, a) => s + a.closedDeals, 0);
  const totalLeads = agentStats.reduce((s, a) => s + a.totalLeads, 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="page-subtitle">Sales performance, lead analytics, and agent insights</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={exportLeadsExcel}>
            <Download size={14} /> Export Leads
          </button>
          <button className="btn btn-secondary" onClick={exportDealsExcel}>
            <Download size={14} /> Export Deals
          </button>
          <button className="btn btn-primary" onClick={exportAgentsExcel}>
            <Download size={14} /> Agent Report
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* KPI Cards */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), icon: IndianRupee, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
            { label: 'Total Commission', value: fmt(totalCommission), icon: TrendingUp, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
            { label: 'Deals Closed', value: totalClosedDeals, icon: Handshake, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            { label: 'Total Leads', value: totalLeads, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="card">
            <div className="card-title">Monthly Revenue (Last 6 Months)</div>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }}
                    formatter={(v, name) => [fmt(v), name === 'revenue' ? 'Revenue' : 'Commission']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} name="Revenue" />
                  <Line type="monotone" dataKey="commission" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} name="Commission" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}><p>No closed deals yet to chart.</p></div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Leads by Source</div>
            {pieSourceData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <PieChart width={160} height={160}>
                  <Pie data={pieSourceData} cx={80} cy={80} innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {pieSourceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pieSourceData.map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{s.name}</span>
                      <span style={{ fontWeight: 700 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}><p>No leads yet</p></div>
            )}
          </div>
        </div>

        {/* Agent Performance */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Agent Performance</div>
            <button className="btn btn-secondary btn-sm" onClick={exportAgentsExcel}><Download size={13} /> Export</button>
          </div>
          {agentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentStats} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="totalLeads" name="Total Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closedDeals" name="Closed Deals" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}><p>No agents to display</p></div>
          )}
        </div>

        {/* Agent Stats Table */}
        {agentStats.length > 0 && (
          <div className="card">
            <div className="card-title">Agent Leaderboard</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Agent', 'Total Leads', 'Closed Leads', 'Deals', 'Closed', 'Revenue', 'Commission', 'Conversion'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...agentStats].sort((a, b) => b.totalRevenue - a.totalRevenue).map((a, i) => (
                    <tr key={a.name} style={{ borderBottom: '1px solid var(--border)', background: i === 0 ? 'rgba(99,102,241,0.05)' : 'transparent' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        {i === 0 && <span style={{ marginRight: 6 }}>🥇</span>}
                        {i === 1 && <span style={{ marginRight: 6 }}>🥈</span>}
                        {i === 2 && <span style={{ marginRight: 6 }}>🥉</span>}
                        {a.name}
                      </td>
                      <td style={{ padding: '12px' }}>{a.totalLeads}</td>
                      <td style={{ padding: '12px', color: 'var(--success)' }}>{a.closedLeads}</td>
                      <td style={{ padding: '12px' }}>{a.totalDeals}</td>
                      <td style={{ padding: '12px', color: 'var(--success)' }}>{a.closedDeals}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--accent-hover)' }}>{fmt(a.totalRevenue)}</td>
                      <td style={{ padding: '12px' }}>{fmt(a.totalCommission)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: parseFloat(a.conversionRate) > 20 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: parseFloat(a.conversionRate) > 20 ? 'var(--success)' : 'var(--warning)', padding: '3px 10px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}>
                          {a.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
