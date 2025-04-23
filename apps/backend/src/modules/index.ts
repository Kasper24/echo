import { Router } from "express";
import authHandler from "@repo/backend/middlewares/auth";
import blockRouter from "@repo/backend/modules/block/block.route";
import authRouter from "@repo/backend/modules/auth/auth.route";
import chatRouter from "@repo/backend/modules/chat/chat.route";
import friendsRouter from "@repo/backend/modules/friends/friends.route";
import userRouter from "@repo/backend/modules/user/user.route";

const rootRouter = Router();

rootRouter.use("/auth", authRouter);
rootRouter.use("/block", authHandler, blockRouter);
rootRouter.use("/chat", authHandler, chatRouter);
rootRouter.use("/friends", authHandler, friendsRouter);
rootRouter.use("/user", authHandler, userRouter);

export default rootRouter;
