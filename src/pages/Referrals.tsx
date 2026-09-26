import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, User, TrendingUp, Search } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { requireAdmin } from '../services/auth';
import { fetchAllReferrals } from '../services/admin';
import type { Referral } from '../types';
import './Referrals.css';

type Filter = 'ALL' | 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED';

/// Admin referrals view.
/// Shows the referral graph and allows filtering by status.
export default function Referrals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await requireAdmin();
      } catch {
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await fetchAllReferrals();
        setReferrals(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load referrals.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = referrals.filter((r) => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      if (
        !r.referral_code.toLowerCase().includes(term) &&
        !r.referrer_user_id.toLowerCase().includes(term) &&
        !r.referred_user_id.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  const stats = {
    total: referrals.length,
    rewarded: referrals.filter((r) => r.status === 'REWARDED').length,
    pending: referrals.filter((r) => r.status === 'PENDING').length,
    qualified: referrals.filter((r) => r.status === 'QUALIFIED').length,
  };

  return (
    <AdminLayout
      title="Referrals"
      subtitle={`${filtered.length} of ${referrals.length} referral(s)`}
    >
      <div className="referral-stats">
        <StatCard label="Total" value={stats.total} color="blue" />
        <StatCard label="Rewarded" value={stats.rewarded} color="green" />
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="Qualified" value={stats.qualified} color="purple" />
      </div>

      <div className="referrals-toolbar">
        <div className="users-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by code, referrer or referred user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="users-filters">
          {(['ALL', 'PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED'] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`filter-pill ${filter === f ? 'active' : ''}`}
              >
                {f}
              </button>
            )
          )}
        </div>
      </div>

      {error && <div className="users-error">{error}</div>}

      {loading ? (
        <div className="users-loading">
          <div className="login-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="users-empty">
          <Gift size={40} color="#6b7590" />
          <p>No referrals found.</p>
        </div>
      ) : (
        <div className="referrals-table">
          <div className="referrals-row referrals-header">
            <div>Code</div>
            <div>Referrer</div>
            <div>Referred</div>
            <div>Status</div>
            <div>Created</div>
          </div>
          {filtered.map((r) => (
            <div key={r.id} className="referrals-row">
              <div className="referral-code">{r.referral_code}</div>
              <div className="referral-user mono">
                {r.referrer_user_id.slice(0, 8)}…
              </div>
              <div className="referral-user mono">
                {r.referred_user_id.slice(0, 8)}…
              </div>
              <div>
                <StatusBadge status={r.status} />
              </div>
              <div className="referral-date">
                {new Date(r.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'amber' | 'purple';
}) {
  const icons: Record<string, typeof Gift> = {
    blue: User,
    green: TrendingUp,
    amber: Gift,
    purple: TrendingUp,
  };
  const Icon = icons[color] ?? Gift;

  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={20} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Referral['status'] }) {
  const cls = status.toLowerCase();
  return <span className={`status-badge ${cls}`}>{status}</span>;
}