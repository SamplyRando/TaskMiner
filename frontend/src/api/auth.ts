import { apiClient } from "@/api/client";
import type {
  AccountActionResponse,
  GoogleAuthAttempt,
  GoogleAuthResponse,
  GoogleCredentialData,
  GoogleLinkResponse,
  GoogleLinkStatus,
  LoginCredentials,
  PasswordResetData,
  RegisterData,
  TokenResponse,
  UserProfile,
} from "@/types/auth";

const googleCredentialPayload = (data: GoogleCredentialData) => ({
  attempt_id: data.attemptId,
  nonce: data.nonce,
  credential: data.credential,
});

export const registerUser = async (
  data: RegisterData,
): Promise<UserProfile> => {
  const response = await apiClient.post<UserProfile>("/auth/register", {
    email: data.email,
    full_name: data.fullName,
    password: data.password,
  });

  return response.data;
};

export const loginUser = async (
  credentials: LoginCredentials,
): Promise<TokenResponse> => {
  const response = await apiClient.post<TokenResponse>(
    "/auth/login",
    credentials,
  );

  return response.data;
};

export const createGoogleAuthAttempt = async (): Promise<GoogleAuthAttempt> => {
  const response = await apiClient.post<GoogleAuthAttempt>(
    "/auth/google/attempt",
  );
  return response.data;
};

export const authenticateWithGoogle = async (
  data: GoogleCredentialData,
): Promise<GoogleAuthResponse> => {
  const response = await apiClient.post<GoogleAuthResponse>(
    "/auth/google",
    googleCredentialPayload(data),
  );
  return response.data;
};

export const getGoogleLinkStatus = async (): Promise<GoogleLinkStatus> => {
  const response = await apiClient.get<GoogleLinkStatus>("/auth/google/link");
  return response.data;
};

export const createGoogleLinkAttempt = async (): Promise<GoogleAuthAttempt> => {
  const response = await apiClient.post<GoogleAuthAttempt>(
    "/auth/google/link/attempt",
  );
  return response.data;
};

export const linkGoogleAccount = async (
  data: GoogleCredentialData,
): Promise<GoogleLinkResponse> => {
  const response = await apiClient.post<GoogleLinkResponse>(
    "/auth/google/link",
    googleCredentialPayload(data),
  );
  return response.data;
};

export const requestPasswordReset = async (
  email: string,
): Promise<AccountActionResponse> => {
  const response = await apiClient.post<AccountActionResponse>(
    "/auth/password-reset/request",
    { email },
  );

  return response.data;
};

export const confirmPasswordReset = async (
  data: PasswordResetData,
): Promise<AccountActionResponse> => {
  const response = await apiClient.post<AccountActionResponse>(
    "/auth/password-reset/confirm",
    {
      token: data.token,
      new_password: data.newPassword,
      confirmation: data.confirmation,
    },
  );

  return response.data;
};

export const requestEmailVerification = async (
  email: string,
): Promise<AccountActionResponse> => {
  const response = await apiClient.post<AccountActionResponse>(
    "/auth/email-verification/request",
    { email },
  );

  return response.data;
};

export const confirmEmailVerification = async (
  token: string,
): Promise<AccountActionResponse> => {
  const response = await apiClient.post<AccountActionResponse>(
    "/auth/email-verification/confirm",
    { token },
  );

  return response.data;
};
