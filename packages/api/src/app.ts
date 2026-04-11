import express from "express";
import cors from "cors";
import transactionsRouter from "./routes/transactions.js";
import metricsRouter from "./routes/metrics.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.use("/transactions", transactionsRouter);
app.use("/metrics", metricsRouter);
app.listen(3000, () => {
  console.log('Server running on port 3000');
});

export default app;
