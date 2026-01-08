const express = require("express");
const router = express.Router();
const { createSubscription } = require("./paypalController.cjs");
const authMiddleware = require("../middleware/auth.cjs"); // adjust path

router.post("/create-subscription", authMiddleware, createSubscription);

module.exports = router;
