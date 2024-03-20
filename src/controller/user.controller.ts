import express from "express";
import UserService from "../service/user.service";

const router = express.Router();

const userService = new UserService();

router.post("/req-login", userService.RequestLogin);
router.post("/login", userService.Login);

export default router;
