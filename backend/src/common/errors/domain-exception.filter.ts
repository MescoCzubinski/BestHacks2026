import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { DomainErrorKind, DomainException } from "./domain.exception";

const STATUS: Record<DomainErrorKind, HttpStatus> = {
  invalid: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  unavailable: HttpStatus.BAD_GATEWAY,
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainException, host: ArgumentsHost) {
    const statusCode = STATUS[exception.kind];
    this.logger.warn(`${exception.name}: ${exception.message}`);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ statusCode, error: exception.kind, message: exception.message });
  }
}
