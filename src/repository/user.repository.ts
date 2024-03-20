import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export default class UserRepository {
  findFirst = async (args: Prisma.UserFindFirstArgs<DefaultArgs>) => {
    const user = await prisma.user.findFirst(args);
    return user;
  };

  create = async (args: Prisma.UserCreateArgs<DefaultArgs>) => {
    const user = await prisma.user.create(args);
    return user;
  };
}
