// const express = require("express");
// const { client } = require("../utils/db");
// const router = express.Router();

// const mealsCollection = client.db("localChefBazaar").collection("meals");

// // GET meals with sort + pagination
// router.get("/", async (req, res) => {
//   const sortOrder = req.query.sort === "desc" ? -1 : 1;
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.limit) || 10;
//   const skip = (page - 1) * limit;

//   const meals = await mealsCollection
//     .find()
//     .sort({ price: sortOrder })
//     .skip(skip)
//     .limit(limit)
//     .toArray();

//   res.send(meals);
// });

// // GET single meal
// router.get("/:id", async (req, res) => {
//   const id = req.params.id;
//   const meal = await mealsCollection.findOne({ _id: new require("mongodb").ObjectId(id) });
//   res.send(meal);
// });

// module.exports = router;
