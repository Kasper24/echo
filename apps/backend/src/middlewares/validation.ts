import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { BadRequestError } from "@repo/backend/errors";

const validateHandler = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { success, error } = schema.safeParse(req);

    if (!success) {
      const errorMessages = error.errors
        .map(
          (issue: z.ZodIssue) => `${issue.path.join(".")} is ${issue.message}`
        )
        .join(", ");
      throw new BadRequestError(errorMessages);
    }

    next();
  };
};

export default validateHandler;
