import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { FREE_MODELS } from '../src/config/freeModels.js';

const prisma = new PrismaClient();

async function main() {
  console.log(`Syncing ${FREE_MODELS.length} verified multi-provider models to database...`);
  for (const model of FREE_MODELS) {
    const result = await prisma.model.upsert({
      where: { modelId: model.modelId },
      update: { name: model.name, provider: model.provider },
      create: {
        name: model.name,
        provider: model.provider,
        modelId: model.modelId,
        elo: 1000,
        wins: 0,
        losses: 0,
        ties: 0,
        totalBattles: 0
      }
    });
    console.log(`✓ Upserted: [${result.provider}] ${result.name} (ID: ${result.id})`);
  }
  const allInDb = await prisma.model.findMany();
  console.log(`Total models now in database: ${allInDb.length}`);
}

main()
  .catch((e) => {
    console.error("Error during model sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
