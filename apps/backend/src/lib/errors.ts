export class DomainError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string = 'Không tìm thấy tài nguyên') {
    super(message, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Bạn không có quyền thực hiện hành động này') {
    super(message, 403);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string = 'Dữ liệu không hợp lệ') {
    super(message, 400);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string = 'Tài nguyên đã tồn tại') {
    super(message, 409);
  }
}
