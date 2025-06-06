import { execSync } from "node:child_process";
import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/node-postgres";
import { reset } from "drizzle-seed";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const db = drizzle({
  schema: schema,
  connection: {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT!),
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: process.env.NODE_ENV === "production" ? true : false,
  },
});

type DbType = typeof db;

const dbWaitForConnection = async (maxRetries = 5, delayMs = 2000) => {
  let retries = 0;

  while (true) {
    try {
      const result = await db.execute("SELECT NOW()");
      console.log("✅ PostgreSQL connected:", result.rows[0].now);
      return;
    } catch (err) {
      retries++;
      console.error(
        `❌ PostgreSQL connection error (attempt ${retries}):`,
        err
      );

      if (retries >= maxRetries) {
        console.error("❌ Max retries reached. Exiting...");
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const dbPush = async (dbToPush?: DbType) => {
  dbToPush ??= db;
  execSync("npm run db:push -w @repo/database", {
    env: process.env,
    stdio: "inherit",
  });
};

const dbReset = async (dbToReset?: DbType) => {
  dbToReset ??= db;
  await reset(dbToReset, schema);
};

const randomFileName = (ext: string) => {
  return `${faker.system.fileName().split(".")[0]}.${ext}`;
};

const dbSeed = async (dbToSeed?: DbType) => {
  dbToSeed ??= db;

  const NUM_USERS = 50;
  const NUM_CHATS = 200;
  const MAX_MESSAGES_PER_CHAT = 50;
  const FRIENDSHIP_DENSITY = 0.1; // 10% chance of friendship between any two users
  const BLOCK_DENSITY = 0.02; // 2% chance of blocking

  try {
    faker.seed(2000);

    // 1. Generate Users
    console.log("Generating users...");
    const userRecords = [];

    for (let i = 0; i < NUM_USERS; i++) {
      const user = {
        phoneNumber: faker.string.numeric({ length: 10 }),
        name: faker.person.fullName(),
        picture: faker.image.avatar(),
        description: faker.lorem.sentence(),
        status: faker.datatype.boolean(),
        lastSeen: faker.date.recent(),
      };
      userRecords.push(user);
    }

    const insertedUsers = await db
      .insert(schema.users)
      .values(userRecords)
      .returning();
    console.log(`Inserted ${insertedUsers.length} users`);

    // 2. Create Privacy Settings
    console.log("Generating privacy settings...");
    const privacySettings = insertedUsers.map((user) => ({
      userId: user.id,
      showOnlineStatus: faker.datatype.boolean(0.8), // 80% true
      showLastSeen: faker.datatype.boolean(0.7), // 70% true
      showReadReceipts: faker.datatype.boolean(0.6), // 60% true
    }));

    await db.insert(schema.userPrivacySettings).values(privacySettings);
    console.log(`Created privacy settings for ${privacySettings.length} users`);

    // 3. Create Friendships
    console.log("Generating friendships...");
    const friendships = [];

    for (let i = 0; i < insertedUsers.length; i++) {
      for (let j = i + 1; j < insertedUsers.length; j++) {
        if (Math.random() < FRIENDSHIP_DENSITY) {
          const statuses = ["pending", "accepted", "denied"];
          const status = faker.helpers.arrayElement(
            statuses
          ) as (typeof schema.friendStatusEnum.enumValues)[number];

          friendships.push({
            userA: insertedUsers[i].id,
            userB: insertedUsers[j].id,
            status,
          });
        }
      }
    }

    await db.insert(schema.friends).values(friendships);
    console.log(`Created ${friendships.length} friendships`);

    // 4. Create Blocked Users
    console.log("Generating blocked users...");
    const blockedUserRecords = [];

    for (let i = 0; i < insertedUsers.length; i++) {
      for (let j = 0; j < insertedUsers.length; j++) {
        if (i !== j && Math.random() < BLOCK_DENSITY) {
          blockedUserRecords.push({
            blockerId: insertedUsers[i].id,
            blockedId: insertedUsers[j].id,
          });
        }
      }
    }

    await db.insert(schema.blockedUsers).values(blockedUserRecords);
    console.log(`Created ${blockedUserRecords.length} blocked relationships`);

    // 5. Create Chats
    console.log("Generating chats...");
    const chatRecords = [];

    // Direct chats
    for (let i = 0; i < NUM_CHATS * 0.7; i++) {
      chatRecords.push({
        type: "direct" as (typeof schema.chatTypeEnum.enumValues)[number],
        name: "Direct Chat",
        description: "",
        picture: faker.image.url(),
      });
    }

    // Group chats
    for (let i = 0; i < NUM_CHATS * 0.3; i++) {
      chatRecords.push({
        type: "group" as (typeof schema.chatTypeEnum.enumValues)[number],
        name: faker.word.adjective() + " " + faker.word.noun() + " Group",
        description: faker.lorem.sentence(),
        picture: faker.image.url(),
      });
    }

    const insertedChats = await db
      .insert(schema.chats)
      .values(chatRecords)
      .returning();
    console.log(`Created ${insertedChats.length} chats`);

    // 6. Add Chat Participants
    console.log("Adding chat participants...");

    const chatParticipantRecords: {
      userId: number;
      chatId: number;
      role: (typeof schema.userRoleEnum.enumValues)[number];
      createdAt: Date;
    }[] = [];

    for (const chat of insertedChats) {
      if (chat.type === "direct") {
        // For direct chats, add exactly 2 participants
        const participants = faker.helpers.arrayElements(insertedUsers, 2);

        participants.forEach((user) => {
          chatParticipantRecords.push({
            userId: user.id,
            chatId: chat.id,
            role: "user" as (typeof schema.userRoleEnum.enumValues)[number],
            createdAt: faker.date.recent(),
          });
        });
      } else {
        // For group chats, add 3-10 participants
        const numParticipants = faker.number.int({ min: 3, max: 10 });
        const participants = faker.helpers.arrayElements(
          insertedUsers,
          numParticipants
        );

        // First user is admin, rest are normal users
        participants.forEach((user, index) => {
          chatParticipantRecords.push({
            userId: user.id,
            chatId: chat.id,
            role:
              index === 0
                ? "admin"
                : ("user" as (typeof schema.userRoleEnum.enumValues)[number]),
            createdAt: faker.date.recent({ days: 30 }),
          });
        });
      }
    }

    await db.insert(schema.chatParticipants).values(chatParticipantRecords);
    console.log(`Added ${chatParticipantRecords.length} chat participants`);

    // 7. Generate Messages
    console.log("Generating messages...");
    const messageRecords = [];

    for (const chat of insertedChats) {
      // Get participants for this chat
      const chatParticipants = await db
        .select()
        .from(schema.chatParticipants)
        .where(() => sql`${schema.chatParticipants.chatId} = ${chat.id}`);

      if (chatParticipants.length === 0) continue;

      // Generate random number of messages for this chat
      const numMessages = faker.number.int({
        min: 1,
        max: MAX_MESSAGES_PER_CHAT,
      });

      // Messages need to be in chronological order for the conversation to make sense
      let currentDate = faker.date.past({ years: 0.5 });

      for (let i = 0; i < numMessages; i++) {
        // Move time forward a bit for each message
        currentDate = new Date(
          currentDate.getTime() +
            faker.number.int({ min: 60000, max: 86400000 })
        ); // 1 min to 1 day later

        const sender = faker.helpers.arrayElement(chatParticipants);
        messageRecords.push({
          chatId: chat.id,
          senderId: sender.userId,
          content: faker.lorem.paragraph(),
          createdAt: currentDate,
        });
      }
    }

    const insertedMessages = await db
      .insert(schema.messages)
      .values(messageRecords)
      .returning();
    console.log(`Created ${insertedMessages.length} messages`);

    console.log("Generating message attachments...");
    const attachmentTypes = ["image", "video", "audio", "file"];
    const messageAttachments = [];

    for (const message of insertedMessages) {
      if (Math.random() < 0.3) {
        // 30% of messages get attachments
        const numAttachments = faker.number.int({ min: 1, max: 3 });

        for (let i = 0; i < numAttachments; i++) {
          const type = faker.helpers.arrayElement(attachmentTypes);
          let url = "";
          let name = "";

          switch (type) {
            case "image":
              url = faker.image.url();
              name = randomFileName("jpg");
              break;
            case "video":
              url = faker.internet.url() + "/video.mp4";
              name = randomFileName("mp4");
              break;
            case "audio":
              url = faker.internet.url() + "/audio.mp3";
              name = randomFileName("mp3");
              break;
            case "file":
              url = faker.internet.url() + "/file.pdf";
              name = randomFileName("pdf");
              break;
          }

          messageAttachments.push({
            messageId: message.id,
            type,
            url,
            name,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    // await db.insert(schema.messageAttachments).values(messageAttachments);
    console.log(`Inserted ${messageAttachments.length} message attachments`);

    // 8. Generate Message Read Receipts
    console.log("Generating message read receipts...");
    const readReceiptRecords = [];

    for (const message of insertedMessages) {
      // Get chat participants except the sender
      const participants = await db
        .select()
        .from(schema.chatParticipants)
        .where(
          () =>
            sql`${schema.chatParticipants.chatId} = ${message.chatId} AND ${schema.chatParticipants.userId} != ${message.senderId}`
        );

      for (const participant of participants) {
        const received = faker.datatype.boolean();
        const receivedAt = received
          ? faker.date.between({
              from: message.createdAt,
              to: new Date(
                message.createdAt.getTime() +
                  faker.number.int({ min: 60000, max: 86400000 })
              ),
            })
          : null;

        const read = received && faker.datatype.boolean();
        const readAt = read
          ? faker.date.between({
              from: receivedAt!,
              to: new Date(
                receivedAt!.getTime() +
                  faker.number.int({ min: 60000, max: 86400000 })
              ),
            })
          : null;

        readReceiptRecords.push({
          chatId: message.chatId,
          messageId: message.id,
          userId: participant.userId,
          receivedAt,
          readAt,
        });
      }
    }

    await db.insert(schema.messageReadReceipts).values(readReceiptRecords);
    console.log(`Created ${readReceiptRecords.length} read receipts`);

    // 9. Generate OTPs
    // console.log("Generating OTPs...");
    // const otpRecords = insertedUsers.map((user) => ({
    //   phoneNumber: user.phoneNumber,
    //   otp: faker.string.numeric(6),
    //   expiresAt: faker.date.soon({ days: 1 }),
    // }));

    // await db.insert(schema.otps).values(otpRecords);
    // console.log(`Created ${otpRecords.length} OTP records`);

    // 10. Generate Refresh Tokens
    // console.log("Generating refresh tokens...");
    // const refreshTokenRecords = [];

    // for (let i = 0; i < insertedUsers.length * 0.7; i++) {
    //   const user = insertedUsers[i];
    //   refreshTokenRecords.push({
    //     userId: user.id,
    //     token: faker.string.alphanumeric(64),
    //   });
    // }

    // await db.insert(schema.refreshTokens).values(refreshTokenRecords);
    // console.log(`Created ${refreshTokenRecords.length} refresh tokens`);

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }

  // for (let i = 1; i <= 10; i++) {
  //   const phoneNumber = faker.string.alphanumeric({ length: 10 });

  //   dbToSeed.transaction(async (trx) => {
  //     await trx.insert(schema.users).values({
  //       phoneNumber: phoneNumber,
  //       name: faker.person.firstName(),
  //       picture: faker.image.avatar(),
  //       description: faker.lorem.paragraph(),
  //       status: faker.datatype.boolean(),
  //       lastSeen: faker.date.recent(),
  //     });

  //     await trx.insert(schema.otps).values({
  //       phoneNumber: phoneNumber,
  //       otp: faker.string.alphanumeric({ length: 6 }),
  //       expiresAt: faker.date.future(),
  //     });

  //     const user = await trx.query.users.findFirst({
  //       where: eq(schema.users.phoneNumber, phoneNumber),
  //     });

  //     await trx.insert(schema.refreshTokens).values({
  //       userId: user!.id,
  //       token: faker.string.alphanumeric({ length: 6 }),
  //     });

  //     await trx.insert(schema.friends).values({
  //       userA: user!.id,
  //       userB: faker.number.int({ min: i + 1, max: 10 }),
  //       status: faker.helpers.arrayElement(["pending", "accepted", "denied"]),
  //     });

  //     await trx.insert(schema.blockedUsers).values({
  //       blockerId: i,
  //       blockedId: faker.number.int({ min: i + 1, max: 10 }),
  //     });

  //     await trx.insert(schema.userPrivacySettings).values({
  //       userId: i,
  //       showOnlineStatus: faker.datatype.boolean(),
  //       showLastSeen: faker.datatype.boolean(),
  //       showReadReceipts: faker.datatype.boolean(),
  //     });
  //   });
  // }

  // for (let i = 1; i <= 10; i++) {
  //   await dbToSeed.insert(schema.chats).values({
  //     type: faker.helpers.arrayElement(["direct", "group"]),
  //     name: faker.lorem.word(),
  //     description: faker.lorem.words(),
  //     picture: faker.image.url(),
  //   });

  //   await dbToSeed.insert(schema.messages).values({
  //     chatId: i,
  //     senderId: faker.number.int({ min: 1, max: 10 }),
  //     content: faker.lorem.paragraph(),
  //     createdAt: faker.date.recent(),
  //   });

  //   await dbToSeed.insert(schema.chatParticipants).values({
  //     userId: faker.number.int({ min: 1, max: 10 }),
  //     chatId: i,
  //     role: faker.helpers.arrayElement(["user", "admin"]),
  //     createdAt: faker.date.recent(),
  //   });
  // }

  // await seed(dbToSeed, schema).refine((f) => ({
  //   users: {
  //     columns: {
  //       phoneNumber: f.phoneNumber({ template: "##########" }),
  //       description: f.loremIpsum(),
  //       picture: f.valuesFromArray({
  //         values: images,
  //       }),
  //     },
  //   },
  //   otps: {
  //     columns: {
  //       id: f.intPrimaryKey(),
  //       phoneNumber: f.phoneNumber({ template: "##########" }),
  //       otp: f.valuesFromArray({ values: ["123456", "234567", "345678"] }),
  //       expiresAt: f.date({
  //         minDate: new Date(Date.now() + 5 * 60 * 1000),
  //         maxDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  //       }),
  //     },
  //   },
  //   chats: {
  //     columns: {
  //       description: f.loremIpsum(),
  //       picture: f.valuesFromArray({
  //         values: images,
  //       }),
  //     },
  //   },
  //   messages: {
  //     columns: {
  //       content: f.loremIpsum(),
  //     },
  //   },
  //   refreshTokens: {
  //     columns: {
  //       userId: f.intPrimaryKey(),
  //     },
  //   },
  // }));
};

export { db, dbWaitForConnection, dbPush, dbReset, dbSeed };
