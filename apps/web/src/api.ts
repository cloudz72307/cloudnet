const API_BASE = "";

function getToken(): string | null {
  return localStorage.getItem("cloudnet_token");
}

function setToken(token: string | null) {
  if (token) localStorage.setItem("cloudnet_token", token);
  else localStorage.removeItem("cloudnet_token");
}

async function request(path: string, options: RequestInit = {}) {
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
  setToken,
  async register(username: string, password: string) {
    const data = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    api.setToken(data.token);
    return data.user;
  },
  async login(username: string, password: string) {
    const data = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    api.setToken(data.token);
    return data.user;
  },
  async me() {
    return request("/auth/me");
  },
  async getFriends() {
    return request("/friends");
  },
  async getChats() {
    return request("/chats");
  },
  async getMessages(chatId: string) {
    return request(`/chats/${chatId}/messages`);
  },
  async sendMessage(chatId: string, content: string) {
    return request(`/chats/${chatId}/send`, {
      method: "POST",
      body: JSON.stringify({ content })
    });
  },
  async openDM(username: string) {
    return request("/dms/open", {
      method: "POST",
      body: JSON.stringify({ username })
    });
  },
  async createGC(name: string, memberUsernames: string[]) {
    return request("/gcs/create", {
      method: "POST",
      body: JSON.stringify({ name, memberUsernames })
    });
  }
};
