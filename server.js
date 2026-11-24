try {
  process.loadEnvFile();
} catch (error) {
  console.warn(".env file not found, using default environment values.");
}

const express = require("express");
const app = express();

const connectDB = require("./db");
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server listening. Local access on http://localhost:${PORT}`);
});
