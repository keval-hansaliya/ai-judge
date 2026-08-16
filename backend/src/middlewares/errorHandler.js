import { ApiError } from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Normalize error to ApiError if it is not already
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, err.errors || [], err.stack);
  }

  const response = {
    statusCode: error.statusCode,
    success: error.success,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {})
  };

  res.status(error.statusCode).json(response);
};
