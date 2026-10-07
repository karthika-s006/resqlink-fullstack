export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Request body contains invalid JSON." });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: Object.values(error.errors).map((item) => item.message).join(" ") });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "An account with that email already exists." });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "The requested record ID is invalid." });
  }
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({ message: status >= 500 ? "An unexpected server error occurred." : error.message || "The request could not be completed." });
}