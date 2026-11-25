const express = require("express");

// Morgan writes HTTP request logs to the console, making incoming requests easier to inspect.
const logger = require("morgan");

// CORS controls which browser origins are allowed to call this API.
const cors = require("cors");

// Apply shared Express configuration to the application created in server.js.
function config(app) {
  // Trust the first proxy hop so Express reads values such as protocol and client IP from proxy headers. This is useful when the app runs behind hosting platforms.
  app.set("trust proxy", 1);

  // Register CORS before the routes. Its origin value is read from the ORIGIN environment variable, keeping the allowed frontend URL out of the source code.
  app.use(
    cors({
      origin: [process.env.ORIGIN],
    }),
  );

  // Use Morgan's development format to log each request, including method,
  // route, status code, response size, and response time.
  app.use(logger("dev"));

  // Parse JSON bodies from requests whose Content-Type is application/json.
  // The parsed object is then available to route handlers at req.body.
  app.use(express.json());

  // Parse URL-encoded form bodies, commonly sent by HTML forms.
  // extended: false keeps parsing to simple key/value pairs instead of nested objects.
  app.use(express.urlencoded({ extended: false }));
}


module.exports = config;
