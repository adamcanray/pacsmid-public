import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export default class LoginRequestRepository {
  findFirst = async (args: Prisma.LoginRequestFindFirstArgs<DefaultArgs>) => {
    const loginRequest = await prisma.loginRequest.findFirst(args);
    return loginRequest;
  };

  create = async (args: Prisma.LoginRequestCreateArgs<DefaultArgs>) => {
    const loginRequest = await prisma.loginRequest.create(args);
    return loginRequest;
  };

  update = async (args: Prisma.LoginRequestUpdateArgs<DefaultArgs>) => {
    const loginRequest = await prisma.loginRequest.update(args);
    return loginRequest;
  };

  delete = async (args: Prisma.LoginRequestDeleteArgs<DefaultArgs>) => {
    const loginRequest = await prisma.loginRequest.delete(args);
    return loginRequest;
  };
}
