import { Request, Response, ErrorRequestHandler, NextFunction } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { GenericError } from "@repo/backend/errors";

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(error);

  if (error instanceof GenericError) {
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
    });
  } else if (error instanceof Error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: ReasonPhrases.INTERNAL_SERVER_ERROR,
      message: error.message,
    });
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: ReasonPhrases.INTERNAL_SERVER_ERROR,
      message: "Something went wrong",
    });
  }
};

export default errorHandler;
