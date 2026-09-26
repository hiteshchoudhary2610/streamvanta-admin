import { supabase } from './supabase';
import type { Profile, Payment, Plan, Referral } from '../types';

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalUsers: number;
  trialUsers: number;
  premiumUsers: number;
  expiredPremium: number;
  pendingPayments: number;
  totalReferrals: number;
}

/// Aggregates counters for the dashboard home.
/// Each query is scoped by RLS so only admins can read beyond their own rows.
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const nowIso = new Date().toISOString();

  const [
    totalUsersRes,
    trialRes,
    premiumRes,
    expiredRes,
    pendingPayRes,
    referralsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('premium_status', 'TRIAL')
      .gt('trial_expires_at', nowIso),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('premium_status', 'PREMIUM')
      .gt('premium_expires_at', nowIso),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('premium_status', 'PREMIUM')
      .lt('premium_expires_at', nowIso),
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING'),
    supabase.from('referrals').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalUsers: totalUsersRes.count ?? 0,
    trialUsers: trialRes.count ?? 0,
    premiumUsers: premiumRes.count ?? 0,
    expiredPremium: expiredRes.count ?? 0,
    pendingPayments: pendingPayRes.count ?? 0,
    totalReferrals: referralsRes.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface UserFilters {
  search?: string;
  status?: 'ALL' | 'TRIAL' | 'PREMIUM' | 'FREE' | 'EXPIRED';
}

/// Lists profiles for the admin users page.
/// Search is applied on email + display_name server-side.
export async function fetchUsers(filters: UserFilters = {}): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`email.ilike.${term},display_name.ilike.${term}`);
  }

  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'TRIAL') {
      query = query
        .eq('premium_status', 'TRIAL')
        .gt('trial_expires_at', new Date().toISOString());
    } else if (filters.status === 'PREMIUM') {
      query = query
        .eq('premium_status', 'PREMIUM')
        .gt('premium_expires_at', new Date().toISOString());
    } else if (filters.status === 'FREE') {
      query = query.eq('premium_status', 'FREE');
    } else if (filters.status === 'EXPIRED') {
      query = query
        .eq('premium_status', 'PREMIUM')
        .lt('premium_expires_at', new Date().toISOString());
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function fetchPendingPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'PENDING')
    .order('submitted_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function fetchAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Payment[];
}

/// Calls the server-side RPC to approve a payment.
/// The function validates admin role, uniqueness of UTR and grants
/// the entitlement atomically.
export async function approvePayment(
  paymentId: string,
  adminId: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_payment', {
    p_payment_id: paymentId,
    p_admin_id: adminId,
    p_note: note ?? null,
  });
  if (error) throw error;
}

export async function rejectPayment(
  paymentId: string,
  adminId: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_reject_payment', {
    p_payment_id: paymentId,
    p_admin_id: adminId,
    p_note: note ?? null,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function fetchAllPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Plan[];
}

export async function updatePlan(
  planId: string,
  patch: Partial<Pick<Plan, 'name' | 'price' | 'duration_days' | 'is_active' | 'sort_order'>>
): Promise<void> {
  const { error } = await supabase.from('plans').update(patch).eq('id', planId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export async function fetchAllReferrals(): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Referral[];
}