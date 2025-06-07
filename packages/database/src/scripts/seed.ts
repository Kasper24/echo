import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import * as schema from "../schema";
import { db } from "..";

const dbSeed = async () => {
  faker.seed(2000);

  const NUM_USERS = 50;
  const NUM_CHATS = 200;
  const MAX_MESSAGES_PER_CHAT = 50;
  const FRIENDSHIP_DENSITY = 0.1;
  const BLOCK_DENSITY = 0.02;
  const NUM_CALLS = 20;

  const insertedUsers = await generateUsers(NUM_USERS);
  await generatePrivacySettings(insertedUsers);
  await generateFriendships(insertedUsers, FRIENDSHIP_DENSITY);
  await generateBlockedUsers(insertedUsers, BLOCK_DENSITY);

  const insertedChats = await generateChats(NUM_CHATS);
  await addChatParticipants(insertedUsers, insertedChats);
  const insertedMessages = await generateMessages(
    insertedChats,
    MAX_MESSAGES_PER_CHAT
  );

  await generateAttachments(insertedMessages);
  await generateReadReceipts(insertedMessages);
  await generateCallHistory(insertedUsers, NUM_CALLS);
};

const generateUsers = async (count: number) => {
  console.log("Generating users...");
  const users = Array.from({ length: count }, () => ({
    phoneNumber: faker.string.numeric({ length: 10 }),
    name: faker.person.fullName(),
    picture: faker.image.avatar(),
    description: faker.lorem.sentence(),
    status: faker.datatype.boolean(),
    lastSeen: faker.date.recent(),
  }));

  const inserted = await db.insert(schema.users).values(users).returning();
  console.log(`Inserted ${inserted.length} users`);
  return inserted;
};

const generatePrivacySettings = async (users: schema.User[]) => {
  console.log("Generating privacy settings...");
  const settings = users.map((user) => ({
    userId: user.id,
    showOnlineStatus: faker.datatype.boolean(0.8),
    showLastSeen: faker.datatype.boolean(0.7),
    showReadReceipts: faker.datatype.boolean(0.6),
  }));

  await db.insert(schema.userPrivacySettings).values(settings);
  console.log(`Created privacy settings for ${users.length} users`);
};

const generateFriendships = async (users: schema.User[], density: number) => {
  console.log("Generating friendships...");
  const friendships = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      if (Math.random() < density) {
        const status = faker.helpers.arrayElement([
          "pending",
          "accepted",
          "denied",
        ]) as (typeof schema.friendStatusEnum.enumValues)[number];

        friendships.push({
          userA: users[i].id,
          userB: users[j].id,
          status,
        });
      }
    }
  }

  await db.insert(schema.friends).values(friendships);
  console.log(`Created ${friendships.length} friendships`);
};

const generateBlockedUsers = async (users: schema.User[], density: number) => {
  console.log("Generating blocked users...");
  const blocks = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < users.length; j++) {
      if (i !== j && Math.random() < density) {
        blocks.push({
          blockerId: users[i].id,
          blockedId: users[j].id,
        });
      }
    }
  }

  await db.insert(schema.blockedUsers).values(blocks);
  console.log(`Created ${blocks.length} blocked relationships`);
};

const generateChats = async (count: number) => {
  console.log("Generating chats...");
  const chats = [];

  for (let i = 0; i < count * 0.7; i++) {
    chats.push({
      type: "direct",
      name: "Direct Chat",
      description: "",
      picture: faker.image.url(),
    });
  }

  for (let i = 0; i < count * 0.3; i++) {
    chats.push({
      type: "group",
      name: faker.word.adjective() + " " + faker.word.noun() + " Group",
      description: faker.lorem.sentence(),
      picture: faker.image.url(),
    });
  }

  const inserted = await db.insert(schema.chats).values(chats).returning();
  console.log(`Created ${inserted.length} chats`);
  return inserted;
};

const addChatParticipants = async (
  users: schema.User[],
  chats: schema.Chat[]
) => {
  console.log("Adding chat participants...");
  const participants = [];

  for (const chat of chats) {
    if (chat.type === "direct") {
      const selected = faker.helpers.arrayElements(users, 2);
      for (const user of selected) {
        participants.push({
          userId: user.id,
          chatId: chat.id,
          role: "user",
          createdAt: faker.date.recent(),
        });
      }
    } else {
      const num = faker.number.int({ min: 3, max: 10 });
      const selected = faker.helpers.arrayElements(users, num);
      selected.forEach((user, i) =>
        participants.push({
          userId: user.id,
          chatId: chat.id,
          role: i === 0 ? "admin" : "user",
          createdAt: faker.date.recent({ days: 30 }),
        })
      );
    }
  }

  await db.insert(schema.chatParticipants).values(participants);
  console.log(`Added ${participants.length} chat participants`);
};

const generateMessages = async (chats: schema.Chat[], maxPerChat: number) => {
  console.log("Generating messages...");
  const messages = [];

  for (const chat of chats) {
    const participants = await db
      .select()
      .from(schema.chatParticipants)
      .where(() => sql`${schema.chatParticipants.chatId} = ${chat.id}`);

    if (!participants.length) continue;

    let current = faker.date.past({ years: 0.5 });
    const count = faker.number.int({ min: 1, max: maxPerChat });

    for (let i = 0; i < count; i++) {
      current = new Date(
        current.getTime() + faker.number.int({ min: 60_000, max: 86_400_000 })
      );

      const sender = faker.helpers.arrayElement(participants);
      messages.push({
        chatId: chat.id,
        senderId: sender.userId,
        content: faker.lorem.paragraph(),
        createdAt: current,
      });
    }
  }

  const inserted = await db
    .insert(schema.messages)
    .values(messages)
    .returning();
  console.log(`Created ${inserted.length} messages`);
  return inserted;
};

const generateAttachments = async (messages: schema.Message[]) => {
  console.log("Generating message attachments...");
  const attachments = [];
  const types = ["image", "video", "audio", "file"];

  for (const msg of messages) {
    if (Math.random() < 0.3) {
      const count = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < count; i++) {
        const type = faker.helpers.arrayElement(types);
        const name = randomFileName(type === "file" ? "pdf" : type);
        const url = faker.internet.url() + `/${name}`;

        attachments.push({
          messageId: msg.id,
          type,
          url,
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  // Uncomment if needed
  // await db.insert(schema.messageAttachments).values(attachments);
  console.log(`Generated ${attachments.length} attachments`);
};

const generateReadReceipts = async (messages: schema.Message[]) => {
  console.log("Generating message read receipts...");
  const receipts = [];

  for (const msg of messages) {
    const participants = await db
      .select()
      .from(schema.chatParticipants)
      .where(
        () =>
          sql`${schema.chatParticipants.chatId} = ${msg.chatId} AND ${schema.chatParticipants.userId} != ${msg.senderId}`
      );

    for (const p of participants) {
      const received = faker.datatype.boolean();
      const receivedAt = received
        ? faker.date.between({
            from: msg.createdAt,
            to: new Date(msg.createdAt.getTime() + 86_400_000),
          })
        : null;

      const read = received && faker.datatype.boolean();
      const readAt = read
        ? faker.date.between({
            from: receivedAt!,
            to: new Date(receivedAt!.getTime() + 86_400_000),
          })
        : null;

      receipts.push({
        chatId: msg.chatId,
        messageId: msg.id,
        userId: p.userId,
        receivedAt,
        readAt,
      });
    }
  }

  await db.insert(schema.messageReadReceipts).values(receipts);
  console.log(`Created ${receipts.length} read receipts`);
};

const generateCallHistory = async (users: schema.User[], numCalls: number) => {
  console.log("Generating call history...");

  const calls: (typeof schema.calls.$inferInsert)[] = [];
  const callParticipants: (typeof schema.callParticipants.$inferInsert)[] = [];

  for (let i = 0; i < numCalls; i++) {
    const createdBy = faker.helpers.arrayElement(users);
    const duration = faker.number.int({ min: 30, max: 3600 }); // seconds
    const startedAt = Math.floor(
      faker.date.recent({ days: 30 }).getTime() / 1000
    );
    const endedAt = startedAt + duration;

    calls.push({
      startedAt,
      endedAt,
      createdBy: createdBy.id,
      createdAt: new Date(startedAt * 1000),
      updatedAt: new Date(startedAt * 1000),
    });
  }

  const insertedCalls = await db.insert(schema.calls).values(calls).returning();

  for (const call of insertedCalls) {
    const participantCount = faker.number.int({ min: 2, max: 4 });
    const participants = faker.helpers.arrayElements(users, participantCount);

    for (let i = 0; i < participants.length; i++) {
      const user = participants[i];
      const isInitiator = user.id === call.createdBy;
      const joined = faker.datatype.boolean({ probability: 0.8 }); // 80% chance joined
      const joinOffset = faker.number.int({ min: 0, max: 30 });
      const leaveOffset = faker.number.int({ min: 10, max: 3600 });

      const joinedAt = joined ? call.startedAt + joinOffset : null;
      const leftAt = joined ? joinedAt! + leaveOffset : null;

      callParticipants.push({
        callId: call.id,
        userId: user.id,
        status: joined
          ? "answered"
          : faker.helpers.arrayElement(["ringing", "declined", "missed"]),
        joinedAt,
        leftAt,
        isInitator: isInitiator,
        isMuted: faker.datatype.boolean(),
        isVideoEnabled: faker.datatype.boolean(),
        isScreenSharing: faker.datatype.boolean({ probability: 0.1 }), // 10% screen sharing
        createdAt: new Date(call.startedAt * 1000),
        updatedAt: new Date(call.startedAt * 1000),
      });
    }
  }

  await db.insert(schema.callParticipants).values(callParticipants);

  console.log(
    `Created ${insertedCalls.length} calls with ${callParticipants.length} participants`
  );
};

const randomFileName = (ext: string) =>
  `${faker.string.alphanumeric(12)}.${ext}`;

export { dbSeed };
