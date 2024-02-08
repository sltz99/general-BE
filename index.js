const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");// للتشفير مكتبه
const jwt = require("jsonwebtoken");// لحفظ بيانات المستخمدم  كوكيز
const bodyParser = require("body-parser");
const cors = require("cors");

const User = require("./models/User");
const Order = require("./models/Order");
const Service = require("./models/Service");
const Message = require("./models//messages");
const multer = require('multer');
const path = require('path')

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(
  "mongodb+srv://sltandell:sultan123@cluster0.kvslztx.mongodb.net/",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, "your-secret-key", (error, decodedToken) => {
    if (error) {
      return res.status(403).json({ error: "Forbidden" });
    }

    console.log("user ", decodedToken.userId);

    req.userId = decodedToken.userId; // Attach userId to the request object
    next();
  });
};

// Set storage engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // 1MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('image');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check the extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check the MIME type
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images only!');
  }
}

// Upload endpoint
app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err });
    } else {
      if (req.file == undefined) {
        res.status(400).json({ message: 'Error: No File Selected!' });
      } else {
        const baseUrl = req.protocol + '://' + req.get('host');
        res.status(200).json({ imageUrl: `https://general-be1-eeea8a48c7e4.herokuapp.com/uploads/${req.file.filename}` });
      }
    }
  });
});

// User Registration
app.post("/register", async (req, res) => {
  try {
    const { email, username, password, phoneNumber } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      username,
      password: hashedPassword,
      phoneNumber,
    });
    await newUser.save();

    res.status(201).send("User created");
  } catch (error) {
    res.status(500).send("Error in registration");
  }
});

// User Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign({ userId: user._id }, "your-secret-key", {
        expiresIn: "1h",
      });

      res.status(200).json({ token });
    } else {
      res.status(400).send("Invalid credentials");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Error in login");
  }
});

// Assuming you have an authentication middleware `authenticateToken`

// Fetch messages between current user and selected user

// Create a new message
app.post("/api/messages", authenticateToken, async (req, res) => {
  const { toUserId, text } = req.body;
  const fromUserId = req.userId;

  try {
    const message = new Message({
      fromUser: fromUserId,
      toUser: toUserId,
      text,
    });
    await message.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get the list of users
app.get("/api/messages/users/list", authenticateToken, async (req, res) => {
  const currentUserId = req.userId;

  try {
    const users = await User.find(
      {
        $or: [
          { _id: { $ne: currentUserId } },
          {
            sentMessages: {
              $in: await Message.find({ fromUser: currentUserId }).distinct(
                "toUser"
              ),
            },
          },
          {
            _id: {
              $in: await Message.find({ toUser: currentUserId }).distinct(
                "fromUser"
              ),
            },
          },
        ],
      },
      "username"
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/messages/list/new-users", authenticateToken, async (req, res) => {
  const currentUserId = req.userId;

  try {
    const usersWithMessages = await User.aggregate([
      {
        $match: {
          _id: { $ne: mongoose.Types.ObjectId(currentUserId) },
        },
      },
      {
        $lookup: {
          from: "messages",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$fromUser", "$$userId"] },
                    { $eq: ["$toUser", "$$userId"] },
                  ],
                },
              },
            },
          ],
          as: "messages",
        },
      },
      {
        $match: {
          messages: { $size: 0 },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
        },
      },
    ]);

    const users = usersWithMessages.map((user) => ({
      _id: user._id,
      username: user.username,
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/messages/:toUserId", authenticateToken, async (req, res) => {
  const fromUserId = req.userId;
  const toUserId = req.params.toUserId;

  try {
    const messages = await Message.find({
      $or: [
        { fromUser: fromUserId, toUser: toUserId },
        { fromUser: toUserId, toUser: fromUserId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post a Service
app.post("/service", authenticateToken, async (req, res) => {
  try {
    const { image, title, price, description } = req.body;
    const newService = new Service({
      image,
      title,
      price,
      description,
      user: req.userId,
    });
    await newService.save();

    res.status(201).send("Service posted");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error posting service");
  }
});

// Fetch Services
app.get("/servicesUser", authenticateToken, async (req, res) => {
  try {
    const userServices = await Service.find({ user: req.userId });
    res.status(200).json(userServices);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ message: "Error fetching services" });
  }
});

// Edit Service
app.put("/services/:id", authenticateToken, async (req, res) => {
  try {
    const { title, price, description } = req.body;
    const serviceId = req.params.id;

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { title, price, description },
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res
      .status(200)
      .json({ message: "Service updated", service: updatedService });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ message: "Error updating service" });
  }
});

// Delete Service
app.delete("/services/:id", authenticateToken, async (req, res) => {
  try {
    const serviceId = req.params.id;

    const deletedService = await Service.findByIdAndDelete(serviceId);

    if (!deletedService) {
      return res.status(404).json({ message: "Service not found" });
    }

    res
      .status(200)
      .json({ message: "Service deleted", service: deletedService });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ message: "Error deleting service" });
  }
});

// Post API for ordering a new service
app.post("/api/orders", authenticateToken, async (req, res) => {
  const { serviceId } = req.body;
  const userId = req.userId; // Assuming you have a middleware to extract user ID from JWT

  try {
    // Create a new order
    const order = new Order({
      service: serviceId,
      user: userId,
    });

    // Save the order to the database
    await order.save();

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get API for fetching orders
app.get("/api/orders", authenticateToken, async (req, res) => {
  const userId = req.userId; // Assuming you have a middleware to extract user ID from JWT

  try {
    // Fetch orders for the current user
    const orders = await Order.find({ user: userId }).populate("service");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to complete an order
app.post(
  "/api/orders/:orderId/complete",
  authenticateToken,
  async (req, res) => {
    const orderId = req.params.orderId;

    try {
      // Find the order by ID and update its status or any other relevant details
      const order = await Order.findByIdAndUpdate(
        orderId,
        { $set: { completed: true } },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Route to get all services
app.get("/services", async (req, res) => {
  try {
    const services = await Service.find({}).populate("user", "username"); // Populate the 'user' field with 'username' only
    res.json(services);
  } catch (error) {
    res.status(500).send("Error fetching services: " + error.message);
  }
});

// Endpoint to rate a service
app.post("/rate-service", authenticateToken, async (req, res) => {
  try {
    const { orderId, rating } = req.body;

    const order = await Order.findById(orderId);
    if (!order || order.user.toString() !== req.user.userId) {
      return res
        .status(403)
        .send("You can only rate services you have ordered.");
    }

    order.rating = rating;
    await order.save();

    // Update service rating here
    // You might want to fetch all related orders and calculate the average rating

    res.status(200).send("Service rated successfully");
  } catch (error) {
    res.status(500).send("Error rating service");
  }
});

// Additional routes can be added here

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
