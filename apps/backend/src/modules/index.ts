import { Router } from "express";
import authHandler from "@repo/backend/middlewares/auth";
import authRouter from "@repo/backend/modules/auth/auth.route";
import chatRouter from "@repo/backend/modules/chat/chat.route";
import friendsRouter from "@repo/backend/modules/friends/friends.route";

const rootRouter = Router();

rootRouter.use("/auth", authRouter);
rootRouter.use("/chat", authHandler, chatRouter);
rootRouter.use("/friends", authHandler, friendsRouter);

export default rootRouter;
