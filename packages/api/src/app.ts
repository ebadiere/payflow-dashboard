import express from "express";
import transactionsRouter from "./routes/transactions";

const app = express();

app.use(express.json());

app.use("/transactions", transactionsRouter);

export default app;
