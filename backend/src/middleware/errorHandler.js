export function errorHandler(err, req, res, next) {
  console.error(JSON.stringify({ level: 'error', event: 'http.error', requestId: req.requestId, method: req.method, path: req.originalUrl, message: err.message, code: err.code || null }));
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error', requestId: req.requestId
  });
}
