// const express = require("express");
// const { ObjectId } = require("mongodb");
// const verifyJWT = require("../middlewares/verifyJWT");
// const { client } = require("../utils/db");

// const router = express.Router();
// const orderCollection = client.db("localChefBazaar").collection("orders");

// // create order
// router.post("/", verifyJWT, async (req, res) => {
//   const order = req.body;
//   order.createdAt = new Date();
//   order.status = "pending";

//   const result = await orderCollection.insertOne(order);
//   res.send(result);
// });

// // get orders by user
// router.get("/user/:email", verifyJWT, async (req, res) => {
//   if (req.decoded.email !== req.params.email) {
//     return res.status(403).send({ message: "Forbidden" });
//   }

//   const orders = await orderCollection
//     .find({ userEmail: req.params.email })
//     .toArray();

//   res.send(orders);
// });

// module.exports = router;
