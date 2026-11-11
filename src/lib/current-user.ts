import { prisma } from './prisma';

export async function getActiveUser() {
  const phone = process.env.MY_PHONE_NUMBER
    ? process.env.MY_PHONE_NUMBER.replace(/[^0-9]/g, '')
    : '6281234567890';

  let user = await prisma.user.findFirst({
    include: { wallets: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber: phone,
        name: process.env.DEFAULT_USER_NAME || 'Owner',
        language: 'id',
        wallets: {
          create: [
            { name: 'BCA', type: 'BANK', balance: 5000000, colorCode: '#00529C' },
            { name: 'Mandiri', type: 'BANK', balance: 3500000, colorCode: '#0A3B72' },
            { name: 'GoPay', type: 'EWALLET', balance: 350000, colorCode: '#00AED6' },
            { name: 'Tunai', type: 'CASH', balance: 250000, colorCode: '#10B981' },
          ],
        },
      },
      include: { wallets: true },
    });
  }

  return user;
}
