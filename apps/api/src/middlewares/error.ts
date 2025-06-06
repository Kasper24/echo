import { getStatus } from "@repo/typiserver/http";
import { Request, Response, ErrorRequestHandler, NextFunction } from "express";

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = getStatus("INTERNAL_SERVER_ERROR");

  res.status(status.code).json({
    key: status.key,
    code: status.code,
    label: status.label,
    message:
      error instanceof Error ? error.message : "An unexpected error occurred",
  });
};

export default errorHandler;
