import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { BadRequestError } from "@repo/backend/errors";

const validateHandler = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors
          .map(
            (issue: z.ZodIssue) =>
              `${issue.path.join(".")} is ${issue.message}`,
          )
          .join(", ");
        throw new BadRequestError(errorMessages);
      } else {
        next(error);
      }
    }
  };
};

export default validateHandler;
