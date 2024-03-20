"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.generateAccessControlConditions = void 0;
const LitJsSdk = __importStar(require("@lit-protocol/lit-node-client-nodejs"));
const lit_auth_client_1 = require("@lit-protocol/lit-auth-client");
const constants_1 = require("@lit-protocol/constants");
const stytch_1 = __importDefault(require("stytch"));
const { STYTCH_PROJECT_ID, STYTCH_SECRET } = process.env;
const client = new LitJsSdk.LitNodeClientNodeJs({
    litNetwork: "cayenne",
    debug: true,
});
const chain = "ethereum";
class Lit {
    constructor() {
        this.litAuthClient = new lit_auth_client_1.LitAuthClient({
            litRelayConfig: {
                // Request a Lit Relay Server API key here: https://forms.gle/RNZYtGYTY9BcD9MEA
                relayApiKey: "api-key-here",
            },
        });
        this.stytchClient = new stytch_1.default.Client({
            project_id: STYTCH_PROJECT_ID,
            secret: STYTCH_SECRET,
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield client.connect();
            this.litNodeClient = client;
            console.log("Lit connected", this.litNodeClient, this.litNodeClient.getEncryptionKey, this.litNodeClient.saveEncryptionKey);
        });
    }
    zipAndEncryptFiles({ files, sessionSigs, accessControlConditions, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.litNodeClient) {
                yield this.connect();
            }
            const { ciphertext, dataToEncryptHash } = yield LitJsSdk.zipAndEncryptFiles(files, { chain }, this.litNodeClient);
            return { ciphertext, dataToEncryptHash };
        });
    }
    encryptFile({ file, sessionSigs, accessControlConditions, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.litNodeClient) {
                yield this.connect();
            }
            let encFile = {};
            try {
                encFile = yield LitJsSdk.encryptFile({
                    file,
                    chain,
                    accessControlConditions,
                    sessionSigs,
                }, this.litNodeClient);
            }
            catch (error) {
                console.log("encryptFile error", error);
            }
            const { ciphertext, dataToEncryptHash } = encFile;
            return {
                ciphertext,
                dataToEncryptHash,
            };
        });
    }
    decryptFile({ ciphertext, dataToEncryptHash, sessionSigs, accessControlConditions, }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.litNodeClient) {
                yield this.connect();
            }
            try {
                const decryptedFile = yield LitJsSdk.decryptToFile({
                    accessControlConditions,
                    ciphertext,
                    dataToEncryptHash,
                    sessionSigs,
                    chain,
                }, this.litNodeClient);
                return decryptedFile;
            }
            catch (error) {
                console.error("decryptFile error", error);
                return Object.assign({ error: true }, error);
            }
        });
    }
    // Lit Auth
    sendPasscode(method, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // method: 'email' or 'sms', userId: email or phone number
            let response;
            if (method === "email") {
                response = yield this.stytchClient.otps.email.loginOrCreate({
                    email: userId,
                });
            }
            else {
                response = yield this.stytchClient.otps.sms.loginOrCreate({
                    phone_number: !userId.startsWith("+") ? `+${userId}` : userId,
                });
            }
            return response.phone_id || response.email_id;
        });
    }
    getAuthMethod(method, code, methodId) {
        return __awaiter(this, void 0, void 0, function* () {
            // method: 'email' or 'sms', code: OTP code, methodId: method_id returned from sendPasscode
            // Authenticate the OTP code with Stytch
            const stytchResponse = yield this.stytchClient.otps.authenticate({
                code,
                method_id: methodId,
                session_duration_minutes: 60, // this will trigger to create a session
            });
            if (stytchResponse.status_code !== 200) {
                console.error("Stytch OTP authentication failed", stytchResponse);
                throw new Error("Stytch OTP authentication failed");
            }
            // Initialize StytchEmailFactorOtp or StytchSmsFactorOtp provider
            let provider;
            if (method === "email") {
                provider = this.litAuthClient.initProvider(constants_1.ProviderType.StytchEmailFactorOtp, {
                    appId: STYTCH_PROJECT_ID,
                });
            }
            else {
                provider = this.litAuthClient.initProvider(constants_1.ProviderType.StytchSmsFactorOtp, {
                    appId: STYTCH_PROJECT_ID,
                });
            }
            // Get auth method object after autheticating Stytch JWT
            // Example on lit-pkp-auth-demo/src/utils/lit.ts (func authenticateWithOTP)
            const authMethod = yield provider.authenticate({
                accessToken: stytchResponse.session_jwt,
                userId: stytchResponse.user_id,
            });
            return authMethod;
        });
    }
    getUserPKPAndSessionSigs(method, authMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            // get provider
            let provider;
            if (method === "email") {
                provider = this.litAuthClient.getProvider(constants_1.ProviderType.StytchEmailFactorOtp);
            }
            else {
                provider = this.litAuthClient.getProvider(constants_1.ProviderType.StytchSmsFactorOtp);
            }
            // Fetch PKPs associated with the authenticated social account
            const pkps = yield provider.fetchPKPsThroughRelayer(authMethod);
            // Create an access control condition resource
            // const litResource = new LitAccessControlConditionResource("*");
            /**
             * When the getSessionSigs function is called, it will generate a session key
             * and sign it using a callback function. The authNeededCallback parameter
             * in this function is optional. If you don't pass this callback,
             * then the user will be prompted to authenticate with their wallet.
             */
            // const authNeededCallback = async ({
            //   chain,
            //   resources,
            //   expiration,
            //   uri,
            // }) => {
            //   const domain = "localhost:3000";
            //   const message = new SiweMessage({
            //     domain,
            //     address: wallet.address,
            //     statement: "Sign a session key to use with Lit Protocol",
            //     uri,
            //     version: "1",
            //     chainId: "1",
            //     expirationTime: expiration,
            //     resources,
            //     nonce,
            //   });
            //   const toSign = message.prepareMessage();
            //   const signature = await wallet.signMessage(toSign);
            //   const authSig = {
            //     sig: signature,
            //     derivedVia: "web3.eth.personal.sign",
            //     signedMessage: toSign,
            //     address: wallet.address,
            //   };
            //   return authSig;
            // };
            const sessionSigs = yield provider.getSessionSigs({
                authMethod,
                pkpPublicKey: pkps[0].publicKey,
                sessionSigsParams: {
                    chain: "ethereum",
                    resourceAbilityRequests: [
                    // {
                    //   resource: litResource,
                    //   ability: LitAbility.AccessControlConditionDecryption,
                    // },
                    ],
                    // authNeededCallback,
                },
            });
            // The first PKP
            const pkp = pkps[0];
            return { pkp, sessionSigs };
        });
    }
    // Get auth method object by validating Stytch JWT and mint PKP after authenticating it
    mintPKPWithStytch(method, code, methodId) {
        return __awaiter(this, void 0, void 0, function* () {
            const authMethod = yield this.getAuthMethod(method, code, methodId);
            // get provider
            let provider;
            if (method === "email") {
                provider = this.litAuthClient.getProvider(constants_1.ProviderType.StytchEmailFactorOtp);
            }
            else {
                provider = this.litAuthClient.getProvider(constants_1.ProviderType.StytchSmsFactorOtp);
            }
            // -- setting scope for the auth method
            // <https://developer.litprotocol.com/v3/sdk/wallets/auth-methods/#auth-method-scopes>
            const options = {
                permittedAuthMethodScopes: [[constants_1.AuthMethodScope.SignAnything]],
            };
            // Mint PKP using the auth method
            const mintTx = yield provider.mintPKPThroughRelayer(authMethod, options);
            const { pkp, sessionSigs } = yield this.getUserPKPAndSessionSigs(method, authMethod);
            return { pkp, sessionSigs, mintTx };
        });
    }
    encdec(userSessionSigs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.litNodeClient) {
                yield this.connect();
            }
            console.log("encdec userSessionSigs", userSessionSigs);
            const acc = (0, exports.generateAccessControlConditions)(process.env.LIT_ACTION_CODE_URL, ["12345", ":userAddress"]);
            console.log("encdec acc", acc);
            // encrypt
            const { ciphertext, dataToEncryptHash } = yield LitJsSdk.encryptString({
                accessControlConditions: acc,
                chain: "ethereum",
                sessionSigs: userSessionSigs,
                dataToEncrypt: "this is a secret message",
            }, this.litNodeClient);
            console.log("enc", ciphertext, dataToEncryptHash, userSessionSigs, acc);
            // descrypt
            const decryptedString = yield LitJsSdk.decryptToString({
                ciphertext,
                dataToEncryptHash,
                sessionSigs: userSessionSigs,
                accessControlConditions: acc,
                chain,
            }, this.litNodeClient);
            console.log("decrypted string", decryptedString);
            return { ciphertext, dataToEncryptHash, decryptedString };
        });
    }
}
exports.default = new Lit();
const generateAccessControlConditions = (contractAddress, parameters) => {
    let acc = [];
    const cond1 = {
        contractAddress,
        standardContractType: "LitAction",
        chain: "ethereum",
        method: "checkFileAccess",
        parameters,
        returnValueTest: {
            comparator: "=",
            value: "true",
        },
    };
    acc.push(cond1);
    return acc;
};
exports.generateAccessControlConditions = generateAccessControlConditions;
