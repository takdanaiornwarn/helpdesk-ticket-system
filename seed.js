
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // 1. Get test password
  const password = process.env.SEED_USER_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("Set SEED_USER_PASSWORD (min 12 characters)");
  }

  // 2. Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Create test user
  const user = await prisma.user.upsert({
    where: {
      email: "demo@example.com",
    },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@example.com",
      passwordHash: passwordHash,
      role: "USER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("User:", user);

  // 4. Create categories
  const categoryNames = [
    "Login Problem",
    "Internet Problem",
    "Hardware Problem",
  ];

  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    console.log("Category:", category);
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((error) => {
    console.error("Seed error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
