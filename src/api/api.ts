import express from "express";
import morgan from "morgan";
import { createRouter } from "./routes";
import { GunMogu } from "../db/gunDb";
import { Handler } from 'express';

export const createApp = (gunDb: GunMogu) => {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(morgan("combined") as Handler);
  
  // Routes
  const router = createRouter(gunDb);
  app.use("/api", router);

  return app;
};
