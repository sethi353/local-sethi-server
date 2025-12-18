// const express = require("express");
// const { ObjectId } = require("mongodb");
// const { client } = require("../utils/db");
// const verifyJWT = require("../middlewares/verifyJWT");

// const router = express.Router();
// const reviewCollection = client.db("localChefBazaar").collection("reviews");

// // get reviews by foodId
// router.get("/:foodId", async (req, res) => {
//   const foodId = req.params.foodId;
//   const reviews = await reviewCollection.find({ foodId }).toArray();
//   res.send(reviews);
// });

// // add review
// router.post("/", verifyJWT, async (req, res) => {
//   const review = req.body;
//   review.date = new Date();
//   const result = await reviewCollection.insertOne(review);
//   res.send(result);
// });

// module.exports = router;
