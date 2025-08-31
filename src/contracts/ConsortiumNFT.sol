// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ConsortiumNFT
 * @dev NFT contract representing consortium shares for real estate investment groups
 */
contract ConsortiumNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed owner, string indexed groupId, uint256 quotaValue);
    event PaymentMade(uint256 indexed tokenId, address indexed payer, uint256 amount, uint256 timestamp);
    event NFTContemplated(uint256 indexed tokenId, address indexed winner, string indexed groupId);
    
    // Struct for NFT metadata
    struct ConsortiumShare {
        string groupId;
        uint256 quotaValue;
        uint256 mintedAt;
        address originalOwner;
        bool isContemplated;
        uint256 totalPaid;
        uint256 lastPaymentAt;
        PaymentStatus paymentStatus;
    }
    
    enum PaymentStatus {
        CURRENT,
        LATE,
        DEFAULTED
    }
    
    // Mappings
    mapping(uint256 => ConsortiumShare) public consortiumShares;
    mapping(string => uint256[]) public groupTokens;
    mapping(address => uint256[]) public ownerTokens;
    mapping(uint256 => uint256[]) public paymentHistory;
    
    // Group manager contract address
    address public groupManager;
    
    modifier onlyGroupManager() {
        require(msg.sender == groupManager, "Only group manager can call this");
        _;
    }
    
    constructor() ERC721("Consortium Share", "CONS") {}
    
    /**
     * @dev Set the group manager contract address
     */
    function setGroupManager(address _groupManager) external onlyOwner {
        groupManager = _groupManager;
    }
    
    /**
     * @dev Mint a new consortium NFT when user joins a group
     */
    function mintConsortiumShare(
        address to,
        string memory groupId,
        uint256 quotaValue,
        string memory tokenURI
    ) external onlyGroupManager returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Store consortium share data
        consortiumShares[tokenId] = ConsortiumShare({
            groupId: groupId,
            quotaValue: quotaValue,
            mintedAt: block.timestamp,
            originalOwner: to,
            isContemplated: false,
            totalPaid: 0,
            lastPaymentAt: 0,
            paymentStatus: PaymentStatus.CURRENT
        });
        
        // Update mappings
        groupTokens[groupId].push(tokenId);
        ownerTokens[to].push(tokenId);
        
        emit NFTMinted(tokenId, to, groupId, quotaValue);
        return tokenId;
    }
    
    /**
     * @dev Record a payment for a specific NFT
     */
    function recordPayment(uint256 tokenId, uint256 amount) external onlyGroupManager {
        require(_exists(tokenId), "NFT does not exist");
        
        ConsortiumShare storage share = consortiumShares[tokenId];
        share.totalPaid += amount;
        share.lastPaymentAt = block.timestamp;
        share.paymentStatus = PaymentStatus.CURRENT;
        
        paymentHistory[tokenId].push(amount);
        
        emit PaymentMade(tokenId, ownerOf(tokenId), amount, block.timestamp);
    }
    
    /**
     * @dev Mark an NFT as contemplated (winner of draw)
     */
    function markAsContemplated(uint256 tokenId) external onlyGroupManager {
        require(_exists(tokenId), "NFT does not exist");
        
        ConsortiumShare storage share = consortiumShares[tokenId];
        share.isContemplated = true;
        
        emit NFTContemplated(tokenId, ownerOf(tokenId), share.groupId);
    }
    
    /**
     * @dev Update payment status (called by payment monitoring system)
     */
    function updatePaymentStatus(uint256 tokenId, PaymentStatus status) external onlyGroupManager {
        require(_exists(tokenId), "NFT does not exist");
        consortiumShares[tokenId].paymentStatus = status;
    }
    
    /**
     * @dev Get all tokens owned by an address
     */
    function getOwnerTokens(address owner) external view returns (uint256[] memory) {
        return ownerTokens[owner];
    }
    
    /**
     * @dev Get all tokens in a specific group
     */
    function getGroupTokens(string memory groupId) external view returns (uint256[] memory) {
        return groupTokens[groupId];
    }
    
    /**
     * @dev Get consortium share details
     */
    function getConsortiumShare(uint256 tokenId) external view returns (ConsortiumShare memory) {
        require(_exists(tokenId), "NFT does not exist");
        return consortiumShares[tokenId];
    }
    
    /**
     * @dev Get payment history for a token
     */
    function getPaymentHistory(uint256 tokenId) external view returns (uint256[] memory) {
        return paymentHistory[tokenId];
    }
    
    /**
     * @dev Check if user is eligible for draws (payments are current)
     */
    function isEligibleForDraw(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "NFT does not exist");
        ConsortiumShare memory share = consortiumShares[tokenId];
        return !share.isContemplated && share.paymentStatus == PaymentStatus.CURRENT;
    }
    
    /**
     * @dev Override transfer functions to update owner mappings
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        if (from != address(0)) {
            // Remove from previous owner's tokens
            uint256[] storage fromTokens = ownerTokens[from];
            for (uint256 i = 0; i < fromTokens.length; i++) {
                if (fromTokens[i] == tokenId) {
                    fromTokens[i] = fromTokens[fromTokens.length - 1];
                    fromTokens.pop();
                    break;
                }
            }
        }
        
        if (to != address(0)) {
            // Add to new owner's tokens
            ownerTokens[to].push(tokenId);
        }
    }
    
    /**
     * @dev Override required functions
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}