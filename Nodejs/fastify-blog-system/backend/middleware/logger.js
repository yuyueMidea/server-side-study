/**
 * Request logging middleware
 */
export function requestLogger(request, reply, done) {
  const start = Date.now();
  
  reply.then(() => {
    const duration = Date.now() - start;
    const { method, url } = request;
    const statusCode = reply.statusCode;
    
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    console[logLevel](
      `[${new Date().toISOString()}] ${method} ${url} ${statusCode} - ${duration}ms`
    );
  });
  
  done();
}

/**
 * Error handler
 */
export function errorHandler(error, request, reply) {
  console.error(`[ERROR] ${error.message}`, error.stack);

  const statusCode = error.statusCode || error.status || 500;
  
  reply.status(statusCode).send({
    success: false,
    message: error.message || 'Internal Server Error',
    error: statusCode >= 500 ? 'Internal Server Error' : error.message,
  });
}
