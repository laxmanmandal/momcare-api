export type ValidationFieldError = {
  field: string;
  message: string;
};

export class ValidationError extends Error {
  readonly statusCode = 422;
  readonly code = 'VALIDATION_ERROR';
  readonly errors: ValidationFieldError[];

  constructor(errors: ValidationFieldError[], message = 'Validation Error') {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
