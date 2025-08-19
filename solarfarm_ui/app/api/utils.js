import { adminAuth } from "@/config/adminfirebase";

export const validateAuthToken = async (authHeader) => {
    try {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return {
                error: "Unauthorized: Missing or invalid token",
                status: 401,
            };
        }

        const idToken = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(idToken);
        return {
            status: 200,
        };
    } catch (error) {
        console.error("Error validating auth token:", error);
        return {
            error: "Unauthorized: Invalid token",
            status: 401,
        };
    }
};
