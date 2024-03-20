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
const axios_1 = __importDefault(require("axios"));
const lit_1 = __importDefault(require("../lib/lit"));
class FileHelper {
    zipAndEncryptFiles(zipEncryptFilesDto) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.zipAndEncryptFiles(Object.assign({}, zipEncryptFilesDto));
        });
    }
    encryptFile(encryptFileDto) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.encryptFile(Object.assign({}, encryptFileDto));
        });
    }
    decryptFile(decryptFileDto) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.decryptFile(Object.assign({}, decryptFileDto));
        });
    }
    uploadToIpfs(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // const storage = new TWStorage(process.env.THIRDWEB_SECRET_KEY);
            // return await storage.uploadToIpfs(data);
            // private ipfs
            try {
                const formData = new FormData();
                formData.append("data", data);
                const ipfsServerApiUrl = `${process.env.IPFS_SERVER_URL + ":5001"}/api/v0/add`;
                const res = yield axios_1.default.post(ipfsServerApiUrl, formData, {});
                const resData = res.data;
                return resData.Hash;
            }
            catch (error) {
                console.log("uploadToIpfs error: ", error, error.response);
                return null;
            }
        });
    }
    downloadFromIpfs(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            // private ipfs
            try {
                const ipfsServerUrl = `${uri}`;
                const res = yield axios_1.default.get(ipfsServerUrl, {});
                return res.data;
            }
            catch (error) {
                console.log("downloadFromIpfs error: ", error, error.response);
            }
        });
    }
    encdec(sessionSigs) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield lit_1.default.encdec(sessionSigs);
        });
    }
}
exports.default = FileHelper;
