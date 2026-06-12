const prisma = require("../prismaClient");

/**
 * Tự động phân nhóm: chia đều sinh viên chưa có nhóm vào các nhóm của project.
 */
async function autoAssignGroups(projectId) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { groups: { include: { members: true } } },
    });
    if (!project) throw new Error("Project not found");

    // Tìm tất cả sinh viên chưa tham gia nhóm nào trong project này
    const studentsInProject = await prisma.groupMember.findMany({
        where: { group: { projectId } },
        select: { userId: true },
    });
    const joinedIds = studentsInProject.map((m) => m.userId);

    const freeStudents = await prisma.user.findMany({
        where: { role: "STUDENT", id: { notIn: joinedIds } },
    });

    const groups = project.groups;
    if (groups.length === 0) throw new Error("No groups available");

    // Round-robin
    let idx = 0;
    for (const student of freeStudents) {
        const target = groups[idx % groups.length];
        if (target.members.length < project.maxMembers) {
            await prisma.groupMember.create({
                data: { groupId: target.id, userId: student.id },
            });
            target.members.push({ userId: student.id });
        }
        idx++;
    }

    return { assigned: freeStudents.length };
}

module.exports = { autoAssignGroups };