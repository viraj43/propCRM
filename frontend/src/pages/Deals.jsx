import { useEffect, useState } from 'react';
import { Plus, ChevronRight, Home, User, BadgeDollarSign } from 'lucide-react';
import api from '../services/api';
import DealModal from '../components/DealModal';

const STAGES = ['INQUIRY', 'NEGOTIATION', 'AGREEMENT', 'CLOSED', 'LOST'];

const STAGE_META = {
  INQUIRY: { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  NEGOTIATION: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  AGREEMENT: { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  CLOSED: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
  LOST: { color: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.2)' },
};

function fmt(num) {
  if (!num) return '₹0';
  if (num >= 10000000) return '₹' + (num / 10000000).toFixed(1) + ' Cr';
  if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + ' L';
  return '₹' + num.toLocaleString('en-IN');
}

/* Compact stage-move button */
function MoveBtn({ label, color, border, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
        padding: '3px 8px', borderRadius: 5,
        background: 'transparent',
        color, border: `1px solid ${border}`,
        cursor: 'pointer', transition: 'background 150ms',
        letterSpacing: 0,
        display: 'flex', alignItems: 'center', gap: 3,
        lineHeight: 1.4,
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <ChevronRight size={9} strokeWidth={2.5} />
      {label}
    </button>
  );
}

/* Individual deal card */
function DealCard({ deal, onOpen, onStageChange }) {
  const meta = STAGE_META[deal.stage];

  return (
    <div
      className="kanban-card"
      onClick={() => onOpen(deal)}
    >
      {/* Client name */}
      <div className="kanban-card-title">{deal.client?.name}</div>

      {/* Meta rows */}
      <div className="kanban-card-meta">
        {deal.property?.title && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Home size={11} strokeWidth={1.75} color="var(--text-muted)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deal.property.title.length > 34 ? deal.property.title.slice(0, 34) + '…' : deal.property.title}
            </span>
          </span>
        )}
        {deal.agent?.name && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <User size={11} strokeWidth={1.75} color="var(--text-muted)" />
            {deal.agent.name}
          </span>
        )}
        {deal.commission > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--success)' }}>
            <BadgeDollarSign size={11} strokeWidth={1.75} />
            Commission: {fmt(deal.commission)}
          </span>
        )}
        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {new Date(deal.createdAt).toLocaleDateString('en-IN')}
        </span>
      </div>

      {/* Deal value */}
      <div className="kanban-card-value">{fmt(deal.value)}</div>

      {/* Stage move strip */}
      <div
        style={{
          display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap',
          paddingTop: 10, borderTop: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {STAGES.filter(s => s !== deal.stage).map(s => {
          const sm = STAGE_META[s];
          return (
            <MoveBtn
              key={s}
              label={s}
              color={sm.color}
              border={sm.border}
              onClick={() => onStageChange(deal, s)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* Kanban column */
function KanbanColumn({ stage, deals, onOpen, onStageChange }) {
  const meta = STAGE_META[stage];
  const total = deals.reduce((s, d) => s + d.value, 0);

  return (
    <div className="kanban-col">
      {/* Column header */}
      <div
        className="kanban-col-header"
        style={{ borderBottom: `2px solid ${meta.color}` }}
      >
        <div>
          <div className="kanban-col-title" style={{ color: meta.color }}>{stage}</div>
          {total > 0 && (
            <div style={{
              fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
              fontFamily: 'var(--font-mono)',
            }}>
              {fmt(total)}
            </div>
          )}
        </div>
        <span className="kanban-col-count">{deals.length}</span>
      </div>

      {/* Cards */}
      <div className="kanban-cards">
        {deals.length === 0 ? (
          <div style={{
            padding: '28px 8px', textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 12.5,
            fontStyle: 'italic', lineHeight: 1.5,
          }}>
            No deals in this stage
          </div>
        ) : deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onOpen={onOpen}
            onStageChange={onStageChange}
          />
        ))}
      </div>
    </div>
  );
}

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [clients, setClients] = useState([]);
  const [properties, setProperties] = useState([]);

  const fetchDeals = () => {
    api.get('/deals').then(r => { setDeals(r.data); setLoading(false); });
  };

  useEffect(() => {
    fetchDeals();
    api.get('/clients').then(r => setClients(r.data));
    api.get('/properties').then(r => setProperties(r.data));
  }, []);

  const handleSave = () => { setShowModal(false); setEditDeal(null); fetchDeals(); };

  const handleStageChange = async (deal, newStage) => {
    await api.put(`/deals/${deal.id}`, { stage: newStage });
    fetchDeals();
  };

  const openDeal = (deal) => { setEditDeal(deal); setShowModal(true); };

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage);
    return acc;
  }, {});

  const closedRevenue = deals.filter(d => d.stage === 'CLOSED').reduce((s, d) => s + d.value, 0);

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Deals Pipeline</h2>
          <p className="page-subtitle">
            {deals.length} deal{deals.length !== 1 ? 's' : ''}
            {closedRevenue > 0 && (
              <span style={{ color: 'var(--success)', marginLeft: 6 }}>
                · {fmt(closedRevenue)} closed
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditDeal(null); setShowModal(true); }}>
          <Plus size={15} strokeWidth={2.5} /> New Deal
        </button>
      </div>

      <div className="page-content" style={{ overflowX: 'hidden' }}>
        {loading ? (
          <div className="loading-screen">
            <div className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <div className="kanban-board">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                deals={dealsByStage[stage]}
                onOpen={openDeal}
                onStageChange={handleStageChange}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <DealModal
          deal={editDeal}
          clients={clients}
          properties={properties}
          onClose={() => { setShowModal(false); setEditDeal(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}