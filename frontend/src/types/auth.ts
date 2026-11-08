export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  email_verified_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
  avatar_url?: string | null;
};

export type AuthSession = {
  accessToken: string;
  tokenType: "bearer";
  refreshToken: string | null;
  currentUser: UserProfile;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = LoginCredentials & {
  fullName: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
};

export type GoogleAuthAttempt = {
  attempt_id: string;
  nonce: string;
  expires_at: string;
};

export type GoogleCredentialData = {
  attemptId: string;
  nonce: string;
  credential: string;
};

export type GoogleAuthResponse = TokenResponse & {
  user: UserProfile;
  is_new_user: boolean;
};

export type GoogleLinkStatus = {
  linked: boolean;
};

export type GoogleLinkResponse = GoogleLinkStatus & {
  message: string;
};

export type AccountActionResponse = {
  message: string;
  already_completed: boolean;
};

export type PasswordResetData = {
  token: string;
  newPassword: string;
  confirmation: string;
};
