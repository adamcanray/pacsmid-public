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
const user_repository_1 = __importDefault(require("../repository/user.repository"));
const pkp_1 = __importDefault(require("../helper/pkp"));
const loginRequest_repository_1 = __importDefault(require("../repository/loginRequest.repository"));
class UserService {
    RequestLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // userId is email or phone number
            const { method, userId } = req.body;
            try {
                const pkpHelper = new pkp_1.default();
                const methodId = yield pkpHelper.sendPasscode(method, userId);
                const loginRequestRepository = new loginRequest_repository_1.default();
                yield loginRequestRepository
                    .create({
                    data: {
                        otpMethodId: methodId,
                    },
                })
                    .catch((error) => {
                    console.error("Error saving login request", error);
                    throw new Error("Error saving login request");
                });
                res.json({ methodId, userId, message: "Passcode sent" });
            }
            catch (error) {
                console.error("RequestLogin error", error);
                res.status(500).json({ message: "Error sending passcode" });
            }
        });
    }
    Login(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            let { foreignId, type, otpMethod, otpCode, otpMethodId } = req.body;
            // OTP method is optional
            otpMethod = otpMethod || ((_a = otpMethodId === null || otpMethodId === void 0 ? void 0 : otpMethodId.split("-")) === null || _a === void 0 ? void 0 : _a[0]);
            // Check login request
            const loginRequestRepository = new loginRequest_repository_1.default();
            const loginRequest = yield loginRequestRepository.findFirst({
                where: {
                    otpMethodId,
                },
            });
            if (!loginRequest) {
                return res.status(400).json({ message: "Invalid login request" });
            }
            // Check type
            if (!["user", "organization"].includes(type)) {
                return res.status(400).json({ message: "Invalid user type" });
            }
            const userRepository = new user_repository_1.default();
            // Find user by foreignId and type
            let user = yield userRepository.findFirst({
                where: {
                    foreignId,
                    type,
                },
            });
            let userSessionSigs = null;
            let userPKP = null;
            // If user not exist, create a new one
            const pkpHelper = new pkp_1.default();
            if (!user) {
                const { pkp, sessionSigs } = yield pkpHelper.mintPKPWithStytch(otpMethod, otpCode, otpMethodId);
                userSessionSigs = sessionSigs;
                userPKP = pkp;
                user = yield userRepository.create({
                    data: {
                        foreignId,
                        type,
                        wallet: userPKP.ethAddress,
                    },
                });
            }
            else {
                const authMethod = yield pkpHelper.getAuthMethod(otpMethod, otpCode, otpMethodId);
                const { pkp, sessionSigs } = yield pkpHelper.getUserPKPAndSessionSigs(otpMethod, authMethod);
                userSessionSigs = sessionSigs;
                userPKP = pkp;
            }
            // Remove login request
            yield loginRequestRepository.delete({
                where: {
                    id: loginRequest.id,
                },
            });
            const response = {
                userId: user.id,
                foreignId: user.foreignId,
                name: user.foreignId,
                wallet: user.wallet,
                userPKP,
                userSessionSigs,
            };
            res.json(response);
        });
    }
}
exports.default = UserService;
