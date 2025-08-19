import React from "react";
import RequestList from "./RequestsList";
import { getData } from "@/utils/adminDatabaseUtils";

export default async function page() {
    const requests = [];
    try {
        const data = await getData("requests");
        if (data) {
            console.log(data);
            // Convert Firebase object to array of requests
            Object.keys(data).map((key) => {
                requests.push({
                    userId: key,
                    ethereumAddress: data[key].ethereumAddress,
                    metadata: {
                        name: data[key].metadata.name,
                        email: data[key].metadata.email,
                        reason: data[key].metadata.reason,
                        timestamp: data[key].metadata.timestamp,
                    },
                    status: data[key].status || "pending",
                });
            });
        }
    } catch (error) {
        console.error("Error fetching requests:", error);
    }
    return (
        <>
            <RequestList requests={requests} />
        </>
    );
}
