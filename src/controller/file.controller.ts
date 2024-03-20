import express from "express";
import FileService from "../service/file.service";
import multer from "multer";

const router = express.Router();
const upload = multer({});

const fileService = new FileService();

router.post("/enc-dec", fileService.EndDec);
router.get("/access-control-condition", fileService.AccessControlCondition);

export default router;
