"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const file_service_1 = __importDefault(require("../service/file.service"));
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)({});
const fileService = new file_service_1.default();
router.post("/enc-dec", fileService.EndDec);
router.get("/access-control-condition", fileService.AccessControlCondition);
exports.default = router;
