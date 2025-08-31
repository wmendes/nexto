// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ConsortiumNFT.sol";

/**
 * @title Marketplace
 * @dev Marketplace for trading consortium NFT shares
 */
contract Marketplace is Ownable, ReentrancyGuard {
    
    // Events
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 listingId);
    event NFTSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 listingId);
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    event OfferMade(uint256 indexed listingId, address indexed buyer, uint256 price, uint256 offerId);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed listingId);
    
    // Structs
    struct Listing {
        uint256 listingId;
        uint256 tokenId;
        address seller;
        uint256 price;
        bool isActive;
        uint256 listedAt;
        uint256 expiresAt;
    }
    
    struct Offer {
        uint256 offerId;
        uint256 listingId;
        address buyer;
        uint256 price;
        bool isActive;
        uint256 expiresAt;
    }
    
    // State variables
    ConsortiumNFT public consortiumNFT;
    IERC20 public paymentToken; // USDC or FLR
    
    uint256 public nextListingId = 1;
    uint256 public nextOfferId = 1;
    
    uint256 public marketplaceFee = 250; // 2.5% in basis points
    
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer) public offers;
    mapping(uint256 => uint256[]) public listingOffers; // listingId => offerIds
    
    uint256[] public activeListings;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userOffers;
    
    modifier onlyTokenOwner(uint256 tokenId) {
        require(consortiumNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        _;
    }
    
    modifier listingExists(uint256 listingId) {
        require(listings[listingId].isActive, "Listing does not exist or inactive");
        _;
    }
    
    modifier offerExists(uint256 offerId) {
        require(offers[offerId].isActive, "Offer does not exist or inactive");
        _;
    }
    
    constructor(address _consortiumNFT, address _paymentToken) {
        consortiumNFT = ConsortiumNFT(_consortiumNFT);
        paymentToken = IERC20(_paymentToken);
    }
    
    /**
     * @dev Set marketplace fee (only owner)
     */
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = _fee;
    }
    
    /**
     * @dev List NFT for sale
     */
    function listNFT(
        uint256 tokenId, 
        uint256 price, 
        uint256 duration
    ) external onlyTokenOwner(tokenId) nonReentrant {
        require(price > 0, "Price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        
        // Check that the NFT is not contemplated (already won)
        ConsortiumNFT.ConsortiumShare memory share = consortiumNFT.getConsortiumShare(tokenId);
        require(!share.isContemplated, "Cannot list contemplated NFT");
        
        // Transfer NFT to marketplace contract for escrow
        consortiumNFT.transferFrom(msg.sender, address(this), tokenId);
        
        uint256 listingId = nextListingId++;
        
        listings[listingId] = Listing({
            listingId: listingId,
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            isActive: true,
            listedAt: block.timestamp,
            expiresAt: block.timestamp + duration
        });
        
        activeListings.push(listingId);
        userListings[msg.sender].push(listingId);
        
        emit NFTListed(tokenId, msg.sender, price, listingId);
    }
    
    /**
     * @dev Buy NFT directly at listed price
     */
    function buyNFT(uint256 listingId) external listingExists(listingId) nonReentrant {
        Listing storage listing = listings[listingId];
        require(block.timestamp < listing.expiresAt, "Listing expired");
        require(msg.sender != listing.seller, "Cannot buy own NFT");
        
        uint256 totalPrice = listing.price;
        uint256 fee = (totalPrice * marketplaceFee) / 10000;
        uint256 sellerAmount = totalPrice - fee;
        
        // Transfer payment
        require(paymentToken.transferFrom(msg.sender, address(this), totalPrice), "Payment failed");
        require(paymentToken.transfer(listing.seller, sellerAmount), "Payment to seller failed");
        
        // Transfer NFT to buyer
        consortiumNFT.transferFrom(address(this), msg.sender, listing.tokenId);
        
        // Mark listing as inactive
        listing.isActive = false;
        
        // Cancel all offers on this listing
        _cancelListingOffers(listingId);
        
        emit NFTSold(listing.tokenId, msg.sender, listing.seller, totalPrice, listingId);
    }
    
    /**
     * @dev Make an offer on a listing
     */
    function makeOffer(
        uint256 listingId, 
        uint256 price, 
        uint256 duration
    ) external listingExists(listingId) nonReentrant {
        Listing memory listing = listings[listingId];
        require(msg.sender != listing.seller, "Cannot offer on own listing");
        require(price > 0, "Offer price must be greater than 0");
        require(block.timestamp < listing.expiresAt, "Listing expired");
        
        // Lock the offer amount
        require(paymentToken.transferFrom(msg.sender, address(this), price), "Failed to lock offer amount");
        
        uint256 offerId = nextOfferId++;
        
        offers[offerId] = Offer({
            offerId: offerId,
            listingId: listingId,
            buyer: msg.sender,
            price: price,
            isActive: true,
            expiresAt: block.timestamp + duration
        });
        
        listingOffers[listingId].push(offerId);
        userOffers[msg.sender].push(offerId);
        
        emit OfferMade(listingId, msg.sender, price, offerId);
    }
    
    /**
     * @dev Accept an offer (seller only)
     */
    function acceptOffer(uint256 offerId) external offerExists(offerId) nonReentrant {
        Offer storage offer = offers[offerId];
        Listing storage listing = listings[offer.listingId];
        
        require(listing.seller == msg.sender, "Only seller can accept offer");
        require(block.timestamp < offer.expiresAt, "Offer expired");
        require(listing.isActive, "Listing no longer active");
        
        uint256 totalPrice = offer.price;
        uint256 fee = (totalPrice * marketplaceFee) / 10000;
        uint256 sellerAmount = totalPrice - fee;
        
        // Transfer payment to seller (already locked in contract)
        require(paymentToken.transfer(listing.seller, sellerAmount), "Payment to seller failed");
        
        // Transfer NFT to buyer
        consortiumNFT.transferFrom(address(this), offer.buyer, listing.tokenId);
        
        // Mark listing and offer as inactive
        listing.isActive = false;
        offer.isActive = false;
        
        // Refund other offers on this listing
        _refundOtherOffers(offer.listingId, offerId);
        
        emit OfferAccepted(offerId, offer.listingId);
        emit NFTSold(listing.tokenId, offer.buyer, listing.seller, totalPrice, offer.listingId);
    }
    
    /**
     * @dev Cancel a listing (seller only)
     */
    function cancelListing(uint256 listingId) external listingExists(listingId) {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Only seller can cancel");
        
        // Return NFT to seller
        consortiumNFT.transferFrom(address(this), listing.seller, listing.tokenId);
        
        // Mark as inactive
        listing.isActive = false;
        
        // Refund all offers
        _refundAllOffers(listingId);
        
        emit ListingCancelled(listingId, listing.seller);
    }
    
    /**
     * @dev Cancel an offer (buyer only)
     */
    function cancelOffer(uint256 offerId) external offerExists(offerId) {
        Offer storage offer = offers[offerId];
        require(offer.buyer == msg.sender, "Only buyer can cancel offer");
        
        // Refund the locked amount
        require(paymentToken.transfer(offer.buyer, offer.price), "Refund failed");
        
        // Mark as inactive
        offer.isActive = false;
    }
    
    /**
     * @dev Internal function to cancel all offers on a listing
     */
    function _cancelListingOffers(uint256 listingId) internal {
        uint256[] memory offerIds = listingOffers[listingId];
        for (uint256 i = 0; i < offerIds.length; i++) {
            uint256 offerId = offerIds[i];
            if (offers[offerId].isActive) {
                Offer storage offer = offers[offerId];
                require(paymentToken.transfer(offer.buyer, offer.price), "Refund failed");
                offer.isActive = false;
            }
        }
    }
    
    /**
     * @dev Internal function to refund other offers except the accepted one
     */
    function _refundOtherOffers(uint256 listingId, uint256 acceptedOfferId) internal {
        uint256[] memory offerIds = listingOffers[listingId];
        for (uint256 i = 0; i < offerIds.length; i++) {
            uint256 offerId = offerIds[i];
            if (offerId != acceptedOfferId && offers[offerId].isActive) {
                Offer storage offer = offers[offerId];
                require(paymentToken.transfer(offer.buyer, offer.price), "Refund failed");
                offer.isActive = false;
            }
        }
    }
    
    /**
     * @dev Internal function to refund all offers on a listing
     */
    function _refundAllOffers(uint256 listingId) internal {
        uint256[] memory offerIds = listingOffers[listingId];
        for (uint256 i = 0; i < offerIds.length; i++) {
            uint256 offerId = offerIds[i];
            if (offers[offerId].isActive) {
                Offer storage offer = offers[offerId];
                require(paymentToken.transfer(offer.buyer, offer.price), "Refund failed");
                offer.isActive = false;
            }
        }
    }
    
    /**
     * @dev Get all active listings
     */
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active listings
        for (uint256 i = 0; i < activeListings.length; i++) {
            if (listings[activeListings[i]].isActive && 
                block.timestamp < listings[activeListings[i]].expiresAt) {
                activeCount++;
            }
        }
        
        // Create array of active listing IDs
        uint256[] memory active = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < activeListings.length; i++) {
            uint256 listingId = activeListings[i];
            if (listings[listingId].isActive && 
                block.timestamp < listings[listingId].expiresAt) {
                active[index] = listingId;
                index++;
            }
        }
        
        return active;
    }
    
    /**
     * @dev Get user's listings
     */
    function getUserListings(address user) external view returns (uint256[] memory) {
        return userListings[user];
    }
    
    /**
     * @dev Get user's offers
     */
    function getUserOffers(address user) external view returns (uint256[] memory) {
        return userOffers[user];
    }
    
    /**
     * @dev Get offers for a listing
     */
    function getListingOffers(uint256 listingId) external view returns (uint256[] memory) {
        return listingOffers[listingId];
    }
    
    /**
     * @dev Cleanup expired listings and offers (can be called by anyone)
     */
    function cleanupExpired() external {
        // This function can be enhanced to automatically handle expired listings and offers
        // For now, it's a placeholder for future optimization
    }
    
    /**
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        require(paymentToken.transfer(owner(), balance), "Withdrawal failed");
    }
}