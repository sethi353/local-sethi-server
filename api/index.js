const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

// ---------- MongoDB ----------

let cachedClient = null;
let cachedDb = null;

async function connectDB() {
  if (cachedDb) {
    return {
      usersCollection: cachedDb.collection("users"),
      roleRequestsCollection: cachedDb.collection("roleRequests"),
      mealsCollection: cachedDb.collection("meals"),
      ordersCollection: cachedDb.collection("orders"),
      reviewsCollection: cachedDb.collection("reviews"),
      favoritesCollection: cachedDb.collection("favorites"),
    };
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGO_URI);
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db("localChefBazaar");

  return {
    usersCollection: cachedDb.collection("users"),
    roleRequestsCollection: cachedDb.collection("roleRequests"),
    mealsCollection: cachedDb.collection("meals"),
    ordersCollection: cachedDb.collection("orders"),
    reviewsCollection: cachedDb.collection("reviews"),
    favoritesCollection: cachedDb.collection("favorites"),
  };
}

// ---------- ROOT ----------
app.get("/", (req, res) => {
  res.send("🚀 LocalChefBazaar Server is Running Successfully!");
});

// ---------- USERS ----------
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
    res.status(500).send({ message: err.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    res.send(await usersCollection.find().toArray());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/users/count", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    res.send({ totalUsers: await usersCollection.countDocuments() });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/users/:email", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const user = await usersCollection.findOne({ email: req.params.email });
    if (!user) return res.status(404).send({ message: "User not found" });
    res.send(user);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.patch("/users/fraud/:id", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "fraud" } }
    );
    res.send({ success: result.modifiedCount === 1 });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.patch("/users/:id", async (req, res) => {
  try {
    const { usersCollection } = await connectDB();
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// ---------- ROLE REQUEST ----------
app.post("/role-request", async (req, res) => {
  try {
    const { roleRequestsCollection } = await connectDB();
    const exists = await roleRequestsCollection.findOne(req.body);
    if (exists) return res.send({ message: "Request already sent" });

    const result = await roleRequestsCollection.insertOne({
      ...req.body,
      requestStatus: "pending",
      requestTime: new Date(),
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/role-request", async (req, res) => {
  try {
    const { roleRequestsCollection } = await connectDB();
    res.send(await roleRequestsCollection.find().toArray());
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

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
    res.status(500).send({ message: err.message });
  }
});

// ---------- MEALS ----------
app.post("/meals", async (req, res) => {
  try {
    const { mealsCollection, usersCollection } = await connectDB();
    const chef = await usersCollection.findOne({ email: req.body.chefEmail });

    if (chef?.status === "fraud") {
      return res.status(403).send({ message: "Fraud chefs cannot create meals" });
    }

    const meal = { ...req.body, createdAt: new Date() };
    const result = await mealsCollection.insertOne(meal);
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Get all meals with optional limit and sort
app.get("/meals", async (req, res) => {
  try {
    const { mealsCollection } = await connectDB();
    let { limit, sort } = req.query;

    let cursor = mealsCollection.find();

    // Sorting by price
    if (sort === "asc") cursor = cursor.sort({ price: 1 });
    else if (sort === "desc") cursor = cursor.sort({ price: -1 });

    // Limiting results only if limit is provided
    if (limit) {
      const numLimit = parseInt(limit);
      if (numLimit > 0) cursor = cursor.limit(numLimit);
    }

    const meals = await cursor.toArray();
    res.send(meals);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});


app.get("/meals/:id", async (req, res) => {
  try {
    const { mealsCollection } = await connectDB();
    const meal = await mealsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!meal) return res.status(404).send({ message: "Meal not found" });
    res.send(meal);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/meals/chef/:email", async (req, res) => {
  const { mealsCollection } = await connectDB();
  const meals = await mealsCollection.find({ chefEmail: req.params.email }).toArray();
  res.send(meals);
});

app.delete("/meals/:id", async (req, res) => {
  const { mealsCollection } = await connectDB();
  const result = await mealsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send({ success: result.deletedCount === 1 });
});

app.put("/meals/:id", async (req, res) => {
  const { mealsCollection } = await connectDB();
  const result = await mealsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { ...req.body, updatedAt: new Date() } }
  );
  res.send({ success: result.modifiedCount === 1 });
});

// ---------- REVIEWS ----------
app.post("/reviews", async (req, res) => {
  const { reviewsCollection } = await connectDB();
  await reviewsCollection.insertOne({ ...req.body, date: new Date() });
  res.send({ success: true });
});

app.get("/reviews", async (req, res) => {
  const { reviewsCollection } = await connectDB();
  const reviews = await reviewsCollection.find().sort({ date: -1 }).toArray();
  res.send(reviews);
});

app.get("/reviews/:mealId", async (req, res) => {
  const { reviewsCollection } = await connectDB();
  const reviews = await reviewsCollection.find({ mealId: req.params.mealId }).sort({ date: -1 }).toArray();
  res.send(reviews);
});

app.get("/reviews/user/:email", async (req, res) => {
  const { reviewsCollection } = await connectDB();
  const reviews = await reviewsCollection.find({ reviewerEmail: req.params.email }).toArray();
  res.send(reviews);
});

app.put("/reviews/:id", async (req, res) => {
  const { reviewsCollection } = await connectDB();
  const { rating, comment } = req.body;
  const result = await reviewsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { rating, comment, updatedAt: new Date() } }
  );
  res.send({ success: result.modifiedCount === 1 });
});

app.delete("/reviews/:id", async (req, res) => {
  const { reviewsCollection } = await connectDB();
  const result = await reviewsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send({ success: result.deletedCount === 1 });
});

// ---------- FAVORITES ----------
app.post("/favorites", async (req, res) => {
  const { favoritesCollection } = await connectDB();
  const exists = await favoritesCollection.findOne(req.body);
  if (exists) return res.send({ exists: true });

  await favoritesCollection.insertOne({ ...req.body, addedTime: new Date() });
  res.send({ success: true });
});

app.get("/favorites/user/:email", async (req, res) => {
  const { favoritesCollection } = await connectDB();
  const favorites = await favoritesCollection.find({ userEmail: req.params.email }).toArray();
  res.send(favorites);
});

app.delete("/favorites/:id", async (req, res) => {
  const { favoritesCollection } = await connectDB();
  await favoritesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send({ success: true });
});

// ---------- ORDERS ----------
app.post("/orders", async (req, res) => {
  const { ordersCollection, usersCollection } = await connectDB();
  const user = await usersCollection.findOne({ email: req.body.userEmail });

  if (user?.status === "fraud") {
    return res.status(403).send({ message: "Fraud users cannot place orders" });
  }

  const order = { ...req.body, orderTime: new Date(), orderStatus: "pending" };
  const result = await ordersCollection.insertOne(order);
  res.send(result);
});

app.get("/orders/:email", async (req, res) => {
  const { ordersCollection } = await connectDB();
  const orders = await ordersCollection.find({ userEmail: req.params.email }).toArray();
  res.send(orders);
});

app.get("/chef-orders/:email", async (req, res) => {
  const { ordersCollection } = await connectDB();
  const orders = await ordersCollection.find({ chefEmail: req.params.email }).toArray();
  res.send(orders);
});

app.patch("/orders/:id", async (req, res) => {
  const { ordersCollection } = await connectDB();
  const { orderStatus } = req.body;

  const result = await ordersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { orderStatus, updatedAt: new Date() } }
  );

  if (result.modifiedCount === 1) res.send({ success: true });
  else res.status(404).send({ success: false, message: "Order not found" });
});

// ---------- EXPORT ----------
module.exports = app;
module.exports.handler = serverless(app);
