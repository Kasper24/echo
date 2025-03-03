import { Router } from "express";
import authHandler from "@repo/backend/middlewares/auth";
import authRouter from "@repo/backend/modules/auth/auth.route";
import friendsRouter from "@repo/backend/modules/friends/friends.route";

const rootRouter = Router();

rootRouter.use("/auth", authRouter);
rootRouter.use("/friends", authHandler, friendsRouter);

export default rootRouter;
