import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export default class FileRepository {
  findFirst = async (args: Prisma.FileFindFirstArgs<DefaultArgs>) => {
    const file = await prisma.file.findFirst(args);
    return file;
  };

  create = async (args: Prisma.FileCreateArgs<DefaultArgs>) => {
    const file = await prisma.file.create(args);
    return file;
  };
}
