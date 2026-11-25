try {
  process.loadEnvFile();
} catch (error) {
  console.warn(".env file not found, using default environment values.");
}

const express = require("express");
const app = express();

//DB connection setup
const connectDB = require("./db");
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

//Test route
app.get("/", (req, res, next)=>{
  res.json("All good in the hood.")
})

//Route handlers
const indexRouter = require("./routes/index.routes");
app.use("/api", indexRouter);

const handleErrors = require("./errors");
handleErrors(app);

//Server port and listen setup
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server listening. Local access on http://localhost:${PORT}`);
});
