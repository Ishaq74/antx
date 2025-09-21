import prisma from "../src/lib/prisma";

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("Connexion à PostgreSQL réussie !");
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Erreur de connexion à PostgreSQL :", error);
    process.exit(1);
  }
}

testConnection();
