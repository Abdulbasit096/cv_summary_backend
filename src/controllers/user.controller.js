const User = require("../models/user.model");
const errorHandler = require("../utils/errorHandler");

exports.getUser = async (req, res) => {
  try {
    return res.status(200).json({
      message: "User fetched successfully.",
      data: req.user,
    });
  } catch (error) {
    console.log(error);
    errorHandler(res, error, "getUser");
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("_id firstName lastName email role")
      .lean();
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      data: users,
    });
  } catch (error) {
    errorHandler(res, error, "getAllUsers");
  }
};
