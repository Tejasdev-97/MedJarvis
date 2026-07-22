import jwt from "jsonwebtoken";

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            req.user = {
                accountId: decoded.accountId,
                profileId: decoded.profileId,
                role: decoded.role,
            };

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Not Authorized",
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No Token Provided",
        });
    }
};

export default protect;