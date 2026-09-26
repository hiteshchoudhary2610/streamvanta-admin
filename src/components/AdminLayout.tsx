import { ReactNode, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Gift,
  LogOut,
  Shield,
} from 'lucide-react';
import { signOut } from '../services/auth';
import './AdminLayout.css';

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/// Shared chrome for every admin page: sidebar nav + top bar.
export default function AdminLayout({ children, title, subtitle }: Props) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/plans', icon: Package, label: 'Plans' },
    { to: '/referrals', icon: Gift, label: 'Referrals' },
  ];

  return (
    <div className="admin-layout">
      {/* ---------- Sidebar ---------- */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-logo">
            <Shield size={20} color="#fff" strokeWidth={2.4} />
          </div>
          <div>
            <div className="admin-brand-name">StreamVanta</div>
            <div className="admin-brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'active' : ''}`
              }
            >
              <link.icon size={18} strokeWidth={2} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="admin-signout" onClick={handleSignOut}>
          <LogOut size={18} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-title">{title}</h1>
            {subtitle && <p className="admin-subtitle">{subtitle}</p>}
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}