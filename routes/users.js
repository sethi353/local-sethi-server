// const express = require("express");
// const { ObjectId } = require("mongodb");
// const verifyJWT = require("../middlewares/verifyJWT");
// const { client } = require("../utils/db");

// const router = express.Router();
// const usersCollection = client.db("localChefBazaar").collection("users");

// /* --------------------------------------------------
//    POST: Save user (after Firebase registration)
// -------------------------------------------------- */
// router.post("/", async (req, res) => {
//   try {
//     const user = req.body;

//     const exists = await usersCollection.findOne({ email: user.email });
//     if (exists) return res.send({ message: "User already exists" });

//     const newUser = {
//       name: user.name || "",
//       email: user.email,
//       image: user.image || "",
//       address: "",
//       role: "user",       // default role
//       status: "active",   // default status
//       chefId: null,
//       createdAt: new Date(),
//     };

//     const result = await usersCollection.insertOne(newUser);
//     res.send(result);
//   } catch (error) {
//     res.status(500).send({ message: "Error saving user", error: error.message });
//   }
// });

// /* --------------------------------------------------
//    GET: Get user role (JWT protected)
//    Must be before generic /:email route
// -------------------------------------------------- */
// router.get("/role/:email", verifyJWT, async (req, res) => {
//   try {
//     if (req.decoded.email !== req.params.email) {
//       return res.status(403).send({ message: "Forbidden access" });
//     }

//     const user = await usersCollection.findOne({ email: req.params.email });
//     res.send({ role: user?.role });
//   } catch (error) {
//     res.status(500).send({ message: "Error fetching role", error: error.message });
//   }
// });

// /* --------------------------------------------------
//    GET: Get single user by email (NO JWT)
// -------------------------------------------------- */
// router.get("/:email", async (req, res) => {
//   try {
//     const email = req.params.email;

//     const user = await usersCollection.findOne({ email });
//     if (!user) return res.status(404).send({ message: "User not found" });

//     res.send(user);
//   } catch (error) {
//     res.status(500).send({ message: "Error fetching user", error: error.message });
//   }
// });

// /* --------------------------------------------------
//    GET: Get all users (ADMIN ONLY)
// -------------------------------------------------- */
// router.get("/", verifyJWT, async (req, res) => {
//   try {
//     const requester = await usersCollection.findOne({ email: req.decoded.email });
//     if (requester?.role !== "admin") return res.status(403).send({ message: "Admin only" });

//     const users = await usersCollection.find().toArray();
//     res.send(users);
//   } catch (error) {
//     res.status(500).send({ message: "Error fetching users", error: error.message });
//   }
// });

// /* --------------------------------------------------
//    PATCH: Update user role (ADMIN ONLY)
// -------------------------------------------------- */
// router.patch("/:id", verifyJWT, async (req, res) => {
//   try {
//     const requester = await usersCollection.findOne({ email: req.decoded.email });
//     if (requester?.role !== "admin") return res.status(403).send({ message: "Admin only" });

//     const result = await usersCollection.updateOne(
//       { _id: new ObjectId(req.params.id) },
//       { $set: { role: req.body.role } }
//     );

//     res.send(result);
//   } catch (error) {
//     res.status(500).send({ message: "Error updating role", error: error.message });
//   }
// });

// module.exports = router;
