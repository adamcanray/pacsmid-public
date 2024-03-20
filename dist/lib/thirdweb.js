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
exports.genAuthSig = exports.accessLocalWallet = exports.genLocalWallet = void 0;
const chains_1 = require("@thirdweb-dev/chains");
const wallets_1 = require("@thirdweb-dev/wallets");
const siwe_1 = require("siwe");
const genLocalWallet = (password) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const localWallet = new wallets_1.LocalWallet({ chain: chains_1.Sepolia });
        yield localWallet.generate();
        const wallet = yield localWallet.getAddress();
        const encWallet = yield localWallet.export({
            strategy: "encryptedJson",
            password,
        });
        return { wallet, encWallet };
    }
    catch (error) {
        console.error(error.message);
        return { wallet: null, encWallet: null };
    }
});
exports.genLocalWallet = genLocalWallet;
const accessLocalWallet = (encWallet, password) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const localWallet = new wallets_1.LocalWallet();
        yield localWallet.import({
            encryptedJson: encWallet,
            password,
        });
        return localWallet;
    }
    catch (error) {
        console.error(error.message);
        return error.message;
    }
});
exports.accessLocalWallet = accessLocalWallet;
const genAuthSig = (wallet) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const domain = "localhost";
        const origin = "https://localhost/login";
        const address = yield wallet.getAddress();
        const statement = "Hereby, I sign this message to authenticate myself to the server.";
        const siweMessage = new siwe_1.SiweMessage({
            domain,
            address: address,
            statement,
            uri: origin,
            version: "1",
            chainId: 1,
            // if not request, decrypttion is not allowed using authSig that not container expirationTime (`Session key expiration time is not set`)
            // expirationTime 4 hours in ISO 8601 datetime string
            expirationTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        });
        const messageToSign = siweMessage.prepareMessage();
        const signature = yield wallet.signMessage(messageToSign);
        const authSig = {
            sig: signature,
            derivedVia: "web3.eth.personal.sign",
            signedMessage: messageToSign,
            address: address,
        };
        return authSig;
    }
    catch (error) {
        console.log(error.message);
        return error.message;
    }
});
exports.genAuthSig = genAuthSig;
