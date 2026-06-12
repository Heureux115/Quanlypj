    const prisma = require("../prismaClient");

    // Thành viên đánh giá chéo
    exports.createEvaluation = async (req, res) => {
        try {
            const { revieweeId, groupId, score, comment } = req.body;
            const ev = await prisma.evaluation.upsert({
                where: {
                    reviewerId_revieweeId_groupId: {
                        reviewerId: req.user.id,
                        revieweeId,
                        groupId,
                    },
                },
                update: { score, comment },
                create: {
                    reviewerId: req.user.id,
                    revieweeId,
                    groupId,
                    score,
                    comment,
                },
            });
            res.json(ev);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    // Phân tích đóng góp theo đánh giá chéo
    exports.analyzeGroup = async (req, res) => {
        const groupId = parseInt(req.params.groupId);
        const evs = await prisma.evaluation.findMany({
            where: { groupId },
            include: { reviewee: { select: { id: true, name: true } } },
        });

        const map = {};
        evs.forEach((e) => {
            const uid = e.revieweeId;
            if (!map[uid]) map[uid] = { name: e.reviewee.name, scores: [] };
            map[uid].scores.push(e.score);
        });

        const result = Object.entries(map).map(([uid, v]) => {
            const avg = v.scores.reduce((a, b) => a + b, 0) / v.scores.length;
            return {
                userId: parseInt(uid),
                name: v.name,
                avgPeerScore: parseFloat(avg.toFixed(2)),
                lowContribution: avg < 5,
            };
        });

        res.json(result);
    };