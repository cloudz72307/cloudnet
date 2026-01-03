import { Chat, DMChat, GroupChat, Message, User, UserID, ChannelChat } from "./types";

const users = new Map<UserID, User>();
const usersByUsername = new Map<string, User>();
const friendMap = new Map<UserID, Set<UserID>>();
const friendRequests: { [id: string]: { id: string; fromUserId: UserID; toUserId: UserID } } = {};
const chats = new Map<string, Chat>();
const messages = new Map<string, Message[]>();
const authTokens = new Map<string, UserID>();

function createId(prefix: string = "") {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Seed single global channel #general
const generalChannel: ChannelChat = {
  id: "channel:general",
  type: "channel",
  name: "#general",
  createdAt: new Date().toISOString()
};
chats.set(generalChannel.id, generalChannel);
messages.set(generalChannel.id, []);

export const store = {
  createUser(username: string, password: string): User {
    if (usersByUsername.has(username)) throw new Error("Username already taken");
    const user: User = {
      id: createId("user_"),
      username,
      password,
      createdAt: new Date().toISOString()
    };
    users.set(user.id, user);
    usersByUsername.set(user.username, user);
    friendMap.set(user.id, new Set());
    return user;
  },

  getUserByUsername(username: string) {
    return usersByUsername.get(username) || null;
  },

  getUserById(id: UserID) {
    return users.get(id) || null;
  },

  createTokenForUser(userId: UserID): string {
    const token = createId("token_");
    authTokens.set(token, userId);
    return token;
  },

  getUserIdFromToken(token: string | undefined | null): UserID | null {
    if (!token) return null;
    return authTokens.get(token) || null;
  },

  getFriends(userId: UserID): User[] {
    const set = friendMap.get(userId);
    if (!set) return [];
    return Array.from(set).map(id => users.get(id)!).filter(Boolean);
  },

  addFriendship(a: UserID, b: UserID) {
    if (!friendMap.has(a)) friendMap.set(a, new Set());
    if (!friendMap.has(b)) friendMap.set(b, new Set());
    friendMap.get(a)!.add(b);
    friendMap.get(b)!.add(a);
  },

  getChat(chatId: string): Chat | null {
    return chats.get(chatId) || null;
  },

  getMessages(chatId: string): Message[] {
    return messages.get(chatId) || [];
  },

  addMessage(chatId: string, senderId: UserID, content: string): Message {
    const msg: Message = {
      id: createId("msg_"),
      chatId,
      senderId,
      content,
      createdAt: new Date().toISOString()
    };
    if (!messages.has(chatId)) messages.set(chatId, []);
    messages.get(chatId)!.push(msg);
    return msg;
  },

  createDM(userA: UserID, userB: UserID): DMChat {
    const existing = Array.from(chats.values()).find(
      c =>
        c.type === "dm" &&
        ((c.userIds[0] === userA && c.userIds[1] === userB) ||
          (c.userIds[0] === userB && c.userIds[1] === userA))
    ) as DMChat | undefined;
    if (existing) return existing;

    const dm: DMChat = {
      id: createId("dm_"),
      type: "dm",
      name: "DM",
      userIds: [userA, userB],
      createdAt: new Date().toISOString()
    };
    chats.set(dm.id, dm);
    messages.set(dm.id, []);
    return dm;
  },

  createGC(name: string, creatorId: UserID, memberIds: UserID[]): GroupChat {
    const gc: GroupChat = {
      id: createId("gc_"),
      type: "gc",
      name,
      memberIds: Array.from(new Set([creatorId, ...memberIds])),
      createdAt: new Date().toISOString()
    };
    chats.set(gc.id, gc);
    messages.set(gc.id, []);
    return gc;
  },

  listUserChats(userId: UserID): Chat[] {
    return Array.from(chats.values()).filter(c => {
      if (c.type === "channel") return true;
      if (c.type === "dm") return c.userIds.includes(userId);
      if (c.type === "gc") return c.memberIds.includes(userId);
      return false;
    });
  },

  getGeneralChannel(): ChannelChat {
    return generalChannel;
  }
};
