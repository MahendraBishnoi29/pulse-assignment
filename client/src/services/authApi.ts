import api from "./api";
import type { ApiResponse, User } from "../types";

interface AuthResponse {
  user: User;
  token: string;
}

export const registerUser = async (data: {
  email: string;
  password: string;
  name: string;
  role?: string;
}): Promise<ApiResponse<AuthResponse>> => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const loginUser = async (data: {
  email: string;
  password: string;
}): Promise<ApiResponse<AuthResponse>> => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const getMe = async (): Promise<ApiResponse<{ user: User }>> => {
  const res = await api.get("/auth/me");
  return res.data;
};
