import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@coastaleats.com' },
    update: {},
    create: {
      email: 'admin@coastaleats.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      timezone: 'America/Los_Angeles',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@coastaleats.com' },
    update: {},
    create: {
      email: 'manager@coastaleats.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Manager',
      role: UserRole.MANAGER,
      timezone: 'America/Los_Angeles',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@coastaleats.com' },
    update: {},
    create: {
      email: 'staff@coastaleats.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Staff',
      role: UserRole.STAFF,
      timezone: 'America/Los_Angeles',
      desiredWeeklyHours: 30,
    },
  });

  console.log('Seed data created:');
  console.log('- Admin:', admin.email);
  console.log('- Manager:', manager.email);
  console.log('- Staff:', staff.email);
  console.log('\nAll users password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
