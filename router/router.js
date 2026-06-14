const express = require("express");
const userService = require("../service/userService");
const customerService = require("../service/customerService");
const { protect, restrictTo } = require("../middleware/auth");

const router = express.Router();

// Public routes (no token required)
router.post("/login", userService.signIn);

// All routes below require a valid token
router.use(protect);

router.get("/", userService.getAllUsers);
router.post("/", restrictTo("admin"), userService.signUp);

router.post("/bulk", userService.createBulkUsers);

router
  .route("/customers")
  .get(customerService.getAllCustomers)
  .post(customerService.createCustomer);

router.post("/customers/bulk", customerService.createBulkCustomers);

router
  .route("/customers/:id")
  .get(customerService.getCustomerById)
  .put(customerService.updateCustomer)
  .patch(customerService.updateCustomer)
  .delete(customerService.deleteCustomerById);

router
  .route("/:id")
  .get(userService.getUserById)
  .put(userService.updateUser)
  .patch(userService.updateUser)
  .delete(userService.deleteUserById);

module.exports = router;
