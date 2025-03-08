import { Request, Response, ErrorRequestHandler } from "express";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { GenericError } from "@repo/backend/utils/errors";

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
) => {
  console.error(error);

  if (error instanceof GenericError) {
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
    });
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: ReasonPhrases.INTERNAL_SERVER_ERROR,
      message: "",
    });
  }
};

export default errorHandler;
