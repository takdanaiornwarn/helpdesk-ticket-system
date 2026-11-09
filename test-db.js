
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

// Create Prisma Client
const prisma = new PrismaClient();

// Test Database Connection
async function main() {
  // Connect to PostgreSQL
  await prisma.$connect();

  console.log("Database connected successfully!");

  // Get all users from database
  const users = await prisma.user.findMany();

  console.log("Users:", users);
  console.log("Total users:", users.length);
}

// Run function
main()
  .catch((error) => {
    console.error("Database error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
