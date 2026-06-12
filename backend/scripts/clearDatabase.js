require("dotenv").config();
const prisma = require("../src/prismaClient");

const tables = [
    "ChatMessage",
    "Evaluation",
    "Commit",
    "GitActivity",
    "Document",
    "Task",
    "GroupJoinRequest",
    "GroupMember",
    "Warning",
    "FinalGrade",
    "Group",
    "Project",
    "User",
];

async function main() {
    const quotedTables = tables.map((table) => `"${table}"`).join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
    console.log("Database data cleared. Schema and migrations were kept.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
