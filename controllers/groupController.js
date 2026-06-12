const prisma = require("../prismaClient");
const { autoAssignGroups } = require("../utils/autoAssign");

async function getGroupWithProject(groupId) {
    return prisma.group.findUnique({
        where: { id: groupId },
        include: {
            project: true,
            members: true,
        },
    });
}

function isProjectLecturerOrAdmin(req, group) {
    return req.user.role === "ADMIN" ||
        (req.user.role === "LECTURER" && group.project.createdBy === req.user.id);
}

function isGroupLeader(req, group) {
    return req.user.role === "STUDENT" && group.leaderId === req.user.id;
}

function canReviewJoinRequest(req, group) {
    return isProjectLecturerOrAdmin(req, group) || isGroupLeader(req, group);
}

async function ensureStudentCanJoinProject(userId, projectId) {
    const existingMembership = await prisma.groupMember.findFirst({
        where: {
            userId,
            group: { projectId },
        },
    });

    return !existingMembership;
}

async function addMemberToGroup(group, userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (user.role !== "STUDENT") {
        const error = new Error("Only students can be added to project groups");
        error.statusCode = 400;
        throw error;
    }

    if (group.members.length >= group.project.maxMembers) {
        const error = new Error("Group is full");
        error.statusCode = 400;
        throw error;
    }

    const canJoinProject = await ensureStudentCanJoinProject(userId, group.projectId);
    if (!canJoinProject) {
        const error = new Error("Student already joined a group in this project");
        error.statusCode = 400;
        throw error;
    }

    return prisma.groupMember.create({
        data: { groupId: group.id, userId },
        include: { user: { select: { id: true, name: true, email: true } } },
    });
}

exports.createGroup = async (req, res) => {
    try {
        const { name, projectId, gitRepoUrl } = req.body;
        const parsedProjectId = parseInt(projectId);

        if (!name || !parsedProjectId) {
            return res.status(400).json({ error: "name and projectId are required" });
        }

        const project = await prisma.project.findUnique({
            where: { id: parsedProjectId },
            include: { groups: true },
        });
        if (!project) return res.status(404).json({ error: "Project not found" });

        if (req.user.role === "LECTURER" && project.createdBy !== req.user.id) {
            return res.status(403).json({ error: "Lecturers can only create groups in their own projects" });
        }

        if (project.groups.length >= project.maxGroups) {
            return res.status(400).json({ error: "Project reached max groups" });
        }

        const group = await prisma.group.create({
            data: { name, projectId: parsedProjectId, gitRepoUrl: gitRepoUrl || null },
        });
        res.status(201).json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.joinGroup = async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const userId = req.user.id;
        const { message } = req.body;

        const group = await getGroupWithProject(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (group.members.length >= group.project.maxMembers) {
            return res.status(400).json({ error: "Group is full" });
        }

        const canJoinProject = await ensureStudentCanJoinProject(userId, group.projectId);
        if (!canJoinProject) {
            return res.status(400).json({ error: "Student already joined a group in this project" });
        }

        const pendingRequest = await prisma.groupJoinRequest.findFirst({
            where: { groupId, userId, status: "PENDING" },
        });
        if (pendingRequest) {
            return res.status(400).json({ error: "Join request is already pending" });
        }

        const request = await prisma.groupJoinRequest.create({
            data: {
                groupId,
                userId,
                message,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                group: { select: { id: true, name: true, projectId: true } },
            },
        });

        res.status(201).json(request);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.setLeader = async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const parsedUserId = parseInt(req.body.userId);

        if (!parsedUserId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const group = await getGroupWithProject(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!isProjectLecturerOrAdmin(req, group)) {
            return res.status(403).json({ error: "Only the project lecturer or admin can set group leader" });
        }

        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId: parsedUserId } },
        });
        if (!membership) {
            return res.status(400).json({ error: "Leader must be a member of the group" });
        }

        const updatedGroup = await prisma.group.update({
            where: { id: groupId },
            data: { leaderId: parsedUserId },
            include: { leader: { select: { id: true, name: true, email: true } } },
        });

        res.json(updatedGroup);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.autoAssign = async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const result = await autoAssignGroups(projectId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getGroupDetails = async (req, res) => {
    const id = parseInt(req.params.id);
    const group = await prisma.group.findUnique({
        where: { id },
        include: {
            leader: { select: { id: true, name: true } },
            members: { include: { user: { select: { id: true, name: true, email: true, gitUsername: true } } } },
            tasks: { include: { assignee: { select: { id: true, name: true } } } },
            commits: true,
            project: true,
        },
    });
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
};

exports.getJoinRequests = async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const { status } = req.query;

        if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ error: "Invalid status filter" });
        }

        const group = await getGroupWithProject(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canReviewJoinRequest(req, group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can view join requests" });
        }

        const requests = await prisma.groupJoinRequest.findMany({
            where: {
                groupId,
                ...(status ? { status } : {}),
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewer: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.reviewJoinRequest = async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId);
        const { status } = req.body;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
        }

        const joinRequest = await prisma.groupJoinRequest.findUnique({
            where: { id: requestId },
            include: {
                group: {
                    include: {
                        project: true,
                        members: true,
                    },
                },
            },
        });
        if (!joinRequest) return res.status(404).json({ error: "Join request not found" });

        if (joinRequest.status !== "PENDING") {
            return res.status(400).json({ error: "Join request has already been reviewed" });
        }

        if (!canReviewJoinRequest(req, joinRequest.group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can review join requests" });
        }

        let member = null;
        if (status === "APPROVED") {
            member = await addMemberToGroup(joinRequest.group, joinRequest.userId);
        }

        const updatedRequest = await prisma.groupJoinRequest.update({
            where: { id: requestId },
            data: {
                status,
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                reviewer: { select: { id: true, name: true, email: true } },
            },
        });

        res.json({ request: updatedRequest, member });
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

exports.addMember = async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const parsedUserId = parseInt(req.body.userId);
        const makeLeader = Boolean(req.body.makeLeader);

        if (!parsedUserId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const group = await getGroupWithProject(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!isProjectLecturerOrAdmin(req, group)) {
            return res.status(403).json({ error: "Only the project lecturer or admin can add students directly" });
        }

        const member = await addMemberToGroup(group, parsedUserId);

        await prisma.groupJoinRequest.updateMany({
            where: { groupId, userId: parsedUserId, status: "PENDING" },
            data: {
                status: "APPROVED",
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
            },
        });

        let updatedGroup = null;
        if (makeLeader) {
            updatedGroup = await prisma.group.update({
                where: { id: groupId },
                data: { leaderId: parsedUserId },
                include: { leader: { select: { id: true, name: true, email: true } } },
            });
        }

        res.status(201).json({ member, group: updatedGroup });
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

exports.myGroups = async (req, res) => {
    try {
        let groups = [];

        if (req.user.role === "ADMIN") {
            groups = await prisma.group.findMany({
                include: {
                    project: { select: { id: true, title: true, deadline: true } },
                    leader: { select: { id: true, name: true } },
                    members: { include: { user: { select: { id: true, name: true, email: true, gitUsername: true } } } },
                    tasks: true,
                },
                orderBy: { createdAt: "desc" },
            });
        } else if (req.user.role === "LECTURER") {
            groups = await prisma.group.findMany({
                where: { project: { createdBy: req.user.id } },
                include: {
                    project: { select: { id: true, title: true, deadline: true } },
                    leader: { select: { id: true, name: true } },
                    members: { include: { user: { select: { id: true, name: true, email: true, gitUsername: true } } } },
                    tasks: true,
                },
                orderBy: { createdAt: "desc" },
            });
        } else {
            const memberships = await prisma.groupMember.findMany({
                where: { userId: req.user.id },
                include: {
                    group: {
                        include: {
                            project: { select: { id: true, title: true, deadline: true } },
                            leader: { select: { id: true, name: true } },
                            members: { include: { user: { select: { id: true, name: true, email: true, gitUsername: true } } } },
                            tasks: true,
                        },
                    },
                },
                orderBy: { joinedAt: "desc" },
            });
            groups = memberships.map((membership) => membership.group);
        }

        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.groupReport = async (req, res) => {
    const id = parseInt(req.params.id);
    const group = await prisma.group.findUnique({
        where: { id },
        include: {
            members: { include: { user: true } },
            tasks: { include: { documents: true } },
            commits: true,
            gitActivities: true,
            project: true,
        },
    });
    if (!group) return res.status(404).json({ error: "Not found" });
    const canViewReport = isProjectLecturerOrAdmin(req, group) ||
        isGroupLeader(req, group) ||
        group.members.some((member) => member.userId === req.user.id);
    if (!canViewReport) {
        return res.status(403).json({ error: "Only group members, project lecturer or admin can view report" });
    }

    const evaluations = await prisma.evaluation.findMany({
        where: { groupId: id },
        include: { reviewee: { select: { id: true, name: true } } },
    });
    const peerScoreByUser = new Map();
    evaluations.forEach((evaluation) => {
        const current = peerScoreByUser.get(evaluation.revieweeId) || [];
        current.push(evaluation.score);
        peerScoreByUser.set(evaluation.revieweeId, current);
    });

    const report = group.members.map((m) => {
        const tasksAssigned = group.tasks.filter((t) => t.assignedTo === m.userId);
        const todo = tasksAssigned.filter((t) => t.status === "TODO").length;
        const doing = tasksAssigned.filter((t) => t.status === "IN_PROGRESS").length;
        const done = tasksAssigned.filter((t) => t.status === "DONE").length;
        const commits = group.commits.filter((c) => c.authorId === m.userId);
        const gitActivities = group.gitActivities.filter((activity) => activity.userId === m.userId);
        const pushEvents = gitActivities.filter((activity) => activity.type === "PUSH").length;
        const totalLoc = commits.reduce((s, c) => s + c.loc, 0);
        const evidenceCount = tasksAssigned.reduce((sum, task) => sum + task.documents.length, 0);
        const avgProgress = tasksAssigned.length
            ? tasksAssigned.reduce((sum, task) => sum + task.progress, 0) / tasksAssigned.length
            : 0;
        const peerScores = peerScoreByUser.get(m.userId) || [];
        const avgPeerScore = peerScores.length
            ? peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length
            : null;
        const completionRate = tasksAssigned.length ? done / tasksAssigned.length : 0;
        const contributionScore =
            done * 10 +
            doing * 4 +
            avgProgress * 0.15 +
            commits.length * 2 +
            pushEvents * 1 +
            Math.min(totalLoc * 0.01, 15) +
            evidenceCount * 1.5 +
            (avgPeerScore !== null ? avgPeerScore * 2 : 0);

        return {
            userId: m.userId,
            name: m.user.name,
            tasksAssigned: tasksAssigned.length,
            tasksDone: done,
            todo,
            doing,
            done,
            completionRate: parseFloat((completionRate * 100).toFixed(1)),
            avgProgress: parseFloat(avgProgress.toFixed(1)),
            commits: commits.length,
            pushEvents,
            totalLoc,
            evidenceCount,
            avgPeerScore: avgPeerScore !== null ? parseFloat(avgPeerScore.toFixed(2)) : null,
            contributionScore: parseFloat(contributionScore.toFixed(2)),
        };
    });

    const avg = report.reduce((s, r) => s + r.contributionScore, 0) / report.length || 1;
    report.forEach((r) => {
        const reasons = [];
        if (r.contributionScore < avg * 0.5) reasons.push("Điểm đóng góp dưới 50% trung bình nhóm");
        if (r.tasksAssigned > 0 && r.completionRate < 40) reasons.push("Tỷ lệ hoàn thành task thấp");
        if (r.commits === 0) reasons.push("Chưa có commit được ghi nhận");
        if (r.pushEvents === 0) reasons.push("Chưa có push event được ghi nhận");
        if (r.avgPeerScore !== null && r.avgPeerScore < 5) reasons.push("Điểm đánh giá chéo thấp");
        r.lowContribution = reasons.length > 0;
        r.warningReasons = reasons;
    });

    const unmatchedGitActivities = group.gitActivities
        .filter((activity) => !activity.userId)
        .map((activity) => ({
            id: activity.id,
            type: activity.type,
            authorName: activity.authorName,
            authorEmail: activity.authorEmail,
            authorUsername: activity.authorUsername,
            message: activity.message,
            loc: activity.loc,
            occurredAt: activity.occurredAt,
        }));

    res.json({
        groupId: id,
        groupName: group.name,
        projectId: group.projectId,
        projectTitle: group.project.title,
        avgScore: parseFloat(avg.toFixed(2)),
        unmatchedGitActivities,
        report,
    });
};

exports.removeMember = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = parseInt(req.params.userId);

        const group = await getGroupWithProject(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!isProjectLecturerOrAdmin(req, group)) {
            return res.status(403).json({ error: "Only the project lecturer or admin can remove students" });
        }

        await prisma.groupMember.delete({
            where: {
                groupId_userId: { groupId, userId },
            },
        });

        if (group.leaderId === userId) {
            await prisma.group.update({
                where: { id: groupId },
                data: { leaderId: null },
            });
        }

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
