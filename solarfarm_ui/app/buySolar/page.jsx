// Prompt: Create a Next.js server component to fetch ethPrice and availableEnergy and pass to BuySolarPage
import {
  getLatestEthPriceWC,
  getAvailableUraniumLbs,
  getUraniumPricePerLb,
} from "@/utils/contractUtils";
import BuySolarPage from "./BuySolarPageActions";

export default async function BuySolarServerPage() {
  let ethPrice = null;
  let availableEnergy = null;
  let error = null;
  let uraniumPrice = 75.13; // Fixed uranium price in USD per lb (for example purposes)

  try {
    // Fetch ETH price from API
    const ethPriceResponse = await getLatestEthPriceWC();
    console.log(ethPriceResponse);
    if (!ethPriceResponse) {
      throw new Error(ethPriceData.error || "Failed to fetch ETH price");
    }
    ethPrice = ethPriceResponse;

    // Fetch available energy from contract.js (or use API below)
    availableEnergy = await getAvailableUraniumLbs();
    console.log(availableEnergy);
    console.log(availableEnergy);
    uraniumPrice = await getUraniumPricePerLb();
  } catch (err) {
    error = err.message;
  }

  return (
    <BuySolarPage
      initialEthPrice={ethPrice}
      initialAvailableUraniumLbs={availableEnergy}
      initialError={error}
      initialUraniumPrice={uraniumPrice} // Fixed uranium price in USD per lb (for example purposes)
    />
  );
}
