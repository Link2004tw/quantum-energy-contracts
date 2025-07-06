//SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract EnergyContract is Ownable {
    // Chainlink ETH/USD price feed
    AggregatorV3Interface internal priceFeed;

    struct Transaction {
        address buyer;
        address seller;
        uint256 kWh;
        uint256 pricePerkWhUSD; // Price in USD per kWh (in cents, e.g., 12 for $0.12)
        uint256 ethPriceUSD; // ETH/USD price at transaction time
        uint256 timestamp;
    }
    // Track available energy (kWh) and price per seller
    struct EnergyOffer{
        uint256 kWh;
        uint256 pricePerKWhUSD ;
    }
    
    mapping(address => EnergyOffer) public energyOffers;

    mapping(address => bool) public authorizedParties;

    Transaction[] public transactions;

  
    // Events for logging
    event EnergyAdded(address indexed seller, uint256 indexed kWh, uint256 indexed pricePerKWh);
    event EnergyPurchased(address indexed buyer, address indexed seller, uint256 indexed KWh, uint256 totalCostWei, uint256 ethPriceUSD);
    event Authorized(address indexed party);
    event Unathorized(address indexed  party);

// Modifier to restrict to authorized parties
    modifier onlyAuthorizedParties(){
        require(authorizedParties[msg.sender], "Not authorized");
        _;
    }
    constructor(address _priceFeed) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        authorizedParties[msg.sender]= true;
        emit Authorized(msg.sender);
    }

    function getLatestEthPrice() public view returns(uint256){
        (, int256 price, , ,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid Price Feed");
        return uint256(price) * 10**10;
    }

    // authorize a party, only the owner can authorize them
    function authorizeParty(address _party) external onlyOwner {
        require(_party !=  address(0), "Invalid Party");
        authorizedParties[_party]= true;
        emit Authorized(_party);
    }
     // un-authorize a party, only the owner can authorize them
     function unAuthorizeParty(address _party) external onlyOwner {
         require(authorizedParties[_party], "Party not Authorized");
         authorizedParties[_party]= false;
        emit Unathorized (_party);
    }
    // add energy 
    function addEnergy(uint256 _kWh, uint256 _pricePerKWhUSD) external onlyAuthorizedParties {
        require(_kWh > 0, "Energy Amount should be higher than 0");
        require(_pricePerKWhUSD >= 100,"Price per kwh needs to be higher then 100");
        energyOffers[msg.sender]= EnergyOffer(_kWh, _pricePerKWhUSD) ;
        emit EnergyAdded(msg.sender, _kWh, _pricePerKWhUSD);
    }
    
    function buyEnergy(address _seller, uint256 _kWh) external payable onlyAuthorizedParties {
        require(_kWh > 0,"Energy Amount should be higher than 0");
        require(authorizedParties[_seller] , "Seller not authorized to buy energy");
        EnergyOffer memory offer =energyOffers[_seller];
        require(offer.kWh >= _kWh, "Not enough energy available");
        
        uint256 ethPriceUSD = getLatestEthPrice();
        uint256 totalCostUSDCents = _kWh * offer.pricePerKWhUSD;
        uint256 totalCostWei = (totalCostUSDCents * 10**18) / (ethPriceUSD / 10**2);
        require(msg.value >= totalCostWei, "Insufficient payment");

        energyOffers[_seller].kWh -= _kWh;

        (bool sent, ) = payable(_seller).call{
            value: totalCostWei
        }("");
        require(sent, "Payment failed");

        if(msg.value > totalCostWei){
           (bool refundSent, ) = payable(msg.sender).call{
            value: msg.value - totalCostWei
            }("");
            require(refundSent, "Refund failed"); 
        }

        transactions.push(Transaction({
            buyer: msg.sender,
            seller: _seller,
            kWh: _kWh,
            pricePerkWhUSD: offer.pricePerKWhUSD,
            ethPriceUSD: ethPriceUSD,
            timestamp: block.timestamp
        }));

        emit EnergyPurchased(msg.sender, _seller, _kWh, totalCostWei, ethPriceUSD);
    }

    //get transaction count
    function getTransactionsCount() external view returns (uint256) {
        return transactions.length;
    }

}