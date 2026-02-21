import { PrismaClient } from "@prisma/client";

// PrismaClient hanterar anslutningen till PostgreSQL.
// Vi skapar EN instans och återanvänder den (Singleton-mönster).

const prisma = new PrismaClient();

export default prisma;
