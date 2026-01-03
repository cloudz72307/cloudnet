export type UserID = string;
export type ChatID = string;

export interface User {
  id: UserID;
  username: string;
  createdAt?: string;
}

export interface Chat {
  id: ChatID;
  type: "channel" | "dm" | "gc";
  name?: string;
  createdAt?: string;
  // backend might also return dm/gc specific fields, we ignore extras
}

export interface Message {
  id: string;
  chatId: ChatID;
  senderId: UserID;
  content: string;
  createdAt: string;
}

export interface Friend extends User {}

export interface AuthResponse {
  user: User;
  token: string;
}
