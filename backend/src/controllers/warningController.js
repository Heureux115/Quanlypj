const prisma = require("../prismaClient");

exports.createWarning = async (req, res) => {
    try {
        const { userId, groupId, note } = req.body;

        const warning = await prisma.warning.create({
            data: {
                userId,
                groupId,
                note,
                createdBy: req.user.id,
            },
        });

        res.json(warning);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};