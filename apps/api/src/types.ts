export type UserID = string;
export type ChatID = string;

export interface User {
  id: UserID;
  username: string;
  password: string; // plain text for now (prototype only)
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: UserID;
  toUserId: UserID;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: ChatID;
  senderId: UserID;
  content: string;
  createdAt: string;
}

export interface ChatBase {
  id: ChatID;
  name: string;
  createdAt: string;
}

export interface ChannelChat extends ChatBase {
  type: "channel"; // e.g. #general
}

export interface DMChat extends ChatBase {
  type: "dm";
  userIds: [UserID, UserID];
}

export interface GroupChat extends ChatBase {
  type: "gc";
  memberIds: UserID[];
}

export type Chat = ChannelChat | DMChat | GroupChat;
