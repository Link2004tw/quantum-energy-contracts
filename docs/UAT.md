# User Acceptance Testing (UAT) Plan for EnergyContract System

## Overview
This UAT plan verifies the functionality of the energy purchasing system, including the `EnergyContract.sol` smart contract, `contract.js` JavaScript interface, and `BuySolarPage.jsx` frontend component. The focus is on ensuring correct cost calculations (~0.000288 ETH for 10 kWh at $4,172 ETH price), proper user interactions, and robust error handling. The plan updates Test Case 4 to validate cost calculations and addresses the previously fixed 10x cost issue (0.006 ETH → 0.000288 ETH).

## Environment
- **Network**: Sepolia
- **Contract Address**: `0xF9939E6600047ab1d9883A25f5301f9FB49f4aAE`
- **Price Feed**: Sepolia Chainlink ETH/USD (`0x694AA1769357215DE4FAC081bf1f309aDC325306`)
- **ETH Price**: $4,172 (as specified)
- **PRICE_PER_KWH_USD_CENTS**: 12 ($0.12/kWh)
- **Tools**: MetaMask, Next.js app, Hardhat for local testing
- **Artifacts**:
  - `EnergyContract.sol`: ID `050b2ab5-b63a-49c9-b874-ba0f0e436063`
  - `contract.js`: ID `22115c05-84ea-4e0e-a6bb-825d124d77d4`, version `89a33b85-5793-4df2-90d6-c43db0ec3ab9`
  - `BuySolarPage.jsx`: ID `7b4e2c9d-3f8a-4a1c-9e3b-5f6d7e8f2a1b`

## Preconditions
- Deploy `EnergyContract.sol` with `PRICE_PER_KWH_USD_CENTS = 12`.
- Deploy updated `contract.js` and `BuySolarPage.jsx`.
- User has a MetaMask wallet connected to Sepolia with ~0.001 ETH.
- User is authenticated via Firebase and authorized via `authorizeParty`.
- `availableKWh` ≥ 10 (set via `requestAddEnergy` and `confirmAddEnergy`).

## Test Cases

### Test Case 1: Successful Energy Purchase
**Objective**: Verify a user can commit and reveal a purchase of 10 kWh with correct cost (~0.000288 ETH at $4,172 ETH price).

**Steps**:
1. Navigate to `BuySolarPage`.
2. Verify UI displays:
   - ETH price: ~`4172.00 USD/ETH`
   - Available energy: ≥`10 kWh`
   - Price per kWh: `0.12 USD/kWh`
3. Enter `10` in the kWh input field.
4. Click “Buy Solar Energy” to trigger `commitPurchaseHandler`.
5. Confirm the commitment in the modal (shows `~0.000288 ETH` for energy + gas).
6. Wait for MetaMask to confirm the `commitPurchase` transaction.
7. In the “Order Commitment Confirmation” modal, click “Confirm” to trigger `revealPurchase`.
8. Confirm the `revealPurchase` transaction in MetaMask (expect `~0.000288 ETH` for energy).
9. Verify the success modal shows:
   - `Purchased 10 kWh for 0.000288 ETH (~$1.20 energy + gas)`
   - Transaction hash (truncated)
10. Check Firebase (`committedOrders/{user._uid}/{txHash}`) for the order.
11. Verify `availableKWh` decreases by 10 (via `getAvailableEnergy`).

**Expected Result**:
- Commitment modal shows `~0.000288 ETH (~$1.20)` for 10 kWh.
- MetaMask for `revealPurchase` shows `~2.8763184 * 10^14 Wei` (0.000288 ETH).
- Success modal confirms purchase details.
- Firebase saves order with `energyRequested: 10`, `transactionHash`, and `nonce`.
- `availableKWh` updated correctly.

**Actual Result**: [To be recorded during testing]

---

### Test Case 2: Insufficient Energy Available
**Objective**: Verify error handling when requested kWh exceeds `availableKWh`.

**Steps**:
1. Set `availableKWh` to 5 (via `confirmAddEnergy` or Hardhat script).
2. Navigate to `BuySolarPage`, verify UI shows `5 kWh available`.
3. Enter `10` kWh and click “Buy Solar Energy”.
4. Check for error in the success modal.

**Expected Result**:
- Success modal shows: `Error: Requested 10 kWh exceeds available 5 kWh`.
- No transaction is sent to MetaMask.

**Actual Result**: [To be recorded]

---

### Test Case 3: Unauthorized User
**Objective**: Verify unauthorized users cannot purchase energy.

**Steps**:
1. Log in with a user not in `authorizedParties` (call `checkIfAuthorized` to confirm `false`).
2. Navigate to `BuySolarPage`, enter `10` kWh, and click “Buy Solar Energy”.
3. Check for alert or error.

**Expected Result**:
- Alert: “You are not authorized. Please wait for admin authorization.”
- No transaction is sent.

**Actual Result**: [To be recorded]

---

### Test Case 4: Handle Insufficient ETH for Purchase
**Objective**: Verify error handling for insufficient ETH, including cost validation at $4,172 ETH price.

**Sub-Tests**:
1. **Correct Cost Display**:
   - Navigate to `BuySolarPage`, enter `10` kWh.
   - Verify commitment modal shows `~0.000288 ETH (~$1.20)` for energy cost (excluding gas).
   - Check `getCost(10)` returns `"0.000288"`.
2. **Insufficient ETH**:
   - Use a wallet with <0.000288 ETH (e.g., 0.0001 ETH).
   - Attempt `commitPurchase` for 10 kWh, confirm in modal.
   - Proceed to `revealPurchase`, confirm in MetaMask.
   - Check for error in MetaMask or success modal.
3. **High Cost Detection**:
   - Deploy contract with `PRICE_PER_KWH_USD_CENTS = 120` (simulating misconfiguration).
   - Enter `10` kWh, check for warning in `BuySolarPage`.
   - Verify error in success modal.

**Expected Results**:
- **Sub-Test 1**: Modal shows `0.000288 ETH (~$1.20)` for 10 kWh. `getCost(10)` returns `"0.000288"`.
- **Sub-Test 2**: MetaMask rejects with “Insufficient funds” or success modal shows `Error: Payment too small. Provided: X ETH, Required: ~0.000288 ETH`.
- **Sub-Test 3**: Warning logged: `Unexpected PRICE_PER_KWH_USD_CENTS: 120`. Success modal shows: `Error: Unexpectedly high transaction cost. Please contact support.` (cost ~0.00288 ETH).

**Actual Results**: [To be recorded]

---

### Test Case 5: Commitment Expiration
**Objective**: Verify commitments expire after 5 minutes.

**Steps**:
1. Enter `10` kWh, click “Buy Solar Energy”, and confirm `commitPurchase`.
2. Wait >5 minutes (e.g., 6 minutes).
3. Click “Confirm” in the commitment modal to trigger `revealPurchase`.
4. Check for error in success modal.

**Expected Result**:
- Success modal shows: `Error: Purchase commitment has expired (5-minute window exceeded)` or `Commitment expired. Committed at: [time], Current: [time]`.
- No transaction completes.

**Actual Result**: [To be recorded]

---

### Test Case 6: Price Feed and Configuration Validation
**Objective**: Verify price feed and contract configuration handling.

**Steps**:
1. Verify `BuySolarPage` displays `4172.00 USD/ETH` and `0.12 USD/kWh`.
2. Use a mock price feed returning $50 (out of bounds).
3. Enter `10` kWh, attempt purchase, check for error.
4. Check console for warnings about `PRICE_PER_KWH_USD_CENTS`.

**Expected Results**:
- UI shows correct ETH price and kWh price.
- Mock price feed triggers: `Error: ETH price is outside valid bounds. Please try again later.`
- If `PRICE_PER_KWH_USD_CENTS ≠ 12`, UI shows: `Contract misconfiguration: Price per kWh is X cents. Contact support.`

**Actual Results**: [To be recorded]

---

### Test Case 7: Gas Estimation and Total Cost
**Objective**: Verify gas and total cost estimates are accurate.

**Steps**:
1. Enter `10` kWh, trigger `commitPurchaseHandler`.
2. Check commitment modal for gas and energy costs.
3. Proceed to `revealPurchase`, verify MetaMask total cost.

**Expected Result**:
- Commitment modal shows `~0.000288 ETH` energy + `~0.0001 ETH` gas (varies by network).
- MetaMask for `revealPurchase` shows `~0.000388 ETH` total (energy + gas).

**Actual Result**: [To be recorded]

## Post-UAT Steps
1. **Record Results**: Document actual results for each test case in a UAT report.
2. **Fix Issues**: If any test fails (e.g., cost >0.000288 ETH for 10 kWh), debug using:
   - `getPricePerKWhUSDCents` to confirm `12`.
   - `getLatestEthPriceWC` to verify `~4172`.
   - Hardhat logs for `calculateRequiredPayment`.
3. **Revisit Cost Issue**:
   - The 10x issue (0.006 ETH → 0.000288 ETH at $4,172) was resolved via `BigInt(1e10)` in `contract.js`.
   - If costs are incorrect (e.g., ~0.00288 ETH), check:
     - `PRICE_PER_KWH_USD_CENTS` (should be 12, not 120).
     - `contract.js` scaling in `revealPurchase` and `estimateGasForRevealPurchase`.
     - Price feed address (`0x694AA1769357215DE4FAC081bf1f309aDC325306`).
4. **Edge Cases**:
   - Test with stale price feed (>15 minutes) to verify `PriceFeedStale` error.
   - Test with invalid commitment hash to verify `InvalidCommitment`.

## Next Steps
- **Execute UAT**: Run the test cases on Sepolia with a user wallet, MetaMask, and the deployed contract.
- **Report Findings**: Share actual results or any failures (e.g., cost mismatches, errors).
- **Clarify Issue**: If a specific issue persists (e.g., cost calculation, UI, Firebase), provide details (logs, screenshots) for further investigation.
- **Optional Improvements**:
  - Implement `lastChainlinkFailure` pause logic in `EnergyContract.sol`.
  - Align `ethPriceUSD` in `revealPurchase` to use `cachedEthPrice / 10^10` for log consistency.

**Date and Time**: 12:54 PM EEST, Sunday, August 10, 2025