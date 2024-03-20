"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class LoginRequestRepository {
    constructor() {
        this.findFirst = (args) => __awaiter(this, void 0, void 0, function* () {
            const loginRequest = yield prisma.loginRequest.findFirst(args);
            return loginRequest;
        });
        this.create = (args) => __awaiter(this, void 0, void 0, function* () {
            const loginRequest = yield prisma.loginRequest.create(args);
            return loginRequest;
        });
        this.update = (args) => __awaiter(this, void 0, void 0, function* () {
            const loginRequest = yield prisma.loginRequest.update(args);
            return loginRequest;
        });
        this.delete = (args) => __awaiter(this, void 0, void 0, function* () {
            const loginRequest = yield prisma.loginRequest.delete(args);
            return loginRequest;
        });
    }
}
exports.default = LoginRequestRepository;
