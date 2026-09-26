import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { FREE_MODELS } from '../src/config/freeModels.js';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding verified models for Groq & Google AI...");
  await prisma.battle.deleteMany();
  await prisma.model.deleteMany();
  for (const model of FREE_MODELS) {
    await prisma.model.upsert({
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
  }
  console.log("Successfully seeded models!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
