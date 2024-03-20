import { Request, Response } from "express";
import archiver from "archiver";
import type { SessionSigs } from "@lit-protocol/types";
import FileHelper from "../helper/file";
import FileRepository from "../repository/file.repository";
import ConsentRepository from "../repository/consent.repository";
import UserRepository from "../repository/user.repository";
import { generateAccessControlConditions } from "../lib/lit";

export default class FileService {
  async Upload(req: Request, res: Response) {
    let { userId, organizatzionId, accessionNumber, userSessionSigs } =
      req.body;
    const files = req.files as Express.Multer.File[];

    userSessionSigs = userSessionSigs
      ? JSON.parse(userSessionSigs as string)
      : undefined;

    if (!userId || !accessionNumber || !userSessionSigs || !files) {
      return res.status(400).json({
        message:
          "Missing userId or accessionNumber or userSessionSigs or files",
      });
    }

    try {
      const userRepository = new UserRepository();
      const user = await userRepository.findFirst({
        where: {
          foreignId: userId,
        },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fileHelper = new FileHelper();

      const bufferData = [];

      for (const file of files as any) {
        const fileBuffer = Buffer.from(file.buffer);
        bufferData.push(fileBuffer);
      }

      const zipStream = archiver("zip");

      for (let i = 0; i < bufferData.length; i++) {
        console.log(
          "[" + i + "]filename: ",
          files[i].originalname.replace(/\s+/g, "-")
        );

        const buffer = bufferData[i];
        zipStream.append(buffer, {
          name: files[i].originalname.replace(/\s+/g, "-"),
        });
      }

      zipStream.finalize();

      const zipPromise = await new Promise<Blob>((resolve, reject) => {
        const chunks: Buffer[] = [];

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

      var accessControlConditions = generateAccessControlConditions(
        process.env.LIT_ACTION_CODE_URL,
        [accessionNumber, ":userAddress"]
      );

      console.log("upload acc", accessControlConditions, userSessionSigs);

      const { ciphertext, dataToEncryptHash } = await fileHelper.encryptFile({
        file: zipPromise,
        sessionSigs: userSessionSigs,
        accessControlConditions: accessControlConditions as any,
      });

      const plainTextFile = new Blob([Buffer.from(ciphertext)], {
        type: "text/plain",
      });
      const uri = await fileHelper.uploadToIpfs(plainTextFile);

      const fileRepository = new FileRepository();

      const indexId = await fileRepository.create({
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
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  async Download(req: Request, res: Response) {
    let {
      accessionNumber,
      userSessionSigs,
      foreignId,
      type,
    }: {
      accessionNumber: string;
      foreignId?: string;
      type?: "user" | "organization";
      userSessionSigs?: SessionSigs;
    } = req.body;

    if (!foreignId || !type || !userSessionSigs) {
      return res
        .status(400)
        .json({ message: "Missing foreignId or type or userSessionSigs" });
    }

    const fileRepository = new FileRepository();

    const file = await fileRepository.findFirst({
      where: {
        accessionNumber,
      },
    });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileHelper = new FileHelper();

    const metadata = await fileHelper.downloadFromIpfs(
      `${process.env.IPFS_SERVER_URL}/ipfs/${file.cid}`
    );

    console.log(
      "download acc",
      generateAccessControlConditions(process.env.LIT_ACTION_CODE_URL, [
        accessionNumber,
        ":userAddress",
      ]),
      typeof userSessionSigs,
      userSessionSigs
    );

    const decryptedFile = await fileHelper.decryptFile({
      ciphertext: metadata,
      dataToEncryptHash: file.dataToEncryptHash,
      sessionSigs: userSessionSigs,
      accessControlConditions: JSON.parse(file.accessControlConditions),
    });

    if (decryptedFile.error) {
      return res.status(decryptedFile.status || 401).json(decryptedFile);
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${file.fileName}`
    );
    res.send(Buffer.from(decryptedFile as any));
  }

  async GrantAccess(req: Request, res: Response) {
    const { wallet, accessionNumber, expiredAtInSeconds } = req.body;

    // check is wallet is valid
    if (!wallet || !accessionNumber) {
      return res
        .status(400)
        .json({ message: "Missing wallet or expiredAtInSeconds" });
    }

    // check user
    const userRepository = new UserRepository();
    const user = await userRepository.findFirst({
      where: {
        wallet,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // check file
    const fileRepository = new FileRepository();
    const file = await fileRepository.findFirst({
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
    const consentRepository = new ConsentRepository();
    const findConsent = await consentRepository.findFirst({
      where: {
        wallet,
        accessionNumber,
      },
    });

    if (!findConsent) {
      const consent = await consentRepository.create({
        data: {
          wallet,
          accessionNumber,
          expiredAt,
        },
      });
      return res.json(consent);
    }

    const consent = await consentRepository.update({
      where: {
        id: findConsent?.id,
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
  }

  async AccessControlCondition(req: Request, res: Response) {
    const { accessionNumber, wallet } = req.query;

    if (!accessionNumber || !wallet) {
      return res
        .status(400)
        .json({ message: "Missing accessionNumber or wallet" });
    }

    const fileRepository = new FileRepository();
    const file = await fileRepository.findFirst({
      where: {
        accessionNumber: accessionNumber as string,
      },
    });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const userRepository = new UserRepository();
    const user = await userRepository.findFirst({
      where: {
        foreignId: file.userId as string,
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

    const consentRepository = new ConsentRepository();
    const consent = await consentRepository.findFirst({
      where: {
        wallet: wallet as string,
        accessionNumber: accessionNumber as string,
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
  }

  async EndDec(req: Request, res: Response) {
    let { userSessionSigs } = req.body;

    try {
      const fileHelper = new FileHelper();
      const { decryptedString } = await fileHelper.encdec(userSessionSigs);
      res.json(decryptedString);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
}
