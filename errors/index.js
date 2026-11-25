function handleErrors(app) {

  app.use((req, res, next) => {
    res.status(404).json({ message: "This route does not exist." });
  });

  app.use((err, req, res, next) => {

    console.log("ERROR", req.method, req.path, err);

    if (!res.headersSent) {
      res
        .status(500)
        .json({
          message:
            "Internal server error. Check the server console for details.",
        });
    }
    else {
        next(err);
    }
  });
}

module.exports = handleErrors;
