export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  referralCode: string;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  rank?: string;
  level?: number;
}

export interface LoginRequest {
  /** Username or email. */
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  referralCode?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
