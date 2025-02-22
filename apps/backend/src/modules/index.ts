import { Router } from "express";
import authRouter from "@repo/backend/modules/auth/auth.route";

const rootRouter = Router();

rootRouter.use("/auth", authRouter);

export default rootRouter;
