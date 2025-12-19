// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const { connectDB } = require("./utils/db");
// const userRoutes = require("./routes/users");
// const testRoutes = require("./routes/test");
// const reviewRoutes = require("./routes/reviews");
// const favoriteRoutes = require("./routes/favorites");
// const orderRoutes = require("./routes/orders");

// const app = express();
// const port = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());
// app.use("/users", userRoutes);
// app.use("/test", testRoutes);
// app.use("/reviews", reviewRoutes);
// app.use("/favorites", favoriteRoutes);
// app.use("/orders", orderRoutes);

// connectDB();

// app.get("/", (req, res) => {
//   res.send("LocalChefBazaar Server Running");
// });

// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://localchef:iBTBFM7C1MzuB75C@cluster1.fbaio1l.mongodb.net/?appName=Cluster1";
const client = new MongoClient(uri);

let usersCollection;
let roleRequestsCollection;
let mealsCollection;
let ordersCollection;
let reviewsCollection;
let favoritesCollection;

client.connect().then(() => {
  const db = client.db("localChefBazaar");
  usersCollection = db.collection("users");
    roleRequestsCollection = db.collection("roleRequests");
    mealsCollection = db.collection("meals");
     ordersCollection = db.collection("orders");
     reviewsCollection = db.collection("reviews");
     favoritesCollection = db.collection("favorites");

   
  console.log("MongoDB connected");
    app.listen(5000, () => console.log("Server running on port 5000"));
});

// Save user
app.post("/users", async (req, res) => {
  const user = req.body;
  const exists = await usersCollection.findOne({ email: user.email });
  if (exists) return res.send({ message: "User exists" });

  const result = await usersCollection.insertOne({
    name: user.name,
    email: user.email,
    image: user.image || "",
    role: "user",       // 🔐 FORCE
    status: "active",   // 🔐 FORCE
    chefId: null,
    createdAt: new Date()
  });
  res.send(result);
});







// Get user by email
app.get("/users/:email", async (req, res) => {
  const user = await usersCollection.findOne({ email: req.params.email });
  if (!user) return res.status(404).send({ message: "User not found" });
  res.send(user);
});



// Get all users (Admin)
app.get("/users", async (req, res) => {
  const users = await usersCollection.find().toArray();
  res.send(users);
});



// Make Fraud Route
app.patch("/users/fraud/:id", async (req, res) => {
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status: "fraud" } }
  );

  res.send({ success: result.modifiedCount === 1 });
});






// Update role
app.patch("/users/:id", async (req, res) => {
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: req.body }
  );
  res.send(result);
});



// role request



app.post("/role-request", async (req, res) => {
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
});




// Get all role requests
app.get("/role-request", async (req, res) => {
  const requests = await roleRequestsCollection.find().toArray();
  res.send(requests);
});

// Approve / Reject request
app.patch("/role-request/:id", async (req, res) => {
  const { requestStatus, newRole, userEmail } = req.body;

  // Update the request status
  await roleRequestsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { requestStatus } }
  );

  // If approved, update the user's role in users collection
  if (requestStatus === "approved" && newRole) {
    await usersCollection.updateOne(
      { email: userEmail },
      { $set: { role: newRole } }
    );
  }

  res.send({ message: "Request updated" });
});


// // Create meal
// app.post("/meals", async (req, res) => {
//   const meal = { ...req.body, createdAt: new Date() };
//   const result = await mealsCollection.insertOne(meal);
//   res.send(result);
// });



// create meal
app.post("/meals", async (req, res) => {
  const chef = await usersCollection.findOne({ email: req.body.chefEmail });

  if (chef?.status === "fraud") {
    return res.status(403).send({
      message: "Fraud chefs cannot create meals"
    });
  }

  const meal = { ...req.body, createdAt: new Date() };
  const result = await mealsCollection.insertOne(meal);
  res.send(result);
});






// Get all meals
app.get("/meals", async (req, res) => {
  const meals = await mealsCollection.find().toArray();
  res.send(meals);
});




// Get meals by chef email
app.get("/meals/chef/:email", async (req, res) => {
  const email = req.params.email;
  const meals = await mealsCollection.find({ chefEmail: email }).toArray();
  res.send(meals);
});



app.delete("/meals/:id", async (req, res) => {
  const result = await mealsCollection.deleteOne({
    _id: new ObjectId(req.params.id)
  });
  res.send({ success: result.deletedCount === 1 });
});


app.put("/meals/:id", async (req, res) => {
  const result = await mealsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { ...req.body, updatedAt: new Date() } }
  );
  res.send({ success: result.modifiedCount === 1 });
});






// Get single meal by ID (Meal Details Page)
app.get("/meals/:id", async (req, res) => {
  const id = req.params.id;

  const meal = await mealsCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!meal) {
    return res.status(404).send({ message: "Meal not found" });
  }

  res.send(meal);
});

// ================= REVIEWS =================

// Get reviews for a meal
app.get("/reviews/:foodId", async (req, res) => {
  const foodId = req.params.foodId;

  const reviews = await reviewsCollection
    .find({ foodId })
    .sort({ date: -1 })
    .toArray();

  res.send(reviews);
});


// SAFETY ROUTE (important)
app.get("/reviews", (req, res) => {
  res.send([]);
});

// Add review
app.post("/reviews", async (req, res) => {
  const review = {
    ...req.body,
    date: new Date()
  };

  const result = await reviewsCollection.insertOne(review);
  res.send({ success: true });
});
  



// ================= FAVORITES =================

app.post("/favorites", async (req, res) => {
  const { userEmail, mealId } = req.body;

  const exists = await favoritesCollection.findOne({ userEmail, mealId });

  if (exists) {
    return res.send({ exists: true });
  }

  await favoritesCollection.insertOne({
    ...req.body,
    addedTime: new Date()
  });

  res.send({ success: true });
});




// Get reviews by user
app.get("/reviews/user/:email", async (req, res) => {
  const reviews = await reviewsCollection.find({ reviewerEmail: req.params.email }).toArray();
  res.send(reviews);
});

// Get favorites by user
app.get("/favorites/user/:email", async (req, res) => {
  const favorites = await favoritesCollection.find({ userEmail: req.params.email }).toArray();
  res.send(favorites);
});






// Delete review by ID
app.delete("/reviews/:id", async (req, res) => {
  const { id } = req.params;
  const result = await reviewsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send({ success: result.deletedCount === 1 });
});

// Update review by ID
app.put("/reviews/:id", async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const result = await reviewsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { rating, comment, updatedAt: new Date() } }
  );

  res.send({ success: result.modifiedCount === 1 });
});





// Delete favorite by ID
app.delete("/favorites/:id", async (req, res) => {
  try {
    await favoritesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send({ success: true });
  } catch (err) {
    res.send({ success: false, message: err.message });
  }
});








// // Place order
// app.post("/orders", async (req, res) => {
//   const order = { ...req.body, orderTime: new Date(), orderStatus: "pending" };
//   const result = await ordersCollection.insertOne(order);
//   res.send(result);
// });


// place order
app.post("/orders", async (req, res) => {
  const user = await usersCollection.findOne({ email: req.body.userEmail });

  if (user?.status === "fraud") {
    return res.status(403).send({
      message: "Fraud users cannot place orders"
    });
  }

  const order = {
    ...req.body,
    orderTime: new Date(),
    orderStatus: "pending"
  };

  const result = await ordersCollection.insertOne(order);
  res.send(result);
});




// Get user orders
app.get("/orders/:email", async (req, res) => {
  const orders = await ordersCollection.find({ userEmail: req.params.email }).toArray();
  res.send(orders);
});





// Get orders for a chef
app.get("/chef-orders/:email", async (req, res) => {
  const chefEmail = req.params.email;

  // Find orders where this chef is assigned
  const orders = await ordersCollection.find({ chefEmail }).toArray();

  res.send(orders);
});


// Update order status
app.patch("/orders/:id", async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const orderId = req.params.id;

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { orderStatus, updatedAt: new Date() } }
    );

    if (result.modifiedCount === 1) {
      res.send({ success: true });
    } else {
      res.status(404).send({ success: false, message: "Order not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ success: false, message: err.message });
  }
});










