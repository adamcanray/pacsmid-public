"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = __importDefault(require("./controller/user.controller"));
const file_controller_1 = __importDefault(require("./controller/file.controller"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use("/user", user_controller_1.default);
app.use("/file", file_controller_1.default);
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`
🚀 Server ready at: http://localhost:${port}
  `));
