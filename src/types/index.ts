export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'USER' | 'ADMIN';
  trial_started_at: string;
  trial_expires_at: string;
  premium_status: 'FREE' | 'TRIAL' | 'PREMIUM' | 'EXPIRED';
  premium_plan_id: string | null;
  premium_started_at: string | null;
  premium_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  features_json: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  utr: string;
  screenshot_url: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'INVALID_AMOUNT';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REJECTED';
  created_at: string;
  qualified_at: string | null;
  reward_granted_at: string | null;
}