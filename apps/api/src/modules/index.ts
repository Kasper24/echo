import { createTypiRouter } from "@repo/typiserver";
import blockRouter from "./block/block.route";
import authRouter from "./auth/auth.route";
import callRouter from "./call/call.route";
import chatRouter from "./chat/chat.route";
import friendsRouter from "./friends/friends.route";
import userRouter from "./user/user.route";

const rootRouter = createTypiRouter({
  "/auth": authRouter,
  "/block": blockRouter,
  "/call": callRouter,
  "/chat": chatRouter,
  "/friends": friendsRouter,
  "/user": userRouter,
});

export default rootRouter;
