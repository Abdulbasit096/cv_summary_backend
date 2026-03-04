// utils/CustomError.js or errors/ApiError.js
class CustomError extends Error {
    constructor(status, message) {
      super(message); // Call the parent Error constructor
      this.status = status;
      this.message = message;
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor); // Optional: cleaner stack trace
    }
  }
  
  module.exports = CustomError;
  