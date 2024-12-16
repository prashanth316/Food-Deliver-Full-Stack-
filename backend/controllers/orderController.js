import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Placing user order for frontend
const placeOrder = async (req, res) => {
  const frontend_url = "http://localhost:5173";

  try {
    // Log the complete request body for debugging
    console.log("Request Body:", req.body);

    const newOrder = new orderModel({
      userId: req.body.userId,
      items: req.body.items,
      amount: req.body.amount,
      address: req.body.address,
    });
    await newOrder.save();
    await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

    const line_items = req.body.items.map((item) => {
      // Log each item being processed
      console.log("Item being processed:", item);

      // Validate price and quantity
      if (typeof item.price !== "number" || item.price < 0) {
        throw new Error(`Invalid price for item: ${item.name}, price: ${item.price}`);
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        throw new Error(`Invalid quantity for item: ${item.name}, quantity: ${item.quantity}`);
      }

      const price = Math.round(item.price * 100 * 80); // Convert to integer
      return {
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
          },
          unit_amount: price,
        },
        quantity: item.quantity,
      };
    });

    // Add delivery charges to line items
    line_items.push({
      price_data: {
        currency: "inr",
        product_data: { name: "Delivery Charges" },
        unit_amount: Math.round(10 * 100 * 80), // Ensure it's a valid integer
      },
      quantity: 1,
    });

    // Create the Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: line_items,
      mode: "payment",
      success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
    });

    // Send session URL back to the client
    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.error("Error:", error.message); // Log the specific error message
    res.json({ success: false, message: "Error", details: error.message });
  }
};

// Verify the order after payment
const verifyOrder = async (req, res) => {
  let { orderId, success } = req.body;
  try {
    if (success === "true") {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      res.json({ success: true, message: "Paid" });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false, message: "Not Paid" });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.json({ success: false, message: "Error" });
  }
};

// Get user orders
const userOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({ userId: req.body.userId });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error:", error.message);
    res.json({ success: false, message: "Error" });
  }
};

// List orders for the admin panel
const listOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error:", error.message);
    res.json({ success: false, message: "Error" });
  }
};

// API for updating order status
const updateStatus = async (req, res) => {
  try {
    await orderModel.findByIdAndUpdate(req.body.orderId, {
      status: req.body.status,
    });
    res.json({ success: true, message: "Status updated" });
  } catch (error) {
    console.error("Error:", error.message);
    res.json({ success: false, message: "Error" });
  }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
