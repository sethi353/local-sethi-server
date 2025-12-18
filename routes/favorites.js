// const express = require("express");
// const { client } = require("../utils/db");
// const verifyJWT = require("../middlewares/verifyJWT");

// const router = express.Router();
// const favoriteCollection = client.db("localChefBazaar").collection("favorites");

// router.post("/", verifyJWT, async (req, res) => {
//   const favorite = req.body;

//   const exists = await favoriteCollection.findOne({
//     userEmail: favorite.userEmail,
//     mealId: favorite.mealId,
//   });

//   if (exists) {
//     return res.send({ message: "Already added" });
//   }

//   favorite.addedTime = new Date();
//   const result = await favoriteCollection.insertOne(favorite);
//   res.send(result);
// });

// module.exports = router;
