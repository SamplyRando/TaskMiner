import { apiClient } from "@/api/client";
import type {
  LoginCredentials,
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
