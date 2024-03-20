import express from "express";
import userController from "./controller/user.controller";
import fileController from "./controller/file.controller";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/user", userController);
app.use("/file", fileController);

const port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(`
🚀 Server ready at: http://localhost:${port}
  `)
);
