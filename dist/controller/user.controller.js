"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_service_1 = __importDefault(require("../service/user.service"));
const router = express_1.default.Router();
const userService = new user_service_1.default();
router.post("/req-login", userService.RequestLogin);
router.post("/login", userService.Login);
exports.default = router;
