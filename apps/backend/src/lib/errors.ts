export class DomainError extends Error {
  constructor(message: string, public statusCode: number = 400, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'You do not have permission to perform this action', code?: string) {
    super(message, 403, code);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string = 'Invalid data', code?: string) {
    super(message, 400, code);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string = 'Resource already exists', code?: string) {
    super(message, 409, code);
  }
}
