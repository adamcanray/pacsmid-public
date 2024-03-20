import axios from "axios";
import lit, {
  DecryptFileDto,
  EncryptFileDto,
  ZipEncryptFilesDto,
} from "../lib/lit";

export default class FileHelper {
  async zipAndEncryptFiles(zipEncryptFilesDto: ZipEncryptFilesDto) {
    return await lit.zipAndEncryptFiles({ ...zipEncryptFilesDto });
  }

  async encryptFile(encryptFileDto: EncryptFileDto) {
    return await lit.encryptFile({ ...encryptFileDto });
  }

  async decryptFile(decryptFileDto: DecryptFileDto) {
    return await lit.decryptFile({ ...decryptFileDto });
  }

  async uploadToIpfs(data: any) {
    // const storage = new TWStorage(process.env.THIRDWEB_SECRET_KEY);
    // return await storage.uploadToIpfs(data);

    // private ipfs
    try {
      const formData = new FormData();
      formData.append("data", data);
      const ipfsServerApiUrl = `${
        process.env.IPFS_SERVER_URL + ":5001"
      }/api/v0/add`;
      const res = await axios.post(ipfsServerApiUrl, formData, {});

      const resData = res.data;

      return resData.Hash;
    } catch (error: any) {
      console.log("uploadToIpfs error: ", error, error.response);
      return null;
    }
  }

  async downloadFromIpfs(uri: string) {
    // private ipfs
    try {
      const ipfsServerUrl = `${uri}`;
      const res = await axios.get(ipfsServerUrl, {});
      return res.data;
    } catch (error: any) {
      console.log("downloadFromIpfs error: ", error, error.response);
    }
  }

  async encdec(sessionSigs: any) {
    return await lit.encdec(sessionSigs);
  }
}
