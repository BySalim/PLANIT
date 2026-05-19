import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database…');

  await prisma.user.upsert({
    where: { email: 'admin@ism.edu.sn' },
    update: {},
    create: {
      email: 'admin@ism.edu.sn',
      fullName: 'Admin PLANIT',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
