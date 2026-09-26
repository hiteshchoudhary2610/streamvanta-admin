import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { requireAdmin, fetchCurrentProfile } from '../services/auth';
import {
  fetchAllPayments,
  approvePayment,
  rejectPayment,
} from '../services/admin';
import type { Payment } from '../types';
import './Payments.css';

/// Payments approval page.
/// Admin verifies each UPI payment in their bank/UPI app before approving.
/// The client calls a server-side RPC — the entitlement is granted there.
export default function Payments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>(
    'PENDING'
  );
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

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllPayments();
      setPayments(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = payments.filter((p) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return p.status === 'PENDING';
    if (filter === 'APPROVED') return p.status === 'APPROVED';
    if (filter === 'REJECTED')
      return p.status === 'REJECTED' || p.status === 'CANCELLED';
    return true;
  });

  const handleApprove = async (payment: Payment) => {
    const confirmed = window.confirm(
      `Approve payment?\n\n` +
        `Amount: ₹${payment.amount}\n` +
        `UTR: ${payment.utr}\n\n` +
        `⚠️ Please verify this UTR in your bank/UPI app first.\n\n` +
        `This will grant the customer their subscription.`
    );
    if (!confirmed) return;

    const note = window.prompt('Optional note (leave empty to skip):') ?? undefined;

    setProcessing(payment.id);
    try {
      const admin = await fetchCurrentProfile();
      if (!admin) throw new Error('Admin profile not found');
      await approvePayment(payment.id, admin.id, note);
      await loadPayments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (payment: Payment) => {
    const reason = window.prompt(
      'Rejection reason (required):\n' +
        'e.g. Invalid UTR, Payment not received, Wrong amount, Duplicate'
    );
    if (!reason || reason.trim().length === 0) {
      alert('Rejection reason is required.');
      return;
    }

    setProcessing(payment.id);
    try {
      const admin = await fetchCurrentProfile();
      if (!admin) throw new Error('Admin profile not found');
      await rejectPayment(payment.id, admin.id, reason);
      await loadPayments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <AdminLayout
      title="Payments"
      subtitle={`${filtered.length} payment(s) — ${filter} filter`}
    >
      <div className="payments-toolbar">
        <div className="payments-filters">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="refresh-btn" onClick={loadPayments} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="payments-warning">
        <AlertCircle size={16} />
        <span>
          Verify each UTR in your bank/UPI app before approving.
          Approving grants the customer their subscription.
        </span>
      </div>

      {error && <div className="users-error">{error}</div>}

      {loading ? (
        <div className="users-loading">
          <div className="login-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="users-empty">
          <Clock size={40} color="#6b7590" />
          <p>No {filter.toLowerCase()} payments.</p>
        </div>
      ) : (
        <div className="payments-list">
          {filtered.map((p) => (
            <PaymentCard
              key={p.id}
              payment={p}
              processing={processing === p.id}
              onApprove={() => handleApprove(p)}
              onReject={() => handleReject(p)}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Payment card
// ---------------------------------------------------------------------------

interface CardProps {
  payment: Payment;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function PaymentCard({ payment, processing, onApprove, onReject }: CardProps) {
  const statusCls = payment.status.toLowerCase().replace('_', '-');

  return (
    <div className="payment-card">
      <div className="payment-header">
        <div className="payment-amount">₹{payment.amount.toFixed(0)}</div>
        <span className={`status-badge ${statusCls}`}>
          {payment.status.replace('_', ' ')}
        </span>
      </div>

      <div className="payment-row">
        <span className="payment-label">User ID</span>
        <span className="payment-value mono">{payment.user_id.slice(0, 8)}…</span>
      </div>

      <div className="payment-row">
        <span className="payment-label">UTR</span>
        <span className="payment-value mono">{payment.utr}</span>
      </div>

      <div className="payment-row">
        <span className="payment-label">Submitted</span>
        <span className="payment-value">
          {new Date(payment.submitted_at).toLocaleString()}
        </span>
      </div>

      {payment.admin_note && (
        <div className="payment-note">
          <strong>Note:</strong> {payment.admin_note}
        </div>
      )}

      {payment.status === 'PENDING' && (
        <div className="payment-actions">
          <button
            className="action-btn approve"
            onClick={onApprove}
            disabled={processing}
          >
            <CheckCircle2 size={16} />
            <span>{processing ? 'Processing…' : 'Approve'}</span>
          </button>
          <button
            className="action-btn reject"
            onClick={onReject}
            disabled={processing}
          >
            <XCircle size={16} />
            <span>Reject</span>
          </button>
        </div>
      )}
    </div>
  );
}