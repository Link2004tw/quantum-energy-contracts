import { adminDatabase as db } from "@/config/adminfirebase";
import { get, ref, set } from "@firebase/database";

export const getData = async (url) => {
    try {
        // Check if user is authenticated

        // Validate the URL
        if (!url || typeof url !== "string" || url.trim() === "") {
            throw new Error("Invalid or empty URL path");
        }

        const dataRef = ref(db, `${url}`);

        // Fetch the data
        const snapshot = await get(dataRef);

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error.message);
        throw new Error(`Failed to fetch data: ${error.message}`);
    }
};

export const saveData = async (data, url) => {
    try {
        // Validate inputs
        if (!url || typeof url !== "string" || url.trim() === "") {
            throw new Error("Invalid or empty URL path");
        }
        if (data === undefined || data === null) {
            throw new Error("Data cannot be null or undefined");
        }

        // Optionally, append user UID to the path for user-specific data
        const dataRef = ref(db, `${url}`);

        // Save the data
        await set(dataRef, data);

        return { success: true, message: `Data saved successfully at ${url}` };
    } catch (error) {
        console.error(`Error saving data to ${url}:`, error.message);
        throw new Error(`Failed to save data: ${error.message}`);
    }
};
