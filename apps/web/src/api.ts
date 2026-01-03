import { Chat, Message, User, Friend, AuthResponse } from "./types";

const API_BASE = ""; // same origin (Render serves API + web)

function getToken(): string | null {
  return localStorage.getItem("cloudnet_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("cloudnet_token", token);
  else localStorage.removeItem("cloudnet_token");
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any)
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers
  });

  if (!res.ok) {
    let err: any;
    try {
      err = await res.json();
    } catch {
      err = { error: "unknown_error" };
    }
    throw err;
  }

  return res.json();
}

export const api = {
  async register(username: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  },

  async me(): Promise<{ user: User }> {
    return request<{ user: User }>("/auth/me");
  },

  async getFriends(): Promise<{ friends: Friend[] }> {
    return request<{ friends: Friend[] }>("/friends");
  },

  async addFriend(username: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/friends/add", {
      method: "POST",
      body: JSON.stringify({ username })
    });
  },

  async getChats(): Promise<{ chats: Chat[] }> {
    return request<{ chats: Chat[] }>("/chats");
  },

  async getMessages(chatId: string): Promise<{ messages: Message[] }> {
    return request<{ messages: Message[] }>(`/chats/${chatId}/messages`);
  },

  async sendMessage(
    chatId: string,
    content: string
  ): Promise<{ message: Message }> {
    return request<{ message: Message }>(`/chats/${chatId}/send`, {
      method: "POST",
      body: JSON.stringify({ content })
    });
  },

  async openDM(username: string): Promise<{ chat: Chat }> {
    return request<{ chat: Chat }>("/dms/open", {
      method: "POST",
      body: JSON.stringify({ username })
    });
  },

  async createGC(
    name: string,
    memberUsernames: string[]
  ): Promise<{ chat: Chat }> {
    return request<{ chat: Chat }>("/gcs/create", {
      method: "POST",
      body: JSON.stringify({ name, members: memberUsernames })
    });
  }
};
