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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lit_1 = __importDefault(require("../lib/lit"));
class PKPHelper {
    sendPasscode(method, email) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.sendPasscode(method, email);
        });
    }
    mintPKPWithStytch(method, code, methodId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.mintPKPWithStytch(method, code, methodId);
        });
    }
    getUserPKPAndSessionSigs(method, authMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.getUserPKPAndSessionSigs(method, authMethod);
        });
    }
    getAuthMethod(method, code, methodId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.getAuthMethod(method, code, methodId);
        });
    }
}
exports.default = PKPHelper;
