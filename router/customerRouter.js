const express = require("express");
const customerService = require("../service/customerService");
const { protect } = require("../middleware/auth");

const customerRouter = express.Router();

customerRouter.use(protect);

customerRouter
  .route("/")
  .get(customerService.getAllCustomers)
  .post(customerService.createCustomer);

customerRouter.post("/bulk", customerService.createBulkCustomers);

customerRouter
  .route("/:id")
  .get(customerService.getCustomerById)
  .put(customerService.updateCustomer)
  .patch(customerService.updateCustomer)
  .delete(customerService.deleteCustomerById);

module.exports = customerRouter;
