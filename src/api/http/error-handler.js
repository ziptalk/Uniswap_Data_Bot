const ErrorHandler = (err, _req, res, next) => {
  const status = err.status ? err.status : 500;
  const message = err.message ? err.message : 'Internal server error';
  res.status(status).json({
    success: false,
    message,
  });
  next();
};

module.exports = { ErrorHandler };
