import { StatusCodes, ReasonPhrases } from "http-status-codes";

export class GenericError extends Error {
  name: string;
  statusCode: number;
  message: string;

  constructor(name: string, statusCode: number, message: string) {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
    this.message = message;
  }
}

export class AuthError extends GenericError {
  constructor(message: string) {
    super(ReasonPhrases.UNAUTHORIZED, StatusCodes.UNAUTHORIZED, message);
  }
}

export class BadRequestError extends GenericError {
  constructor(message: string) {
    super(ReasonPhrases.BAD_REQUEST, StatusCodes.BAD_REQUEST, message);
  }
}

export class ServerError extends GenericError {
  constructor(message: string) {
    super(
      ReasonPhrases.INTERNAL_SERVER_ERROR,
      StatusCodes.INTERNAL_SERVER_ERROR,
      message
    );
  }
}

export class RateLimitError extends GenericError {
  constructor(message: string) {
    super(
      ReasonPhrases.TOO_MANY_REQUESTS,
      StatusCodes.TOO_MANY_REQUESTS,
      message
    );
  }
}

export class NotFoundError extends GenericError {
  constructor(message: string) {
    super(ReasonPhrases.NOT_FOUND, StatusCodes.NOT_FOUND, message);
  }
}
