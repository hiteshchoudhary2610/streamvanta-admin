import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCircle2 } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { requireAdmin } from '../services/auth';
import { fetchUsers } from '../services/admin';
import type { UserFilters } from '../services/admin';
import type { Profile } from '../types';
import './Users.css';

/// Users list with search + status filters.
export default function Users() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserFilters['status']>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Guard: only admins may view this page.
  useEffect(() => {
    (async () => {
      try {
        await requireAdmin();
      } catch {
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate]);

  // Load users whenever the filters change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchUsers({ search, status });
        if (!cancelled) setUsers(list);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load users.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, status]);

  return (
    <AdminLayout title="Users" subtitle={`${users.length} result(s)`}>
      <div className="users-toolbar">
        <div className="users-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="users-filters">
          {(['ALL', 'TRIAL', 'PREMIUM', 'FREE', 'EXPIRED'] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`filter-pill ${status === s ? 'active' : ''}`}
              >
                {s}
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
      ) : users.length === 0 ? (
        <div className="users-empty">
          <UserCircle2 size={40} color="#6b7590" />
          <p>No users found.</p>
        </div>
      ) : (
        <div className="users-table">
          <div className="users-row users-header">
            <div>User</div>
            <div>Status</div>
            <div>Expiry</div>
            <div>Joined</div>
          </div>
          {users.map((u) => (
            <div key={u.id} className="users-row">
              <div className="users-cell-user">
                <div className="users-avatar">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" />
                  ) : (
                    <UserCircle2 size={20} color="#aab3c5" />
                  )}
                </div>
                <div>
                  <div className="users-name">
                    {u.display_name ?? 'Creator'}
                  </div>
                  <div className="users-email">{u.email}</div>
                </div>
              </div>
              <div>
                <StatusBadge profile={u} />
              </div>
              <div className="users-expiry">{expiryLabel(u)}</div>
              <div className="users-date">{formatDate(u.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ profile }: { profile: Profile }) {
  const now = new Date();
  const premiumActive =
    profile.premium_status === 'PREMIUM' &&
    profile.premium_expires_at &&
    new Date(profile.premium_expires_at) > now;
  const trialActive =
    profile.premium_status === 'TRIAL' &&
    new Date(profile.trial_expires_at) > now;

  let label = 'FREE';
  let cls = 'free';
  if (premiumActive) {
    label = 'PREMIUM';
    cls = 'premium';
  } else if (trialActive) {
    label = 'TRIAL';
    cls = 'trial';
  } else if (profile.premium_status === 'PREMIUM') {
    label = 'EXPIRED';
    cls = 'expired';
  }

  return <span className={`status-badge ${cls}`}>{label}</span>;
}

function expiryLabel(profile: Profile): string {
  if (profile.premium_status === 'PREMIUM' && profile.premium_expires_at) {
    return formatDate(profile.premium_expires_at);
  }
  if (profile.premium_status === 'TRIAL' && profile.trial_expires_at) {
    return formatDate(profile.trial_expires_at);
  }
  return '—';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}