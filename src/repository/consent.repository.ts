import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export default class ConsentRepository {
  findFirst = async (args: Prisma.ConsentFindFirstArgs<DefaultArgs>) => {
    const consent = await prisma.consent.findFirst(args);
    return consent;
  };

  create = async (args: Prisma.ConsentCreateArgs<DefaultArgs>) => {
    const consent = await prisma.consent.create(args);
    return consent;
  };

  update = async (args: Prisma.ConsentUpdateArgs<DefaultArgs>) => {
    const consent = await prisma.consent.update(args);
    return consent;
  };
}
