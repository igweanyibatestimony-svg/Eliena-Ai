import { isProduction } from '../config/env.js';

export function notFoundHandler(request, response) {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${request.method} ${request.originalUrl}`
    }
  });
}

export function errorHandler(error, request, response, next) {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  const payload = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 && isProduction
        ? 'An unexpected error occurred.'
        : error.message || 'An unexpected error occurred.'
    }
  };

  if (!isProduction && error.stack) {
    payload.error.stack = error.stack;
  }

  response.status(status).json(payload);
}
