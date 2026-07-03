export class DomainError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string = 'Invalid data') {
    super(message, 400);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}
