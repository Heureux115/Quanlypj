const prisma = require("../prismaClient");

exports.studentDashboard = async (req, res) => {
    try {
        const memberships = await prisma.groupMember.findMany({
            where: { userId: req.user.id },
            include: {
                group: {
                    include: {
                        project: { select: { id: true, title: true, deadline: true } },
                        leader: { select: { id: true, name: true } },
                        members: true,
                    },
                },
            },
        });

        const groupIds = memberships.map((membership) => membership.groupId);
        const tasks = await prisma.task.findMany({
            where: { assignedTo: req.user.id },
            orderBy: { deadline: "asc" },
        });
        const pendingJoinRequests = await prisma.groupJoinRequest.count({
            where: { userId: req.user.id, status: "PENDING" },
        });
        const documents = await prisma.document.count({
            where: { uploadedBy: req.user.id },
        });

        const taskStats = {
            total: tasks.length,
            todo: tasks.filter((task) => task.status === "TODO").length,
            inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
            done: tasks.filter((task) => task.status === "DONE").length,
            overdue: tasks.filter((task) => task.status === "OVERDUE").length,
        };

        res.json({
            role: "STUDENT",
            projects: memberships.map((membership) => membership.group.project),
            groups: memberships.map((membership) => membership.group),
            groupIds,
            taskStats,
            upcomingTasks: tasks.slice(0, 5),
            pendingJoinRequests,
            documents,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.lecturerDashboard = async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            where: { createdBy: req.user.id },
            include: {
                groups: {
                    include: {
                        members: true,
                        tasks: true,
                        joinRequests: { where: { status: "PENDING" } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const groups = projects.flatMap((project) => project.groups);
        const tasks = groups.flatMap((group) => group.tasks);
        const pendingJoinRequests = groups.reduce((sum, group) => sum + group.joinRequests.length, 0);

        res.json({
            role: "LECTURER",
            projectCount: projects.length,
            groupCount: groups.length,
            studentSlotsUsed: groups.reduce((sum, group) => sum + group.members.length, 0),
            pendingJoinRequests,
            taskStats: {
                total: tasks.length,
                done: tasks.filter((task) => task.status === "DONE").length,
                inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
                overdue: tasks.filter((task) => task.status === "OVERDUE").length,
            },
            recentProjects: projects.slice(0, 5).map((project) => ({
                id: project.id,
                title: project.title,
                deadline: project.deadline,
                groups: project.groups.length,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.adminDashboard = async (req, res) => {
    try {
        const [users, accountStatuses, projects, groups, tasks, warnings] = await Promise.all([
            prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
            prisma.user.groupBy({ by: ["status"], _count: { status: true } }),
            prisma.project.count(),
            prisma.group.count(),
            prisma.task.count(),
            prisma.warning.count(),
        ]);

        const userStats = users.reduce((stats, item) => {
            stats[item.role] = item._count.role;
            return stats;
        }, {});
        const statusStats = accountStatuses.reduce((stats, item) => {
            stats[item.status] = item._count.status;
            return stats;
        }, {});

        res.json({
            role: "ADMIN",
            userStats,
            statusStats,
            projectCount: projects,
            groupCount: groups,
            taskCount: tasks,
            warningCount: warnings,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
