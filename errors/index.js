function handleErrors(app) {

  // This middleware runs after no route matched the incoming request.
  // It responds with a 404 status and a clear JSON message.
  app.use((req, res, next) => {
    res.status(404).json({ message: "This route does not exist." });
  });

  // Express identifies this as an error-handling middleware because it accepts four arguments. Any error passed to next(error) should reach this function.
  app.use((err, req, res, next) => {

    // Record the request details and original error to make server-side debugging easier.
    console.log("ERROR", req.method, req.path, err);

    // Avoid overwriting a response that an earlier middleware or route has already sent.
    if (!res.headersSent) {
      res
        .status(500)
        .json({
          // Keep internal error details out of API responses and point developers to the server console, where the full error is logged above.
          message:
            "Internal server error. Check the server console for details.",
        });
    }
    else {
        // If headers were already sent, pass control to the next error handler. This prevents the app from trying to send a second HTTP response.
        next(err);
    }
  });
}

module.exports = handleErrors;
