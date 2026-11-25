// Load environment variables from a local .env file when the file is available.
try {
  process.loadEnvFile();
} catch (error) {
  // Continue with process-provided variables or defaults if no .env file exists.
  console.warn(".env file not found, using default environment values.");
}

// Import Express and create one application instance for the entire server.
const express = require("express");
const app = express();

// Apply shared CORS, logging, proxy, JSON, and form parsing configuration.
const config = require("./config");
config(app);

// Import the database connection function and run it before each request.
const connectDB = require("./db");
app.use(async (req, res, next) => {
  // connectDB reuses an existing Mongoose connection or attempts to open one.
  await connectDB();
  // Continue to the next middleware or route even after the connection attempt.
  next();
});

// Simple health/test route used to confirm that the server is responding.
app.get("/", (req, res, next)=>{
  res.json("All good in the hood.")
})

// Mount the API route modules below the common /api URL prefix.
const indexRouter = require("./routes/index.routes");
app.use("/api", indexRouter);

// Register the 404 and general error handlers after all application routes.
const handleErrors = require("./errors");
handleErrors(app);

// Use the environment's port when provided, otherwise fall back to port 5005.
const PORT = process.env.PORT || 5005;

// Start the HTTP server and log the local development address when listening.
app.listen(PORT, () => {
  console.log(`Server listening. Local access on http://localhost:${PORT}`);
});
