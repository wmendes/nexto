// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ConsortiumNFT.sol";

/**
 * @title GroupManager
 * @dev Manages consortium groups, membership, and payments
 */
contract GroupManager is Ownable, ReentrancyGuard {
    
    // Events
    event GroupCreated(string indexed groupId, address indexed organizer, uint256 totalValue, uint256 quotas);
    event UserJoinedGroup(string indexed groupId, address indexed user, uint256 tokenId);
    event PaymentProcessed(string indexed groupId, address indexed user, uint256 amount, uint256 tokenId);
    event DrawCompleted(string indexed groupId, uint256 indexed winnerTokenId, address indexed winner, bytes32 randomSeed);
    
    // Struct for consortium group
    struct ConsortiumGroup {
        string groupId;
        string name;
        address organizer;
        uint256 totalValue;
        uint256 quotas;
        uint256 quotaValue;
        uint256 duration; // in months
        uint256 adminFee; // percentage (100 = 1%)
        uint256 reserveFund; // percentage
        uint256 startDate;
        uint256 participants;
        uint256 maxParticipants;
        bool isActive;
        string ipfsHash;
        uint256 nextDrawDate;
        uint256 drawCount;
    }
    
    // State variables
    ConsortiumNFT public consortiumNFT;
    IERC20 public usdcToken; // USDC token for payments
    
    mapping(string => ConsortiumGroup) public groups;
    mapping(string => address[]) public groupMembers;
    mapping(address => bool) public kycApproved;
    mapping(string => bool) public groupExists;
    
    string[] public allGroupIds;
    
    // Payment tracking
    mapping(string => mapping(address => uint256)) public userLastPayment;
    mapping(string => mapping(address => uint256)) public userTotalPaid;
    
    // Draw system - will integrate with Flare Secure Random
    address public randomProvider;
    
    modifier onlyKYCApproved() {
        require(kycApproved[msg.sender], "KYC approval required");
        _;
    }
    
    modifier groupIsActive(string memory groupId) {
        require(groups[groupId].isActive, "Group is not active");
        _;
    }
    
    modifier onlyGroupOrganizer(string memory groupId) {
        require(groups[groupId].organizer == msg.sender, "Only group organizer");
        _;
    }
    
    constructor(address _consortiumNFT, address _usdcToken) {
        consortiumNFT = ConsortiumNFT(_consortiumNFT);
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @dev Set KYC approval status for user
     */
    function setKYCApproval(address user, bool approved) external onlyOwner {
        kycApproved[user] = approved;
    }
    
    /**
     * @dev Set random provider for draws (Flare integration)
     */
    function setRandomProvider(address _randomProvider) external onlyOwner {
        randomProvider = _randomProvider;
    }
    
    /**
     * @dev Create a new consortium group
     */
    function createGroup(
        string memory groupId,
        string memory name,
        uint256 totalValue,
        uint256 quotas,
        uint256 duration,
        uint256 adminFee,
        uint256 reserveFund,
        string memory ipfsHash
    ) external {
        require(!groupExists[groupId], "Group already exists");
        require(totalValue > 0 && quotas > 0, "Invalid values");
        require(adminFee <= 1000, "Admin fee too high"); // Max 10%
        require(reserveFund <= 500, "Reserve fund too high"); // Max 5%
        
        uint256 quotaValue = totalValue / quotas;
        
        groups[groupId] = ConsortiumGroup({
            groupId: groupId,
            name: name,
            organizer: msg.sender,
            totalValue: totalValue,
            quotas: quotas,
            quotaValue: quotaValue,
            duration: duration,
            adminFee: adminFee,
            reserveFund: reserveFund,
            startDate: block.timestamp,
            participants: 0,
            maxParticipants: quotas,
            isActive: true,
            ipfsHash: ipfsHash,
            nextDrawDate: block.timestamp + 30 days, // First draw in 30 days
            drawCount: 0
        });
        
        groupExists[groupId] = true;
        allGroupIds.push(groupId);
        
        emit GroupCreated(groupId, msg.sender, totalValue, quotas);
    }
    
    /**
     * @dev Join a consortium group and receive NFT
     */
    function joinGroup(string memory groupId, string memory tokenURI) 
        external 
        onlyKYCApproved 
        groupIsActive(groupId) 
        nonReentrant 
    {
        ConsortiumGroup storage group = groups[groupId];
        require(group.participants < group.maxParticipants, "Group is full");
        
        // Check if user is already in the group
        address[] memory members = groupMembers[groupId];
        for (uint256 i = 0; i < members.length; i++) {
            require(members[i] != msg.sender, "Already in group");
        }
        
        // Mint NFT for the user
        uint256 tokenId = consortiumNFT.mintConsortiumShare(
            msg.sender,
            groupId,
            group.quotaValue,
            tokenURI
        );
        
        // Update group data
        group.participants++;
        groupMembers[groupId].push(msg.sender);
        
        emit UserJoinedGroup(groupId, msg.sender, tokenId);
    }
    
    /**
     * @dev Process monthly payment for consortium participation
     */
    function makePayment(string memory groupId, uint256 amount) 
        external 
        groupIsActive(groupId) 
        nonReentrant 
    {
        ConsortiumGroup memory group = groups[groupId];
        require(amount >= group.quotaValue, "Insufficient payment amount");
        
        // Check if user is in the group
        bool isMember = false;
        uint256 userTokenId = 0;
        uint256[] memory userTokens = consortiumNFT.getOwnerTokens(msg.sender);
        
        for (uint256 i = 0; i < userTokens.length; i++) {
            ConsortiumNFT.ConsortiumShare memory share = consortiumNFT.getConsortiumShare(userTokens[i]);
            if (keccak256(bytes(share.groupId)) == keccak256(bytes(groupId))) {
                isMember = true;
                userTokenId = userTokens[i];
                break;
            }
        }
        
        require(isMember, "Not a member of this group");
        
        // Transfer payment
        require(usdcToken.transferFrom(msg.sender, address(this), amount), "Payment transfer failed");
        
        // Record payment in NFT contract
        consortiumNFT.recordPayment(userTokenId, amount);
        
        // Update payment tracking
        userLastPayment[groupId][msg.sender] = block.timestamp;
        userTotalPaid[groupId][msg.sender] += amount;
        
        emit PaymentProcessed(groupId, msg.sender, amount, userTokenId);
    }
    
    /**
     * @dev Execute draw for a group (simplified version - to be enhanced with Flare randomness)
     */
    function executeDraw(string memory groupId) external onlyGroupOrganizer(groupId) {
        ConsortiumGroup storage group = groups[groupId];
        require(block.timestamp >= group.nextDrawDate, "Not time for draw yet");
        require(group.participants > 0, "No participants");
        
        // Get eligible participants (those with current payments)
        uint256[] memory groupTokens = consortiumNFT.getGroupTokens(groupId);
        uint256[] memory eligibleTokens = new uint256[](groupTokens.length);
        uint256 eligibleCount = 0;
        
        for (uint256 i = 0; i < groupTokens.length; i++) {
            if (consortiumNFT.isEligibleForDraw(groupTokens[i])) {
                eligibleTokens[eligibleCount] = groupTokens[i];
                eligibleCount++;
            }
        }
        
        require(eligibleCount > 0, "No eligible participants");
        
        // Simple random selection (to be replaced with Flare Secure Random)
        bytes32 randomSeed = keccak256(abi.encodePacked(block.timestamp, block.difficulty, groupId));
        uint256 winnerIndex = uint256(randomSeed) % eligibleCount;
        uint256 winnerTokenId = eligibleTokens[winnerIndex];
        
        // Mark winner NFT as contemplated
        consortiumNFT.markAsContemplated(winnerTokenId);
        
        // Update group draw info
        group.nextDrawDate = block.timestamp + 30 days; // Next draw in 30 days
        group.drawCount++;
        
        address winner = consortiumNFT.ownerOf(winnerTokenId);
        emit DrawCompleted(groupId, winnerTokenId, winner, randomSeed);
    }
    
    /**
     * @dev Get group information
     */
    function getGroup(string memory groupId) external view returns (ConsortiumGroup memory) {
        return groups[groupId];
    }
    
    /**
     * @dev Get all group IDs
     */
    function getAllGroups() external view returns (string[] memory) {
        return allGroupIds;
    }
    
    /**
     * @dev Get group members
     */
    function getGroupMembers(string memory groupId) external view returns (address[] memory) {
        return groupMembers[groupId];
    }
    
    /**
     * @dev Check if user is member of group
     */
    function isMemberOfGroup(string memory groupId, address user) external view returns (bool) {
        address[] memory members = groupMembers[groupId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == user) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Get user's payment info for a group
     */
    function getUserPaymentInfo(string memory groupId, address user) 
        external 
        view 
        returns (uint256 lastPayment, uint256 totalPaid) 
    {
        return (userLastPayment[groupId][user], userTotalPaid[groupId][user]);
    }
    
    /**
     * @dev Emergency functions for owner
     */
    function pauseGroup(string memory groupId) external onlyOwner {
        groups[groupId].isActive = false;
    }
    
    function unpauseGroup(string memory groupId) external onlyOwner {
        groups[groupId].isActive = true;
    }
    
    /**
     * @dev Withdraw collected funds (for organizer payouts)
     */
    function withdrawFunds(uint256 amount) external onlyOwner {
        require(usdcToken.transfer(msg.sender, amount), "Withdrawal failed");
    }
}