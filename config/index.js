const express = require("express");

// Morgan writes HTTP request logs to the console, making incoming requests easier to inspect.
const logger = require("morgan");

// CORS controls which browser origins are allowed to call this API.
const cors = require("cors");

// Apply shared Express configuration to the application created in server.js.
function config(app) {
  
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: [process.env.ORIGIN],
    }),
  );

  app.use(logger("dev"));

  app.use(express.json());

  app.use(express.urlencoded({ extended: false }));
}

module.exports = config;
