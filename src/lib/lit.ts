import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import type {
  AccessControlConditions,
  AcceptedFileType,
  AuthMethod,
  SessionSigs,
} from "@lit-protocol/types";
import { BaseProvider, LitAuthClient } from "@lit-protocol/lit-auth-client";
import { ProviderType, AuthMethodScope } from "@lit-protocol/constants";
import stytch, {
  OTPsEmailLoginOrCreateResponse,
  OTPsSmsLoginOrCreateResponse,
} from "stytch";
import {
  LitAccessControlConditionResource,
  LitAbility,
  LitActionResource,
} from "@lit-protocol/auth-helpers";

export interface EncryptFileDto {
  file: AcceptedFileType;
  sessionSigs?: SessionSigs;
  accessControlConditions: AccessControlConditions;
}

export interface DecryptFileDto {
  ciphertext: string;
  dataToEncryptHash: string;
  sessionSigs?: SessionSigs;
  accessControlConditions: AccessControlConditions;
}

export interface ZipEncryptFilesDto {
  files: Array<File>;
  sessionSigs?: SessionSigs;
  accessControlConditions: AccessControlConditions;
}

const { STYTCH_PROJECT_ID, STYTCH_SECRET } = process.env;

const client = new LitJsSdk.LitNodeClientNodeJs({
  litNetwork: "cayenne",
  debug: true,
});
const chain = "ethereum";

class Lit {
  // private litNodeClient: LitJsSdk.LitNodeClientNodeJs;
  private litNodeClient: any;

  private litAuthClient = new LitAuthClient({
    litRelayConfig: {
      // Request a Lit Relay Server API key here: https://forms.gle/RNZYtGYTY9BcD9MEA
      relayApiKey: "api-key-here",
    },
  });

  private stytchClient = new stytch.Client({
    project_id: STYTCH_PROJECT_ID,
    secret: STYTCH_SECRET,
  });

  async connect() {
    await client.connect();
    this.litNodeClient = client;

    console.log(
      "Lit connected",
      this.litNodeClient,
      this.litNodeClient.getEncryptionKey,
      this.litNodeClient.saveEncryptionKey
    );
  }

  async zipAndEncryptFiles({
    files,
    sessionSigs,
    accessControlConditions,
  }: ZipEncryptFilesDto) {
    if (!this.litNodeClient) {
      await this.connect();
    }

    const { ciphertext, dataToEncryptHash } = await LitJsSdk.zipAndEncryptFiles(
      files,
      { chain },
      this.litNodeClient
    );

    return { ciphertext, dataToEncryptHash };
  }

  async encryptFile({
    file,
    sessionSigs,
    accessControlConditions,
  }: EncryptFileDto) {
    if (!this.litNodeClient) {
      await this.connect();
    }

    let encFile = {};
    try {
      encFile = await LitJsSdk.encryptFile(
        {
          file,
          chain,
          accessControlConditions,
          sessionSigs,
        },
        this.litNodeClient
      );
    } catch (error) {
      console.log("encryptFile error", error);
    }

    const { ciphertext, dataToEncryptHash }: any = encFile;

    return {
      ciphertext,
      dataToEncryptHash,
    };
  }

  async decryptFile({
    ciphertext,
    dataToEncryptHash,
    sessionSigs,
    accessControlConditions,
  }: DecryptFileDto) {
    if (!this.litNodeClient) {
      await this.connect();
    }

    try {
      const decryptedFile = await LitJsSdk.decryptToFile(
        {
          accessControlConditions,
          ciphertext,
          dataToEncryptHash,
          sessionSigs,
          chain,
        },
        this.litNodeClient
      );

      return decryptedFile;
    } catch (error: any) {
      console.error("decryptFile error", error);
      return { error: true, ...error };
    }
  }

  // Lit Auth
  async sendPasscode(method: "email" | "sms", userId: string) {
    // method: 'email' or 'sms', userId: email or phone number
    let response: (
      | OTPsSmsLoginOrCreateResponse
      | OTPsEmailLoginOrCreateResponse
    ) & {
      phone_id?: string;
      email_id?: string;
    };

    if (method === "email") {
      response = await this.stytchClient.otps.email.loginOrCreate({
        email: userId,
      });
    } else {
      response = await this.stytchClient.otps.sms.loginOrCreate({
        phone_number: !userId.startsWith("+") ? `+${userId}` : userId,
      });
    }

    return response.phone_id || response.email_id;
  }

  async getAuthMethod(method: "email" | "sms", code: string, methodId: string) {
    // method: 'email' or 'sms', code: OTP code, methodId: method_id returned from sendPasscode

    // Authenticate the OTP code with Stytch
    const stytchResponse = await this.stytchClient.otps.authenticate({
      code,
      method_id: methodId,
      session_duration_minutes: 60, // this will trigger to create a session
    });

    if (stytchResponse.status_code !== 200) {
      console.error("Stytch OTP authentication failed", stytchResponse);
      throw new Error("Stytch OTP authentication failed");
    }

    // Initialize StytchEmailFactorOtp or StytchSmsFactorOtp provider
    let provider: BaseProvider;
    if (method === "email") {
      provider = this.litAuthClient.initProvider(
        ProviderType.StytchEmailFactorOtp,
        {
          appId: STYTCH_PROJECT_ID,
        }
      );
    } else {
      provider = this.litAuthClient.initProvider(
        ProviderType.StytchSmsFactorOtp,
        {
          appId: STYTCH_PROJECT_ID,
        }
      );
    }

    // Get auth method object after autheticating Stytch JWT
    // Example on lit-pkp-auth-demo/src/utils/lit.ts (func authenticateWithOTP)
    const authMethod = await provider.authenticate({
      accessToken: stytchResponse.session_jwt,
      userId: stytchResponse.user_id,
    });

    return authMethod;
  }

  async getUserPKPAndSessionSigs(method: string, authMethod: AuthMethod) {
    // get provider
    let provider: BaseProvider;
    if (method === "email") {
      provider = this.litAuthClient.getProvider(
        ProviderType.StytchEmailFactorOtp
      );
    } else {
      provider = this.litAuthClient.getProvider(
        ProviderType.StytchSmsFactorOtp
      );
    }

    // Fetch PKPs associated with the authenticated social account
    const pkps = await provider.fetchPKPsThroughRelayer(authMethod);

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

    const sessionSigs = await provider.getSessionSigs({
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
  }

  // Get auth method object by validating Stytch JWT and mint PKP after authenticating it
  async mintPKPWithStytch(
    method: "email" | "sms",
    code: string,
    methodId: string
  ) {
    const authMethod = await this.getAuthMethod(method, code, methodId);

    // get provider
    let provider: BaseProvider;
    if (method === "email") {
      provider = this.litAuthClient.getProvider(
        ProviderType.StytchEmailFactorOtp
      );
    } else {
      provider = this.litAuthClient.getProvider(
        ProviderType.StytchSmsFactorOtp
      );
    }

    // -- setting scope for the auth method
    // <https://developer.litprotocol.com/v3/sdk/wallets/auth-methods/#auth-method-scopes>
    const options = {
      permittedAuthMethodScopes: [[AuthMethodScope.SignAnything]],
    };

    // Mint PKP using the auth method
    const mintTx = await provider.mintPKPThroughRelayer(authMethod, options);

    const { pkp, sessionSigs } = await this.getUserPKPAndSessionSigs(
      method,
      authMethod
    );

    return { pkp, sessionSigs, mintTx };
  }

  async encdec(userSessionSigs: any) {
    if (!this.litNodeClient) {
      await this.connect();
    }

    console.log("encdec userSessionSigs", userSessionSigs);
    const acc = generateAccessControlConditions(
      process.env.LIT_ACTION_CODE_URL,
      ["12345", ":userAddress"]
    );

    console.log("encdec acc", acc);

    // encrypt
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions: acc,
        chain: "ethereum",
        sessionSigs: userSessionSigs,
        dataToEncrypt: "this is a secret message",
      },
      this.litNodeClient
    );

    console.log("enc", ciphertext, dataToEncryptHash, userSessionSigs, acc);

    // descrypt
    const decryptedString = await LitJsSdk.decryptToString(
      {
        ciphertext,
        dataToEncryptHash,
        sessionSigs: userSessionSigs,
        accessControlConditions: acc,
        chain,
      },
      this.litNodeClient
    );
    console.log("decrypted string", decryptedString);

    return { ciphertext, dataToEncryptHash, decryptedString };
  }
}

export default new Lit();

export const generateAccessControlConditions = (
  contractAddress: string,
  parameters: any[]
) => {
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
