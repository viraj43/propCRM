import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, Building2, UserCheck,
  Handshake, UserCog, LogOut, CheckSquare, BarChart2,
  Menu, X as XIcon, MessageSquare, ChevronRight
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Leads', to: '/leads', icon: Users },
  { label: 'Properties', to: '/properties', icon: Building2 },
  { label: 'Clients', to: '/clients', icon: UserCheck },
  { label: 'Deals', to: '/deals', icon: Handshake },
  { label: 'Tasks', to: '/tasks', icon: CheckSquare },
  { label: 'Team Chat', to: '/chat', icon: MessageSquare },
  { label: 'Reports', to: '/reports', icon: BarChart2 },
];

const adminItems = [
  { label: 'Agents', to: '/agents', icon: UserCog },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="app-layout">

      {/* ── Mobile hamburger ── */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen(o => !o)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <XIcon size={18} /> : <Menu size={18} />}
      </button>

      {/* ── Backdrop ── */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={closeMobile}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <h1>
            Prop<span>CRM</span>
          </h1>
          <p>Real Estate Manager</p>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>

          {navItems.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeMobile}
              className={({ isActive }) =>
                `nav-item${isActive ? ' active' : ''}`
              }
            >
              <Icon className="nav-icon" size={16} strokeWidth={1.75} />
              <span style={{ flex: 1 }}>{label}</span>
            </NavLink>
          ))}

          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <>
              <div className="nav-section-label" style={{ marginTop: 12 }}>
                Management
              </div>
              {adminItems.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <Icon className="nav-icon" size={16} strokeWidth={1.75} />
                  <span style={{ flex: 1 }}>{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer / user block */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role?.toLowerCase()}</div>
            </div>
            <button
              className="btn-icon tooltip"
              data-tooltip="Sign out"
              onClick={handleLogout}
              aria-label="Sign out"
              style={{ marginLeft: 'auto', flexShrink: 0 }}
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}