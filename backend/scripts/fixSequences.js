require("dotenv").config();
const prisma = require("../src/prismaClient");

const tables = [
    "User",
    "Project",
    "Group",
    "GroupMember",
    "GroupJoinRequest",
    "Task",
    "Document",
    "Warning",
    "FinalGrade",
    "Commit",
    "GitActivity",
    "Evaluation",
    "ChatMessage",
];

async function resetSequence(table) {
    const sequence = `${table}_id_seq`;
    await prisma.$executeRawUnsafe(`
        SELECT setval(
            pg_get_serial_sequence('"${table}"', 'id'),
            COALESCE((SELECT MAX("id") FROM "${table}"), 0) + 1,
            false
        )
    `);
    console.log(`Reset ${sequence}`);
}

async function main() {
    for (const table of tables) {
        await resetSequence(table);
    }
    console.log("All id sequences are aligned.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
