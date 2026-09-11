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

  // Photos locales : servies par le nginx du frontend depuis
  // frontend/public/menu/ (chemin relatif, même origine). Photo de la
  // Salade César récupérée sur l'API publique TheMealDB (pas de résultat
  // "Caesar" exact, un plat de salade au poulet proche a été choisi).
  const menuItems = [
    {
      id: 'seed-burger',
      name: 'Burger végétarien',
      price: 12.5,
      category: 'Plats',
      imageUrl: '/menu/burger-vegetarien.jpg',
    },
    {
      id: 'seed-water',
      name: 'Eau gazeuse',
      price: 3,
      category: 'Boissons',
      imageUrl: '/menu/eau-gazeuse.webp',
    },
    {
      id: 'seed-salad',
      name: 'Salade César',
      price: 9,
      category: 'Entrées',
      imageUrl: 'https://www.themealdb.com/images/media/meals/k29viq1585565980.jpg',
    },
    {
      id: 'seed-burger-gourmet',
      name: 'Burger gourmet bacon-cheddar',
      price: 15,
      category: 'Plats',
      imageUrl: '/menu/burger-gourmet.jpg',
    },
    {
      id: 'seed-burger-poulet',
      name: 'Burger poulet',
      price: 13.5,
      category: 'Plats',
      imageUrl: '/menu/burger-poulet.jpg',
    },
    {
      id: 'seed-burger-frites',
      name: 'Burger maison & frites',
      price: 14,
      category: 'Plats',
      imageUrl: '/menu/burger-frites.jpg',
    },
    {
      id: 'seed-tacos-boeuf',
      name: 'Tacos bœuf',
      price: 11,
      category: 'Plats',
      imageUrl: '/menu/tacos-boeuf.jpg',
    },
    {
      id: 'seed-mini-tacos',
      name: 'Mini tacos',
      price: 7,
      category: 'Entrées',
      imageUrl: '/menu/mini-tacos.jpg',
    },
  ];

  await Promise.all(
    menuItems.map(({id, ...data}) =>
      prisma.menuItem.upsert({where: {id}, update: data, create: {id, ...data}}),
    ),
  );

  console.log('Seed terminé :', {
    manager: manager.id,
    waiter: waiter.id,
    cook: cook.id,
    menuItems: menuItems.length,
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
