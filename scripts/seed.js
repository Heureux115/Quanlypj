require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../prismaClient");

const PASSWORD = "123456";

function daysFromNow(days) {
    return new Date(Date.now() + 1000 * 60 * 60 * 24 * days);
}

function daysAgo(days) {
    return new Date(Date.now() - 1000 * 60 * 60 * 24 * days);
}

async function resetDatabaseKeepAdmin(hashedPassword) {
    await prisma.chatMessage.deleteMany();
    await prisma.evaluation.deleteMany();
    await prisma.commit.deleteMany();
    await prisma.gitActivity.deleteMany();
    await prisma.document.deleteMany();
    await prisma.task.deleteMany();
    await prisma.groupJoinRequest.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.warning.deleteMany();
    await prisma.finalGrade.deleteMany();
    await prisma.group.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } });

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount === 0) {
        await prisma.user.create({
            data: {
                name: "Admin ITSS",
                email: "admin@itss.local",
                password: hashedPassword,
                role: "ADMIN",
                status: "ACTIVE",
            },
        });
    } else {
        await prisma.user.updateMany({
            where: { role: "ADMIN" },
            data: {
                password: hashedPassword,
                status: "ACTIVE",
            },
        });
    }
}

async function createUser({ name, email, role, gitUsername, status = "ACTIVE", avatarUrl = null }, hashedPassword) {
    return prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            role,
            status,
            gitUsername,
            avatarUrl,
        },
    });
}

async function addMember(groupId, userId) {
    return prisma.groupMember.create({ data: { groupId, userId } });
}

async function createTask({ title, description, groupId, assignedTo, status, progress, deadlineDays }) {
    return prisma.task.create({
        data: {
            title,
            description,
            groupId,
            assignedTo,
            status,
            progress,
            deadline: daysFromNow(deadlineDays),
        },
    });
}

async function createCommitAndActivity({ hash, groupId, user, message, loc, days }) {
    await prisma.commit.create({
        data: {
            hash,
            message,
            loc,
            authorId: user.id,
            groupId,
            committedAt: daysAgo(days),
        },
    });

    await prisma.gitActivity.create({
        data: {
            type: "COMMIT",
            externalId: `seed:commit:${hash}`,
            groupId,
            userId: user.id,
            authorName: user.name,
            authorEmail: user.email,
            authorUsername: user.gitUsername,
            message,
            loc,
            occurredAt: daysAgo(days),
            metadata: JSON.stringify({ source: "seed" }),
        },
    });
}

async function main() {
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    await resetDatabaseKeepAdmin(hashedPassword);

    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { id: "asc" } });

    const lecturer = await createUser({
        name: "Giảng viên Nguyễn Minh",
        email: "lecturer@itss.local",
        role: "LECTURER",
        gitUsername: "lecturer-demo",
    }, hashedPassword);

    await createUser({
        name: "Giảng viên Chờ Duyệt",
        email: "lecturer.pending@itss.local",
        role: "LECTURER",
        status: "PENDING",
        gitUsername: "pending-lecturer",
    }, hashedPassword);

    const students = await Promise.all([
        createUser({ name: "Nguyễn An", email: "student1@itss.local", role: "STUDENT", gitUsername: "student1" }, hashedPassword),
        createUser({ name: "Trần Bình", email: "student2@itss.local", role: "STUDENT", gitUsername: "student2" }, hashedPassword),
        createUser({ name: "Lê Chi", email: "student3@itss.local", role: "STUDENT", gitUsername: "student3" }, hashedPassword),
        createUser({ name: "Phạm Dũng", email: "student4@itss.local", role: "STUDENT", gitUsername: "student4" }, hashedPassword),
        createUser({ name: "Hoàng Em", email: "student5@itss.local", role: "STUDENT", gitUsername: "student5" }, hashedPassword),
        createUser({ name: "Võ Gia Hân", email: "student6@itss.local", role: "STUDENT", gitUsername: null }, hashedPassword),
    ]);

    const projectA = await prisma.project.create({
        data: {
            title: "Hệ thống quản lý nhóm dự án",
            description: "Dự án mẫu để test tạo nhóm, xin vào nhóm, giao task, chat, Git report và chấm điểm.",
            maxGroups: 4,
            maxMembers: 4,
            criteria: JSON.stringify([
                { name: "Hoàn thành task", weight: 35 },
                { name: "Đóng góp Git", weight: 30 },
                { name: "Minh chứng tài liệu", weight: 15 },
                { name: "Đánh giá chéo", weight: 20 },
            ]),
            deadline: daysFromNow(28),
            createdBy: lecturer.id,
        },
    });

    const projectB = await prisma.project.create({
        data: {
            title: "Website bán sách học thuật",
            description: "Dự án phụ để test danh sách dự án, tạo nhóm và lọc dữ liệu.",
            maxGroups: 3,
            maxMembers: 5,
            criteria: JSON.stringify([
                { name: "UI/UX", weight: 30 },
                { name: "Backend API", weight: 35 },
                { name: "Báo cáo", weight: 35 },
            ]),
            deadline: daysFromNow(35),
            createdBy: lecturer.id,
        },
    });

    const groupAlpha = await prisma.group.create({
        data: {
            name: "Nhóm Alpha",
            projectId: projectA.id,
            leaderId: students[0].id,
            gitRepoUrl: "https://github.com/demo-itss/project-alpha",
        },
    });
    const groupBeta = await prisma.group.create({
        data: {
            name: "Nhóm Beta",
            projectId: projectA.id,
            leaderId: students[3].id,
            gitRepoUrl: "https://github.com/demo-itss/project-beta",
        },
    });
    const groupGamma = await prisma.group.create({
        data: {
            name: "Nhóm Gamma",
            projectId: projectB.id,
            leaderId: null,
            gitRepoUrl: null,
        },
    });

    await Promise.all([
        addMember(groupAlpha.id, students[0].id),
        addMember(groupAlpha.id, students[1].id),
        addMember(groupAlpha.id, students[2].id),
        addMember(groupBeta.id, students[3].id),
        addMember(groupBeta.id, students[4].id),
    ]);

    await prisma.groupJoinRequest.create({
        data: {
            groupId: groupAlpha.id,
            userId: students[5].id,
            status: "PENDING",
            message: "Em muốn xin vào nhóm Alpha để phụ phần kiểm thử và báo cáo.",
        },
    });

    await prisma.groupJoinRequest.create({
        data: {
            groupId: groupBeta.id,
            userId: students[2].id,
            status: "REJECTED",
            message: "Em muốn chuyển nhóm.",
            reviewedBy: lecturer.id,
            reviewedAt: daysAgo(1),
        },
    });

    const taskA1 = await createTask({
        title: "Thiết kế database",
        description: "Hoàn thiện schema, migration và seed data.",
        groupId: groupAlpha.id,
        assignedTo: students[0].id,
        status: "DONE",
        progress: 100,
        deadlineDays: 3,
    });
    const taskA2 = await createTask({
        title: "Xây dựng dashboard",
        description: "Hiển thị tổng quan project, nhóm, task và báo cáo.",
        groupId: groupAlpha.id,
        assignedTo: students[1].id,
        status: "IN_PROGRESS",
        progress: 65,
        deadlineDays: 7,
    });
    const taskA3 = await createTask({
        title: "Viết báo cáo cuối kỳ",
        description: "Tổng hợp quy trình, chức năng và minh chứng đóng góp.",
        groupId: groupAlpha.id,
        assignedTo: students[2].id,
        status: "TODO",
        progress: 0,
        deadlineDays: 14,
    });
    await createTask({
        title: "Kiểm thử luồng xin vào nhóm",
        description: "Test request, approve, reject và thông báo.",
        groupId: groupAlpha.id,
        assignedTo: students[0].id,
        status: "OVERDUE",
        progress: 40,
        deadlineDays: -2,
    });

    await createTask({
        title: "Thiết kế giao diện Kanban",
        description: "Tạo board task kéo thả cho nhóm trưởng.",
        groupId: groupBeta.id,
        assignedTo: students[3].id,
        status: "IN_PROGRESS",
        progress: 50,
        deadlineDays: 5,
    });
    await createTask({
        title: "Tích hợp GitHub API",
        description: "Đồng bộ commit, push và commit chưa xác định tác giả.",
        groupId: groupBeta.id,
        assignedTo: students[4].id,
        status: "TODO",
        progress: 10,
        deadlineDays: 9,
    });

    await prisma.document.createMany({
        data: [
            {
                fileName: "Database schema",
                fileUrl: "https://example.com/schema.pdf",
                taskId: taskA1.id,
                uploadedBy: students[0].id,
            },
            {
                fileName: "Dashboard screenshot",
                fileUrl: "https://example.com/dashboard.png",
                taskId: taskA2.id,
                uploadedBy: students[1].id,
            },
            {
                fileName: "Report draft",
                fileUrl: "https://example.com/report.docx",
                taskId: taskA3.id,
                uploadedBy: students[2].id,
            },
        ],
    });

    await createCommitAndActivity({
        hash: "seed-alpha-001",
        groupId: groupAlpha.id,
        user: students[0],
        message: "init prisma schema",
        loc: 220,
        days: 6,
    });
    await createCommitAndActivity({
        hash: "seed-alpha-002",
        groupId: groupAlpha.id,
        user: students[1],
        message: "add dashboard cards",
        loc: 180,
        days: 4,
    });
    await createCommitAndActivity({
        hash: "seed-beta-001",
        groupId: groupBeta.id,
        user: students[3],
        message: "build kanban layout",
        loc: 140,
        days: 3,
    });

    await prisma.gitActivity.createMany({
        data: [
            {
                type: "PUSH",
                externalId: `seed:push:${groupAlpha.id}:001`,
                groupId: groupAlpha.id,
                userId: students[0].id,
                authorUsername: students[0].gitUsername,
                message: "Push 2 commit(s)",
                loc: 0,
                occurredAt: daysAgo(5),
                metadata: JSON.stringify({ source: "seed", size: 2 }),
            },
            {
                type: "COMMIT",
                externalId: `seed:unmatched:${groupAlpha.id}:001`,
                groupId: groupAlpha.id,
                userId: null,
                authorName: "Unknown Contributor",
                authorEmail: "unknown@example.com",
                authorUsername: "unknown-dev",
                message: "commit chưa xác định tác giả",
                loc: 75,
                occurredAt: daysAgo(2),
                metadata: JSON.stringify({ source: "seed", unmatched: true }),
            },
            {
                type: "PUSH",
                externalId: `seed:push:${groupBeta.id}:001`,
                groupId: groupBeta.id,
                userId: students[3].id,
                authorUsername: students[3].gitUsername,
                message: "Push 1 commit(s)",
                loc: 0,
                occurredAt: daysAgo(2),
                metadata: JSON.stringify({ source: "seed", size: 1 }),
            },
        ],
    });

    await prisma.evaluation.createMany({
        data: [
            { reviewerId: students[0].id, revieweeId: students[1].id, groupId: groupAlpha.id, score: 8.5, comment: "Làm dashboard tốt." },
            { reviewerId: students[1].id, revieweeId: students[0].id, groupId: groupAlpha.id, score: 9, comment: "Điều phối nhóm tốt." },
            { reviewerId: students[2].id, revieweeId: students[0].id, groupId: groupAlpha.id, score: 8, comment: "Hỗ trợ kỹ thuật tốt." },
            { reviewerId: students[0].id, revieweeId: students[2].id, groupId: groupAlpha.id, score: 5, comment: "Cần cập nhật tiến độ thường xuyên hơn." },
        ],
    });

    await prisma.warning.create({
        data: {
            userId: students[2].id,
            groupId: groupAlpha.id,
            note: "Tiến độ task và commit đang thấp hơn trung bình nhóm.",
            createdBy: lecturer.id,
        },
    });

    await prisma.finalGrade.createMany({
        data: [
            { userId: students[0].id, projectId: projectA.id, score: 9, comment: "Nhóm trưởng đóng góp tốt.", createdBy: lecturer.id },
            { userId: students[1].id, projectId: projectA.id, score: 8.5, comment: "Hoàn thành tốt phần dashboard.", createdBy: lecturer.id },
            { userId: students[2].id, projectId: projectA.id, score: 6.5, comment: "Cần bổ sung minh chứng và commit.", createdBy: lecturer.id },
        ],
    });

    await prisma.chatMessage.createMany({
        data: [
            { groupId: groupAlpha.id, senderId: students[0].id, content: "Mọi người cập nhật tiến độ task trước 21h nhé." },
            { groupId: groupAlpha.id, senderId: students[1].id, content: "Mình đã đẩy phần dashboard, nhờ review giúp." },
            { groupId: groupAlpha.id, senderId: students[2].id, content: "Mình đang viết draft báo cáo." },
            { groupId: groupBeta.id, senderId: students[3].id, content: "Nhóm Beta bắt đầu làm Kanban hôm nay." },
        ],
    });

    console.log("Database reset and seed completed.");
    console.log("All seeded passwords: 123456");
    console.log("Accounts:");
    console.log(`- Admin kept/reset: ${admin.email} / 123456`);
    console.log("- lecturer@itss.local / 123456");
    console.log("- lecturer.pending@itss.local / 123456");
    console.log("- student1@itss.local ... student6@itss.local / 123456");
    console.log(`Project A: ${projectA.id}, Alpha group: ${groupAlpha.id}, Beta group: ${groupBeta.id}`);
    console.log(`Project B: ${projectB.id}, Gamma group: ${groupGamma.id}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
