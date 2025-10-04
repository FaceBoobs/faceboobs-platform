// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SocialPlatform is ReentrancyGuard, Ownable {
    
    struct User {
        string username;
        string avatarHash; // IPFS hash
        string bio;
        bool isCreator;
        uint256 followersCount;
        uint256 followingCount;
        uint256 totalEarnings;
        bool exists;
    }
    
    struct Content {
        address creator;
        string contentHash; // IPFS hash
        uint256 price; // in wei
        bool isPaid;
        uint256 timestamp;
        uint256 purchaseCount;
    }
    
    struct Story {
        address creator;
        string contentHash; // IPFS hash
        uint256 timestamp;
        uint256 expiryTime; // 24 hours from creation
    }
    
    // Mappings
    mapping(address => User) public users;
    mapping(uint256 => Content) public contents;
    mapping(address => mapping(address => bool)) public following; // follower => following
    mapping(address => mapping(uint256 => bool)) public contentAccess; // user => contentId => hasAccess
    mapping(address => uint256[]) public userContents; // creator => contentIds[]
    mapping(address => uint256[]) public userStories; // creator => storyIds[]
    mapping(uint256 => Story) public stories;
    
    // Counters
    uint256 public contentCounter;
    uint256 public storyCounter;
    
    // Platform fee (2%)
    uint256 public platformFee = 200; // 200 = 2%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Events
    event UserRegistered(address indexed user, string username);
    event UserBecameCreator(address indexed user);
    event ContentCreated(uint256 indexed contentId, address indexed creator, uint256 price);
    event ContentPurchased(uint256 indexed contentId, address indexed buyer, uint256 price);
    event StoryCreated(uint256 indexed storyId, address indexed creator);
    event UserFollowed(address indexed follower, address indexed following);
    event UserUnfollowed(address indexed follower, address indexed following);
    event EarningsWithdrawn(address indexed creator, uint256 amount);
    
    constructor() {}
    
    // User registration and profile management
    function registerUser(string memory _username, string memory _avatarHash, string memory _bio) external {
        require(!users[msg.sender].exists, "User already registered");
        require(bytes(_username).length > 0, "Username cannot be empty");
        
        users[msg.sender] = User({
            username: _username,
            avatarHash: _avatarHash,
            bio: _bio,
            isCreator: false,
            followersCount: 0,
            followingCount: 0,
            totalEarnings: 0,
            exists: true
        });
        
        emit UserRegistered(msg.sender, _username);
    }
    
    function updateProfile(string memory _username, string memory _avatarHash, string memory _bio) external {
        require(users[msg.sender].exists, "User not registered");
        
        if (bytes(_username).length > 0) {
            users[msg.sender].username = _username;
        }
        users[msg.sender].avatarHash = _avatarHash;
        users[msg.sender].bio = _bio;
    }
    
    function becomeCreator() external {
        require(users[msg.sender].exists, "User not registered");
        require(!users[msg.sender].isCreator, "Already a creator");
        
        users[msg.sender].isCreator = true;
        emit UserBecameCreator(msg.sender);
    }
    
    // Content creation and management
    function createContent(string memory _contentHash, uint256 _price, bool _isPaid) external {
        require(users[msg.sender].exists, "User not registered");
        require(users[msg.sender].isCreator, "Only creators can create content");
        
        contentCounter++;
        
        contents[contentCounter] = Content({
            creator: msg.sender,
            contentHash: _contentHash,
            price: _price,
            isPaid: _isPaid,
            timestamp: block.timestamp,
            purchaseCount: 0
        });
        
        userContents[msg.sender].push(contentCounter);
        
        // Creator always has access to their own content
        contentAccess[msg.sender][contentCounter] = true;
        
        emit ContentCreated(contentCounter, msg.sender, _price);
    }
    
    function buyContent(uint256 _contentId) external payable nonReentrant {
        require(users[msg.sender].exists, "User not registered");
        require(_contentId > 0 && _contentId <= contentCounter, "Invalid content ID");
        require(!contentAccess[msg.sender][_contentId], "Already purchased");
        
        Content storage content = contents[_contentId];
        require(content.isPaid, "Content is free");
        require(msg.value >= content.price, "Insufficient payment");
        
        // Grant access
        contentAccess[msg.sender][_contentId] = true;
        content.purchaseCount++;
        
        // Calculate platform fee
        uint256 fee = (msg.value * platformFee) / FEE_DENOMINATOR;
        uint256 creatorEarning = msg.value - fee;
        
        // Update creator earnings
        users[content.creator].totalEarnings += creatorEarning;
        
        // Refund excess payment
        if (msg.value > content.price) {
            payable(msg.sender).transfer(msg.value - content.price);
        }
        
        emit ContentPurchased(_contentId, msg.sender, content.price);
    }
    
    function getContentAccess(address _user, uint256 _contentId) external view returns (bool) {
        if (!contents[_contentId].isPaid) {
            return true; // Free content is accessible to everyone
        }
        return contentAccess[_user][_contentId];
    }
    
    // Story management
    function createStory(string memory _contentHash) external {
        require(users[msg.sender].exists, "User not registered");
        
        storyCounter++;
        
        stories[storyCounter] = Story({
            creator: msg.sender,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            expiryTime: block.timestamp + 24 hours
        });
        
        userStories[msg.sender].push(storyCounter);
        
        emit StoryCreated(storyCounter, msg.sender);
    }
    
    function getActiveStories(address _user) external view returns (uint256[] memory) {
        uint256[] memory allStories = userStories[_user];
        uint256 activeCount = 0;
        
        // Count active stories
        for (uint256 i = 0; i < allStories.length; i++) {
            if (stories[allStories[i]].expiryTime > block.timestamp) {
                activeCount++;
            }
        }
        
        // Create array of active stories
        uint256[] memory activeStories = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allStories.length; i++) {
            if (stories[allStories[i]].expiryTime > block.timestamp) {
                activeStories[index] = allStories[i];
                index++;
            }
        }
        
        return activeStories;
    }
    
    // Follow system
    function followUser(address _userToFollow) external {
        require(users[msg.sender].exists, "User not registered");
        require(users[_userToFollow].exists, "Target user not registered");
        require(msg.sender != _userToFollow, "Cannot follow yourself");
        require(!following[msg.sender][_userToFollow], "Already following");
        
        following[msg.sender][_userToFollow] = true;
        users[_userToFollow].followersCount++;
        users[msg.sender].followingCount++;
        
        emit UserFollowed(msg.sender, _userToFollow);
    }
    
    function unfollowUser(address _userToUnfollow) external {
        require(users[msg.sender].exists, "User not registered");
        require(following[msg.sender][_userToUnfollow], "Not following");
        
        following[msg.sender][_userToUnfollow] = false;
        users[_userToUnfollow].followersCount--;
        users[msg.sender].followingCount--;
        
        emit UserUnfollowed(msg.sender, _userToUnfollow);
    }
    
    function isFollowing(address _follower, address _following) external view returns (bool) {
        return following[_follower][_following];
    }
    
    // Earnings withdrawal
    function withdrawEarnings() external nonReentrant {
        require(users[msg.sender].exists, "User not registered");
        require(users[msg.sender].isCreator, "Only creators can withdraw");
        require(users[msg.sender].totalEarnings > 0, "No earnings to withdraw");
        
        uint256 amount = users[msg.sender].totalEarnings;
        users[msg.sender].totalEarnings = 0;
        
        payable(msg.sender).transfer(amount);
        
        emit EarningsWithdrawn(msg.sender, amount);
    }
    
    // Utility functions
    function getUserContents(address _user) external view returns (uint256[] memory) {
        return userContents[_user];
    }
    
    function getUserStories(address _user) external view returns (uint256[] memory) {
        return userStories[_user];
    }
    
    function getUser(address _userAddress) external view returns (User memory) {
        return users[_userAddress];
    }
    
    function getContent(uint256 _contentId) external view returns (Content memory) {
        return contents[_contentId];
    }
    
    function getStory(uint256 _storyId) external view returns (Story memory) {
        return stories[_storyId];
    }
    
    // Platform management (only owner)
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFee = _fee;
    }
    
    function withdrawPlatformFees() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Emergency function
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}