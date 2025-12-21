require("dotenv").config();

const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const { MongoClient, ObjectId } = require("mongodb");



const app = express();
app.use(cors());
app.use(express.json());

// ---------- MongoDB Setup ----------
let client;
let usersCollection, roleRequestsCollection, mealsCollection, ordersCollection, reviewsCollection, favoritesCollection;

async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db("localChefBazaar");

    usersCollection = db.collection("users");
    roleRequestsCollection = db.collection("roleRequests");
    mealsCollection = db.collection("meals");
    ordersCollection = db.collection("orders");
    reviewsCollection = db.collection("reviews");
    favoritesCollection = db.collection("favorites");

    console.log("MongoDB connected");
  }
  return {
    usersCollection,
    roleRequestsCollection,
    mealsCollection,
    ordersCollection,
    reviewsCollection,
    favoritesCollection,
  };
}

// ---------- ROUTES ----------

// Root
app.get("/", async (req, res) => {
  res.send("🚀 LocalChefBazaar Server is Running Successfully!");
});

// Save user
app.post("/users", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const user = req.body;
    const exists = await usersCollection.findOne({ email: user.email });
    if (exists) return res.send({ message: "User exists" });

    const result = await usersCollection.insertOne({
      name: user.name,
      email: user.email,
      image: user.image || "",
      role: "user",
      status: "active",
      chefId: null,
      createdAt: new Date(),
    });
    res.send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

// Get total number of users
app.get("/users/count", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const totalUsers = await usersCollection.countDocuments();
    res.send({ totalUsers });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

// Get user by email
app.get("/users/:email", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const user = await usersCollection.findOne({ email: req.params.email });
    if (!user) return res.status(404).send({ message: "User not found" });
    res.send(user);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

// Get all users
app.get("/users", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const users = await usersCollection.find().toArray();
    res.send(users);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

// Make fraud
app.patch("/users/fraud/:id", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "fraud" } }
    );
    res.send({ success: result.modifiedCount === 1 });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// Update role
app.patch("/users/:id", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// Role request
app.post("/role-request", async (req, res) => {
  try {
    const { roleRequestsCollection } = await connectDB();
    const { userName, userEmail, requestType } = req.body;
    const exists = await roleRequestsCollection.findOne({ userEmail, requestType });
    if (exists) return res.send({ message: "Request already sent" });

    const result = await roleRequestsCollection.insertOne({
      userName,
      userEmail,
      requestType,
      requestStatus: "pending",
      requestTime: new Date(),
    });
    res.send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// Get all role requests
app.get("/role-request", async (req, res) => {
  try {
    const { roleRequestsCollection } = await connectDB();
    const requests = await roleRequestsCollection.find().toArray();
    res.send(requests);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// Approve/reject role request
app.patch("/role-request/:id", async (req, res) => {
  try {
    const { roleRequestsCollection, usersCollection } = await connectDB();
    const { requestStatus, newRole, userEmail } = req.body;

    await roleRequestsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { requestStatus } }
    );

    if (requestStatus === "approved" && newRole) {
      await usersCollection.updateOne(
        { email: userEmail },
        { $set: { role: newRole } }
      );
    }

    res.send({ message: "Request updated" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// Pending orders count
app.get("/orders/pending/count", async (req, res) => {
  try {
    const { ordersCollection } = await connectDB();
    const pendingOrders = await ordersCollection.countDocuments({ orderStatus: "pending" });
    res.send({ pendingOrders });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// ---------- Meals ----------
app.post("/meals", async (req, res) => {
  try {
    const { usersCollection, mealsCollection } = await connectDB();
    const chef = await usersCollection.findOne({ email: req.body.chefEmail });

    if (chef?.status === "fraud") {
      return res.status(403).send({ message: "Fraud chefs cannot create meals" });
    }

    const meal = { ...req.body, createdAt: new Date() };
    const result = await mealsCollection.insertOne(meal);
    res.send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/meals", async (req, res) => {
  try {
    const { mealsCollection } = await connectDB();
    const { limit, sort } = req.query;
    let cursor = mealsCollection.find();

    if (sort === "asc") cursor = cursor.sort({ price: 1 });
    else if (sort === "desc") cursor = cursor.sort({ price: -1 });

    const numLimit = parseInt(limit) || 0;
    if (numLimit > 0) cursor = cursor.limit(numLimit);

    const meals = await cursor.toArray();
    res.send(meals);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/meals/chef/:email", async (req, res) => {
  try {
    const { mealsCollection } = await connectDB();
    const meals = await mealsCollection.find({ chefEmail: req.params.email }).toArray();
    res.send(meals);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/meals/:id", async (req, res) => {
  try {
    const { mealsCollection } = await connectDB();
    const meal = await mealsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!meal) return res.status(404).send({ message: "Meal not found" });
    res.send(meal);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.put("/meals/:id", async (req, res) => {
  try {
    const { mealsCollection } = await connectDB();
    const result = await mealsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    res.send({ success: result.modifiedCount === 1 });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.delete("/meals/:id", async (req, res) => {
  try {
    const { mealsCollection } = await connectDB();
    const result = await mealsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send({ success: result.deletedCount === 1 });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// ---------- Reviews ----------
app.get("/reviews/:mealId", async (req, res) => {
  try {
    const { reviewsCollection } = await connectDB();
    const reviews = await reviewsCollection.find({ mealId: req.params.mealId }).sort({ date: -1 }).toArray();
    res.send(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/reviews", async (req, res) => {
  try {
    const { reviewsCollection } = await connectDB();
    const reviews = await reviewsCollection.find().sort({ date: -1 }).toArray();
    res.send(reviews);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.post("/reviews", async (req, res) => {
  try {
    const { reviewsCollection } = await connectDB();
    const review = { ...req.body, date: new Date() };
    await reviewsCollection.insertOne(review);
    res.send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.put("/reviews/:id", async (req, res) => {
  try {
    const { reviewsCollection } = await connectDB();
    const { rating, comment } = req.body;
    const result = await reviewsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { rating, comment, updatedAt: new Date() } }
    );
    res.send({ success: result.modifiedCount === 1 });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.delete("/reviews/:id", async (req, res) => {
  try {
    const { reviewsCollection } = await connectDB();
    const result = await reviewsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send({ success: result.deletedCount === 1 });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

// ---------- Favorites ----------
app.post("/favorites", async (req, res) => {
  try {
    const { favoritesCollection } = await connectDB();
    const { userEmail, mealId } = req.body;
    const exists = await favoritesCollection.findOne({ userEmail, mealId });
    if (exists) return res.send({ exists: true });

    await favoritesCollection.insertOne({ ...req.body, addedTime: new Date() });
    res.send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/favorites/user/:email", async (req, res) => {
  try {
    const { favoritesCollection } = await connectDB();
    const favorites = await favoritesCollection.find({ userEmail: req.params.email }).toArray();
    res.send(favorites);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.delete("/favorites/:id", async (req, res) => {
  try {
    const { favoritesCollection } = await connectDB();
    await favoritesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).send({ success: false, message: err.message });
  }
});

// ---------- Orders ----------
app.post("/orders", async (req, res) => {
  try {
    const { ordersCollection, usersCollection } = await connectDB();
    const user = await usersCollection.findOne({ email: req.body.userEmail });
    if (user?.status === "fraud") return res.status(403).send({ message: "Fraud users cannot place orders" });

    const order = { ...req.body, orderTime: new Date(), orderStatus: "pending" };
    const result = await ordersCollection.insertOne(order);
    res.send(result);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/orders/:email", async (req, res) => {
  try {
    const { ordersCollection } = await connectDB();
    const orders = await ordersCollection.find({ userEmail: req.params.email }).toArray();
    res.send(orders);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.get("/chef-orders/:email", async (req, res) => {
  try {
    const { ordersCollection } = await connectDB();
    const orders = await ordersCollection.find({ chefEmail: req.params.email }).toArray();
    res.send(orders);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
});

app.patch("/orders/:id", async (req, res) => {
  try {
    const { ordersCollection } = await connectDB();
    const { orderStatus } = req.body;
    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { orderStatus, updatedAt: new Date() } }
    );
    if (result.modifiedCount === 1) res.send({ success: true });
    else res.status(404).send({ success: false, message: "Order not found" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ success: false, message: err.message });
  }
});

// ---------- Export serverless ----------
module.exports = app;
module.exports.handler = serverless(app);
