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
const archiver_1 = __importDefault(require("archiver"));
const file_1 = __importDefault(require("../helper/file"));
const file_repository_1 = __importDefault(require("../repository/file.repository"));
const consent_repository_1 = __importDefault(require("../repository/consent.repository"));
const user_repository_1 = __importDefault(require("../repository/user.repository"));
const lit_1 = require("../lib/lit");
class FileService {
    Upload(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { userId, organizatzionId, accessionNumber, userSessionSigs } = req.body;
            const files = req.files;
            userSessionSigs = userSessionSigs
                ? JSON.parse(userSessionSigs)
                : undefined;
            if (!userId || !accessionNumber || !userSessionSigs || !files) {
                return res.status(400).json({
                    message: "Missing userId or accessionNumber or userSessionSigs or files",
                });
            }
            try {
                const userRepository = new user_repository_1.default();
                const user = yield userRepository.findFirst({
                    where: {
                        foreignId: userId,
                    },
                });
                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }
                const fileHelper = new file_1.default();
                const bufferData = [];
                for (const file of files) {
                    const fileBuffer = Buffer.from(file.buffer);
                    bufferData.push(fileBuffer);
                }
                const zipStream = (0, archiver_1.default)("zip");
                for (let i = 0; i < bufferData.length; i++) {
                    console.log("[" + i + "]filename: ", files[i].originalname.replace(/\s+/g, "-"));
                    const buffer = bufferData[i];
                    zipStream.append(buffer, {
                        name: files[i].originalname.replace(/\s+/g, "-"),
                    });
                }
                zipStream.finalize();
                const zipPromise = yield new Promise((resolve, reject) => {
                    const chunks = [];
                    zipStream.on("data", (chunk) => {
                        chunks.push(chunk);
                    });
                    zipStream.on("end", () => {
                        const blob = new Blob([Buffer.concat(chunks)], {
                            type: "application/zip",
                        });
                        resolve(blob);
                    });
                    zipStream.on("error", (error) => {
                        reject(error);
                    });
                });
                var accessControlConditions = (0, lit_1.generateAccessControlConditions)(process.env.LIT_ACTION_CODE_URL, [accessionNumber, ":userAddress"]);
                console.log("upload acc", accessControlConditions, userSessionSigs);
                const { ciphertext, dataToEncryptHash } = yield fileHelper.encryptFile({
                    file: zipPromise,
                    sessionSigs: userSessionSigs,
                    accessControlConditions: accessControlConditions,
                });
                const plainTextFile = new Blob([Buffer.from(ciphertext)], {
                    type: "text/plain",
                });
                const uri = yield fileHelper.uploadToIpfs(plainTextFile);
                const fileRepository = new file_repository_1.default();
                const indexId = yield fileRepository.create({
                    data: {
                        cid: uri,
                        userId: userId,
                        accessionNumber: accessionNumber,
                        accessControlConditions: JSON.stringify(accessControlConditions),
                        dataToEncryptHash,
                        fileName: `${accessionNumber}.zip`,
                        mimeType: "application/zip",
                    },
                });
                res.json(indexId);
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ message: error.message });
            }
        });
    }
    Download(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { accessionNumber, userSessionSigs, foreignId, type, } = req.body;
            if (!foreignId || !type || !userSessionSigs) {
                return res
                    .status(400)
                    .json({ message: "Missing foreignId or type or userSessionSigs" });
            }
            const fileRepository = new file_repository_1.default();
            const file = yield fileRepository.findFirst({
                where: {
                    accessionNumber,
                },
            });
            if (!file) {
                return res.status(404).json({ message: "File not found" });
            }
            const fileHelper = new file_1.default();
            const metadata = yield fileHelper.downloadFromIpfs(`${process.env.IPFS_SERVER_URL}/ipfs/${file.cid}`);
            console.log("download acc", (0, lit_1.generateAccessControlConditions)(process.env.LIT_ACTION_CODE_URL, [
                accessionNumber,
                ":userAddress",
            ]), typeof userSessionSigs, userSessionSigs);
            const decryptedFile = yield fileHelper.decryptFile({
                ciphertext: metadata,
                dataToEncryptHash: file.dataToEncryptHash,
                sessionSigs: userSessionSigs,
                accessControlConditions: JSON.parse(file.accessControlConditions),
            });
            if (decryptedFile.error) {
                return res.status(decryptedFile.status || 401).json(decryptedFile);
            }
            res.setHeader("Content-Type", "application/zip");
            res.setHeader("Content-Disposition", `attachment; filename=${file.fileName}`);
            res.send(Buffer.from(decryptedFile));
        });
    }
    GrantAccess(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { wallet, accessionNumber, expiredAtInSeconds } = req.body;
            // check is wallet is valid
            if (!wallet || !accessionNumber) {
                return res
                    .status(400)
                    .json({ message: "Missing wallet or expiredAtInSeconds" });
            }
            // check user
            const userRepository = new user_repository_1.default();
            const user = yield userRepository.findFirst({
                where: {
                    wallet,
                },
            });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            // check file
            const fileRepository = new file_repository_1.default();
            const file = yield fileRepository.findFirst({
                where: {
                    accessionNumber,
                },
            });
            if (!file) {
                return res.status(404).json({ message: "File not found" });
            }
            // check consent
            const expiredAt = new Date();
            expiredAt.setSeconds(expiredAt.getSeconds() + (expiredAtInSeconds || 3600)); // default 1 hour
            const consentRepository = new consent_repository_1.default();
            const findConsent = yield consentRepository.findFirst({
                where: {
                    wallet,
                    accessionNumber,
                },
            });
            if (!findConsent) {
                const consent = yield consentRepository.create({
                    data: {
                        wallet,
                        accessionNumber,
                        expiredAt,
                    },
                });
                return res.json(consent);
            }
            const consent = yield consentRepository.update({
                where: {
                    id: findConsent === null || findConsent === void 0 ? void 0 : findConsent.id,
                    wallet,
                    accessionNumber,
                },
                data: {
                    wallet,
                    accessionNumber,
                    expiredAt,
                },
            });
            res.json(consent);
        });
    }
    AccessControlCondition(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { accessionNumber, wallet } = req.query;
            if (!accessionNumber || !wallet) {
                return res
                    .status(400)
                    .json({ message: "Missing accessionNumber or wallet" });
            }
            const fileRepository = new file_repository_1.default();
            const file = yield fileRepository.findFirst({
                where: {
                    accessionNumber: accessionNumber,
                },
            });
            if (!file) {
                return res.status(404).json({ message: "File not found" });
            }
            const userRepository = new user_repository_1.default();
            const user = yield userRepository.findFirst({
                where: {
                    foreignId: file.userId,
                },
            });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (user.wallet === wallet) {
                return res
                    .status(200)
                    .json({ canAccess: true, message: "No need consent" });
            }
            const consentRepository = new consent_repository_1.default();
            const consent = yield consentRepository.findFirst({
                where: {
                    wallet: wallet,
                    accessionNumber: accessionNumber,
                },
            });
            if (!consent) {
                return res
                    .status(401)
                    .json({ canAccess: false, message: "No consent found" });
            }
            if (new Date(consent.expiredAt) < new Date()) {
                return res
                    .status(401)
                    .json({ canAccess: false, message: "Consent expired" });
            }
            res.status(200).json({ canAccess: true, message: "Consent found" });
        });
    }
    EndDec(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            let { userSessionSigs } = req.body;
            try {
                const fileHelper = new file_1.default();
                const { decryptedString } = yield fileHelper.encdec(userSessionSigs);
                res.json(decryptedString);
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ message: error.message });
            }
        });
    }
}
exports.default = FileService;
