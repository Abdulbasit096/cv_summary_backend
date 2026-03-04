const errorHandler = (res, error, context = "Server Error") => {
    console.error(`Error in ${context}:`, error);
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return res.status(status).send({ success: false, message });
  };
  
  module.exports = errorHandler;