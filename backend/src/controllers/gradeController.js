const prisma = require("../prismaClient");

async function getProjectForGrading(projectId) {
    return prisma.project.findUnique({
        where: { id: projectId },
        include: {
            groups: {
                include: {
                    members: { include: { user: { select: { id: true, name: true, email: true } } } },
                    tasks: true,
                    commits: true,
                },
            },
        },
    });
}

function canGradeProject(req, project) {
    return req.user.role === "ADMIN" ||
        (req.user.role === "LECTURER" && project.createdBy === req.user.id);
}

async function buildStudentGradeRows(project) {
    const members = project.groups.flatMap((group) =>
        group.members.map((member) => ({
            group,
            user: member.user,
        }))
    );
    const userIds = [...new Set(members.map((member) => member.user.id))];
    const groupIds = project.groups.map((group) => group.id);

    const [finalGrades, evaluations] = await Promise.all([
        prisma.finalGrade.findMany({ where: { projectId: project.id } }),
        prisma.evaluation.findMany({
            where: { groupId: { in: groupIds } },
        }),
    ]);

    const gradesByUser = new Map(finalGrades.map((grade) => [grade.userId, grade]));
    const peerScoresByUser = new Map();
    evaluations.forEach((evaluation) => {
        const scores = peerScoresByUser.get(evaluation.revieweeId) || [];
        scores.push(evaluation.score);
        peerScoresByUser.set(evaluation.revieweeId, scores);
    });

    return userIds.map((userId) => {
        const membership = members.find((item) => item.user.id === userId);
        const group = membership.group;
        const userTasks = group.tasks.filter((task) => task.assignedTo === userId);
        const userCommits = group.commits.filter((commit) => commit.authorId === userId);
        const peerScores = peerScoresByUser.get(userId) || [];
        const avgPeerScore = peerScores.length
            ? peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length
            : null;

        return {
            user: membership.user,
            group: { id: group.id, name: group.name },
            taskStats: {
                total: userTasks.length,
                done: userTasks.filter((task) => task.status === "DONE").length,
                avgProgress: userTasks.length
                    ? parseFloat((userTasks.reduce((sum, task) => sum + task.progress, 0) / userTasks.length).toFixed(1))
                    : 0,
            },
            commitStats: {
                commits: userCommits.length,
                totalLoc: userCommits.reduce((sum, commit) => sum + commit.loc, 0),
            },
            avgPeerScore: avgPeerScore !== null ? parseFloat(avgPeerScore.toFixed(2)) : null,
            finalGrade: gradesByUser.get(userId) || null,
        };
    });
}

exports.gradeStudent = async (req, res) => {
    try {
        const { userId, projectId, score, comment } = req.body;
        const parsedUserId = parseInt(userId);
        const parsedProjectId = parseInt(projectId);
        const parsedScore = Number(score);

        if (!parsedUserId || !parsedProjectId || Number.isNaN(parsedScore)) {
            return res.status(400).json({ error: "userId, projectId and score are required" });
        }

        if (parsedScore < 0 || parsedScore > 10) {
            return res.status(400).json({ error: "Score must be between 0 and 10" });
        }

        const project = await getProjectForGrading(parsedProjectId);
        if (!project) return res.status(404).json({ error: "Project not found" });
        if (!canGradeProject(req, project)) {
            return res.status(403).json({ error: "Only project lecturer or admin can grade students" });
        }

        const isProjectMember = project.groups.some((group) =>
            group.members.some((member) => member.userId === parsedUserId)
        );
        if (!isProjectMember) {
            return res.status(400).json({ error: "Student is not a member of this project" });
        }

        const existing = await prisma.finalGrade.findFirst({
            where: { userId: parsedUserId, projectId: parsedProjectId },
        });

        const grade = existing
            ? await prisma.finalGrade.update({
                where: { id: existing.id },
                data: { score: parsedScore, comment },
            })
            : await prisma.finalGrade.create({
                data: {
                    userId: parsedUserId,
                    projectId: parsedProjectId,
                    score: parsedScore,
                    comment,
                    createdBy: req.user.id,
                },
            });

        res.json(grade);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProjectGrades = async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const project = await getProjectForGrading(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });
        if (!canGradeProject(req, project)) {
            return res.status(403).json({ error: "Only project lecturer or admin can view project grades" });
        }

        const rows = await buildStudentGradeRows(project);
        res.json({
            project: {
                id: project.id,
                title: project.title,
                deadline: project.deadline,
            },
            rows,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getStudentFinal = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const projectId = req.query.projectId ? parseInt(req.query.projectId) : null;

        if (req.user.role === "STUDENT" && req.user.id !== userId) {
            return res.status(403).json({ error: "Students can only view their own final grade" });
        }

        const finalWhere = { userId, ...(projectId ? { projectId } : {}) };
        let evalWhere = { revieweeId: userId };

        if (req.user.role === "LECTURER" && projectId) {
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (!project) return res.status(404).json({ error: "Project not found" });
            if (project.createdBy !== req.user.id) {
                return res.status(403).json({ error: "Only project lecturer can view this grade" });
            }
        }

        if (projectId) {
            const groups = await prisma.group.findMany({
                where: { projectId },
                select: { id: true },
            });
            evalWhere = {
                revieweeId: userId,
                groupId: { in: groups.map((group) => group.id) },
            };
        }

        const evals = await prisma.evaluation.findMany({ where: evalWhere });
        const avgPeer = evals.reduce((s, e) => s + e.score, 0) / (evals.length || 1);
        const final = await prisma.finalGrade.findFirst({ where: finalWhere });

        res.json({
            avgPeerScore: avgPeer.toFixed(2),
            finalGrade: final,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
