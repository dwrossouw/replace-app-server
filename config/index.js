const express = require("express");

const logger = require("morgan");

const cors = require("cors");

function config(app) {
  app.set("trust proxy", 1);

  app.use({
    origin: [process.env.ORIGIN],
  });

  app.use(logger("dev"));

  app.use(express.json());

  app.use(express.urlencoded({ extended: false }));
}

module.exports = config;
