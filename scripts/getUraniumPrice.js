// Chainlink Functions JavaScript source
// Fetches uranium price from your API and returns it as a uint256

const response = await Functions.makeHttpRequest({
  url: "https://humble-rebirth-production.up.railway.app/?priceType=spot",
  method: "GET",
});

if (!response || response.error) {
  throw Error("Request failed");
}

// Extract the uranium_price from the JSON
const price = response.data.data.uranium_price;

// Encode as uint256 for Solidity
return Functions.encodeUint256(price);
