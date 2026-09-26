import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Package, AlertCircle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { requireAdmin } from '../services/auth';
import { fetchAllPlans, updatePlan } from '../services/admin';
import './Plans.css';

interface EditablePlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
  dirty: boolean;
  saving: boolean;
}

/// Plans editor.
/// Admins can change name, price, duration and active state.
/// Historical purchases are unaffected by price changes.
export default function Plans() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<EditablePlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        const list = await fetchAllPlans();
        setPlans(
          list.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            duration_days: p.duration_days,
            is_active: p.is_active,
            sort_order: p.sort_order,
            dirty: false,
            saving: false,
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateField = (id: string, patch: Partial<EditablePlan>) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, dirty: true } : p))
    );
  };

  const savePlan = async (plan: EditablePlan) => {
    if (plan.price < 0) {
      alert('Price cannot be negative.');
      return;
    }
    if (plan.duration_days <= 0) {
      alert('Duration must be greater than 0.');
      return;
    }

    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, saving: true } : p))
    );

    try {
      await updatePlan(plan.id, {
        name: plan.name,
        price: plan.price,
        duration_days: plan.duration_days,
        is_active: plan.is_active,
        sort_order: plan.sort_order,
      });
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, dirty: false, saving: false } : p
        )
      );
      setSuccessMsg(`"${plan.name}" saved.`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed.');
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, saving: false } : p))
      );
    }
  };

  return (
    <AdminLayout
      title="Plans"
      subtitle="Edit prices and durations. Existing subscriptions are not affected."
    >
      <div className="payments-warning">
        <AlertCircle size={16} />
        <span>
          Changing a price only affects <strong>new</strong> purchases. Existing
          users keep their current entitlement until expiry.
        </span>
      </div>

      {successMsg && <div className="plans-success">{successMsg}</div>}
      {error && <div className="users-error">{error}</div>}

      {loading ? (
        <div className="users-loading">
          <div className="login-spinner" />
        </div>
      ) : (
        <div className="plans-list">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-card">
              <div className="plan-header">
                <div className="plan-header-left">
                  <Package size={18} color="#3b82f6" />
                  <span className="plan-id">ID: {plan.id.slice(0, 8)}…</span>
                </div>
                <label className="plan-toggle">
                  <input
                    type="checkbox"
                    checked={plan.is_active}
                    onChange={(e) =>
                      updateField(plan.id, { is_active: e.target.checked })
                    }
                  />
                  <span>{plan.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </label>
              </div>

              <div className="plan-grid">
                <div className="plan-field">
                  <label>Name</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) =>
                      updateField(plan.id, { name: e.target.value })
                    }
                  />
                </div>

                <div className="plan-field">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={plan.price}
                    onChange={(e) =>
                      updateField(plan.id, {
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="plan-field">
                  <label>Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={plan.duration_days}
                    onChange={(e) =>
                      updateField(plan.id, {
                        duration_days: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>

                <div className="plan-field">
                  <label>Sort order</label>
                  <input
                    type="number"
                    value={plan.sort_order}
                    onChange={(e) =>
                      updateField(plan.id, {
                        sort_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="plan-actions">
                <button
                  className="save-btn"
                  disabled={!plan.dirty || plan.saving}
                  onClick={() => savePlan(plan)}
                >
                  <Save size={16} />
                  <span>{plan.saving ? 'Saving…' : 'Save changes'}</span>
                </button>
                {plan.dirty && <span className="dirty-hint">Unsaved changes</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}