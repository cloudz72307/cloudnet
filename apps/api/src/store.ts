import { Chat, ChannelChat, DMChat, GroupChat, Message, User, UserID } from "./types";

function id(prefix = "") {
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const users = new Map<UserID, User>();
const usersByName = new Map<string, User>();
const tokens = new Map<string, UserID>();
const friends = new Map<UserID, Set<UserID>>();
const chats = new Map<string, Chat>();
const messages = new Map<string, Message[]>();

// Seed global channel
const general: ChannelChat = {
  id: "channel:general",
  type: "channel",
  name: "general",
  createdAt: new Date().toISOString()
};
chats.set(general.id, general);
messages.set(general.id, []);

export const store = {
  createUser(username: string, password: string): User {
    if (usersByName.has(username)) throw new Error("username_taken");

    const user: User = {
      id: id("user_"),
      username,
      password,
      createdAt: new Date().toISOString()
    };

    users.set(user.id, user);
    usersByName.set(username, user);
    friends.set(user.id, new Set());

    return user;
  },

  getUserByUsername(username: string) {
    return usersByName.get(username) || null;
  },

  getUserById(id: string) {
    return users.get(id) || null;
  },

  createToken(userId: string) {
    const t = id("token_");
    tokens.set(t, userId);
    return t;
  },

  getUserFromToken(token: string | undefined | null) {
    if (!token) return null;
    const id = tokens.get(token);
    return id ? users.get(id) || null : null;
  },

  addFriend(a: UserID, b: UserID) {
    friends.get(a)?.add(b);
    friends.get(b)?.add(a);
  },

  getFriends(userId: UserID) {
    const set = friends.get(userId);
    if (!set) return [];
    return Array.from(set).map((id) => users.get(id)!);
  },

  getChat(chatId: string) {
    return chats.get(chatId) || null;
  },

  getMessages(chatId: string) {
    return messages.get(chatId) || [];
  },

  addMessage(chatId: string, senderId: string, content: string) {
    const msg: Message = {
      id: id("msg_"),
      chatId,
      senderId,
      content,
      createdAt: new Date().toISOString()
    };

    if (!messages.has(chatId)) messages.set(chatId, []);
    messages.get(chatId)!.push(msg);

    return msg;
  },

  createDM(a: UserID, b: UserID): DMChat {
    const existing = Array.from(chats.values()).find(
      (c) =>
        c.type === "dm" &&
        ((c.userIds[0] === a && c.userIds[1] === b) ||
          (c.userIds[0] === b && c.userIds[1] === a))
    ) as DMChat | undefined;

    if (existing) return existing;

    const dm: DMChat = {
      id: id("dm_"),
      type: "dm",
      userIds: [a, b],
      createdAt: new Date().toISOString()
    };

    chats.set(dm.id, dm);
    messages.set(dm.id, []);

    return dm;
  },

  createGC(name: string, creator: UserID, members: UserID[]): GroupChat {
    const gc: GroupChat = {
      id: id("gc_"),
      type: "gc",
      name,
      memberIds: Array.from(new Set([creator, ...members])),
      createdAt: new Date().toISOString()
    };

    chats.set(gc.id, gc);
    messages.set(gc.id, []);

    return gc;
  },

  listChatsForUser(userId: UserID) {
    return Array.from(chats.values()).filter((c) => {
      if (c.type === "channel") return true;
      if (c.type === "dm") return c.userIds.includes(userId);
      if (c.type === "gc") return c.memberIds.includes(userId);
      return false;
    });
  }
};
