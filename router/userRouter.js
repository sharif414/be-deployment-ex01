const express = require("express");
const userService = require("../service/userService");

const router = express.Router();

router.route("/").get(userService.getAllUsers).post(userService.createUser);

router.post("/bulk-users", userService.createBulkUsers);

router
  .route("/:id")
  .get(userService.getUserById)
  .put(userService.updateUser)
  .delete(userService.deleteUserById);

module.exports = router;
