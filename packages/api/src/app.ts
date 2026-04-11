import express from "express";
import transactionsRouter from "./routes/transactions.js";
import metricsRouter from "./routes/metrics.js";

const app = express();

app.use(express.json());

app.use("/transactions", transactionsRouter);
app.use("/metrics", metricsRouter);

export default app;
