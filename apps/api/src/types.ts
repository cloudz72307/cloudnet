export type UserID = string;
export type ChatID = string;

export interface User {
  id: UserID;
  username: string;
  password: string;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: ChatID;
  senderId: UserID;
  content: string;
  createdAt: string;
}

export interface ChannelChat {
  id: ChatID;
  type: "channel";
  name: string;
  createdAt: string;
}

export interface DMChat {
  id: ChatID;
  type: "dm";
  userIds: [UserID, UserID];
  createdAt: string;
}

export interface GroupChat {
  id: ChatID;
  type: "gc";
  name: string;
  memberIds: UserID[];
  createdAt: string;
}

export type Chat = ChannelChat | DMChat | GroupChat;
