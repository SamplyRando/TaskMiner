export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
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
