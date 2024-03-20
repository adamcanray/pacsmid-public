import { Request, Response } from "express";
import type { IRelayPKP, SessionSigs } from "@lit-protocol/types";
import UserRepository from "../repository/user.repository";
import PKPHelper from "../helper/pkp";
import LoginRequestRepository from "../repository/loginRequest.repository";
export default class UserService {
  async RequestLogin(req: Request, res: Response) {
    // userId is email or phone number
    const { method, userId } = req.body;

    try {
      const pkpHelper = new PKPHelper();
      const methodId = await pkpHelper.sendPasscode(method, userId);
      const loginRequestRepository = new LoginRequestRepository();

      await loginRequestRepository
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
    } catch (error) {
      console.error("RequestLogin error", error);
      res.status(500).json({ message: "Error sending passcode" });
    }
  }

  async Login(req: Request, res: Response) {
    let { foreignId, type, otpMethod, otpCode, otpMethodId } = req.body;

    // OTP method is optional
    otpMethod = otpMethod || otpMethodId?.split("-")?.[0];

    // Check login request
    const loginRequestRepository = new LoginRequestRepository();
    const loginRequest = await loginRequestRepository.findFirst({
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

    const userRepository = new UserRepository();

    // Find user by foreignId and type
    let user = await userRepository.findFirst({
      where: {
        foreignId,
        type,
      },
    });

    let userSessionSigs: SessionSigs = null;
    let userPKP: IRelayPKP = null;

    // If user not exist, create a new one
    const pkpHelper = new PKPHelper();
    if (!user) {
      const { pkp, sessionSigs } = await pkpHelper.mintPKPWithStytch(
        otpMethod,
        otpCode,
        otpMethodId
      );

      userSessionSigs = sessionSigs;
      userPKP = pkp;

      user = await userRepository.create({
        data: {
          foreignId,
          type,
          wallet: userPKP.ethAddress,
        },
      });
    } else {
      const authMethod = await pkpHelper.getAuthMethod(
        otpMethod,
        otpCode,
        otpMethodId
      );
      const { pkp, sessionSigs } = await pkpHelper.getUserPKPAndSessionSigs(
        otpMethod,
        authMethod
      );

      userSessionSigs = sessionSigs;
      userPKP = pkp;
    }

    // Remove login request
    await loginRequestRepository.delete({
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
  }
}
