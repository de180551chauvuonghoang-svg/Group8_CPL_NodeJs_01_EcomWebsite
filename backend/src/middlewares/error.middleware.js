export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error('[🚨 Express Error]', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message || 'Internal Server Error',
    // Only send stack trace in development mode
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
