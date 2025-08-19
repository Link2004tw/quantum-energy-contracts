// Prompt: Create a Next.js server component to fetch ethPrice and availableEnergy and pass to BuySolarPage
import { getLatestEthPriceWC, getAvailableEnergy } from "@/utils/contractUtils";
import BuySolarPage from "./BuySolarPageActions";

export default async function BuySolarServerPage() {
    let ethPrice = null;
    let availableEnergy = null;
    let error = null;

    try {
        // Fetch ETH price from API
        const ethPriceResponse = await getLatestEthPriceWC();
        console.log(ethPriceResponse);
        if (!ethPriceResponse) {
            throw new Error(ethPriceData.error || "Failed to fetch ETH price");
        }
        ethPrice = ethPriceResponse;

        // Fetch available energy from contract.js (or use API below)
        availableEnergy = await getAvailableEnergy();
        console.log(availableEnergy);
    } catch (err) {
        error = err.message;
    }

    return <BuySolarPage initialEthPrice={ethPrice} initialAvailableEnergy={availableEnergy} initialError={error} />;
}
