import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const [manager, waiter, cook] = await Promise.all([
    prisma.user.upsert({
      where: {id: 'seed-manager'},
      update: {},
      create: {id: 'seed-manager', name: 'Alice Manager', password, role: 'manager'},
    }),
    prisma.user.upsert({
      where: {id: 'seed-waiter'},
      update: {},
      create: {id: 'seed-waiter', name: 'Bob Waiter', password, role: 'waiter'},
    }),
    prisma.user.upsert({
      where: {id: 'seed-cook'},
      update: {},
      create: {id: 'seed-cook', name: 'Chloe Cook', password, role: 'cook'},
    }),
  ]);

  await Promise.all([
    prisma.menuItem.upsert({
      where: {id: 'seed-burger'},
      update: {},
      create: {id: 'seed-burger', name: 'Burger végétarien', price: 12.5, category: 'Plats'},
    }),
    prisma.menuItem.upsert({
      where: {id: 'seed-water'},
      update: {},
      create: {id: 'seed-water', name: 'Eau gazeuse', price: 3, category: 'Boissons'},
    }),
    prisma.menuItem.upsert({
      where: {id: 'seed-salad'},
      update: {},
      create: {id: 'seed-salad', name: 'Salade César', price: 9, category: 'Entrées'},
    }),
  ]);

  console.log('Seed terminé :', {
    manager: manager.id,
    waiter: waiter.id,
    cook: cook.id,
  });
  console.log('Mot de passe (en clair, dev uniquement) pour ces 3 comptes : password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
