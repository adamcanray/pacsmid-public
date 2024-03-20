import type { AuthMethod } from "@lit-protocol/types";
import lit from "../lib/lit";

export default class PKPHelper {
  async sendPasscode(method: "email" | "sms", email: string) {
    return await lit.sendPasscode(method, email);
  }

  async mintPKPWithStytch(
    method: "email" | "sms",
    code: string,
    methodId: string
  ) {
    return await lit.mintPKPWithStytch(method, code, methodId);
  }

  async getUserPKPAndSessionSigs(
    method: "email" | "sms",
    authMethod: AuthMethod
  ) {
    return await lit.getUserPKPAndSessionSigs(method, authMethod);
  }

  async getAuthMethod(method: "email" | "sms", code: string, methodId: string) {
    return await lit.getAuthMethod(method, code, methodId);
  }
}
