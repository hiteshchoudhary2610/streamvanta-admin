import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users as UsersIcon, CreditCard, TrendingUp, Gift } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { requireAdmin } from '../services/auth';
import { fetchDashboardStats } from '../services/admin';
import type { DashboardStats } from '../services/admin';
import type { Profile } from '../types';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await requireAdmin();
        setProfile(p);
        const s = await fetchDashboardStats();
        setStats(s);
      } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : 'Failed to load.';
        if (msg.includes('Not signed in') || msg.includes('Access denied')) {
          navigate('/login', { replace: true });
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="login-spinner" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: UsersIcon,
      color: 'blue',
    },
    {
      label: 'Pending Payments',
      value: stats?.pendingPayments ?? 0,
      icon: CreditCard,
      color: 'amber',
    },
    {
      label: 'Active Premium',
      value: stats?.premiumUsers ?? 0,
      icon: TrendingUp,
      color: 'green',
    },
    {
      label: 'Total Referrals',
      value: stats?.totalReferrals ?? 0,
      icon: Gift,
      color: 'purple',
    },
  ];

  return (
    <AdminLayout
      title={`Welcome, ${profile?.display_name ?? 'Admin'}`}
      subtitle={profile?.email ?? ''}
    >
      {error && <div className="users-error">{error}</div>}

      <div className="dashboard-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`stat-icon ${card.color}`}>
              <card.icon size={20} />
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <h2 className="section-title">Quick summary</h2>
        <p className="section-desc">
          Active trials: {stats?.trialUsers ?? 0} · Expired premium:{' '}
          {stats?.expiredPremium ?? 0}
        </p>
      </div>
    </AdminLayout>
  );
}