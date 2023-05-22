const ResponseHandler = (handler) => async (req, res, next) => {
  try {
    const { data = {}, message = 'success.' } = await handler(req, res, next);
    res.status(200).json({
      success: true,
      message,
      data,
    });
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { ResponseHandler };
