import { apiClient } from "@/api/client";
import type {
  AccountActionResponse,
  LoginCredentials,
  PasswordResetData,
  RegisterData,
  TokenResponse,
  UserProfile,
} from "@/types/auth";

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
