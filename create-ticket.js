
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // 1. Create a new ticket
  const ticket = await prisma.ticket.create({
    data: {
      title: "Cannot Login",
      description: "Demo User cannot log in to the system",
      priority: "HIGH",

      // Connect to existing User
      createdBy: {
        connect: {
          email: "demo@example.com",
        },
      },

      // Connect to existing Category
      category: {
        connect: {
          name: "Login Problem",
        },
      },
    },

    // 2. Return ticket with related data
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      createdById: true,
      categoryId: true,
      createdBy: {
        select: {
          name: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  // 3. Display result
  console.log("Ticket created successfully!");
  console.log(JSON.stringify(ticket, null, 2));
}

main()
  .catch((error) => {
    console.error("Error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
