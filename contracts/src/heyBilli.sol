// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Import OpenZeppelin contracts for ERC20 token functionality and access control
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Contract deployed on Base Mainnet
 * @notice You can view the deployed contract at:
 * https://basescan.org/address/0x40585EFA7C02CC8EfA3B8b51009A58C694b88F89#code
*/

// Interface for Uniswap V3 Factory contract to create and manage liquidity pools
interface IUniswapV3Factory {
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

// Interface for Uniswap V3 Pool contract to initialize pools
interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
}

// Interface for Uniswap V3 Position Manager to handle liquidity positions
interface INonfungiblePositionManager {
    // Parameters for minting new liquidity positions
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function mint(MintParams calldata params) external returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

    // Parameters for collecting fees from positions
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function collect(CollectParams calldata params) external returns (uint256 amount0, uint256 amount1);
    function ownerOf(uint256 tokenId) external view returns (address);
}

// Interface for Chainlink Price Feed to get USDC/WETH price data
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

// Custom ERC20 token contract with initial supply minting
contract CustomERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}

// Main contract for token deployment and liquidity management
contract HeyBilli is Ownable {
    // Core contract interfaces
    IUniswapV3Factory public immutable uniswapFactory;
    INonfungiblePositionManager public immutable positionManager;
    AggregatorV3Interface internal priceFeed;

    // Contract addresses for Base network
    address public constant UNISWAP_V3_FACTORY = 0x33128a8fC17869897dcE68Ed026d694621f6FDfD;
    address public constant NONFUNGIBLE_POSITION_MANAGER = 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1;
    address public constant oracleAddress = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    address public NFT_RECIPIENT = 0x16b07300ca306C90197F65cC9D60dE7f3D336857;
    address public immutable WETH = 0x4200000000000000000000000000000000000006;

    // Struct to store token deployment information
    struct TokenInfo {
        address creator;
        address tokenAddress;
        uint256 liquidityNFT1;
        uint256 liquidityNFT2;
    }

    // Storage mappings
    mapping(address => TokenInfo) public tokens;
    mapping(address => bool) public agents;

    // Events for important contract actions
    event TokenDeployed(address indexed tokenAddress, string name, string symbol, address indexed creator);
    event FeesCollected(address indexed tokenAddress, address indexed creator, uint256 amount0, uint256 amount1);
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);

    // Initialize contract with core dependencies
    constructor() Ownable(msg.sender) {
        uniswapFactory = IUniswapV3Factory(UNISWAP_V3_FACTORY);
        positionManager = INonfungiblePositionManager(NONFUNGIBLE_POSITION_MANAGER);
        priceFeed = AggregatorV3Interface(oracleAddress);
    }

    // Modifier to restrict functions to authorized agents
    modifier onlyAgent() {
        require(agents[msg.sender], "You are not an Agent");
        _;
    }

    // Add a new authorized agent
    function addAgent(address agent) external onlyOwner {
        agents[agent] = true;
        emit AgentAdded(agent);
    }

    // Remove an authorized agent
    function removeAgent(address agent) external onlyOwner {
        agents[agent] = false;
        emit AgentRemoved(agent);
    }

    // Deploy a new token and create liquidity pools
    function deployToken(string calldata name, string calldata symbol) external {
        // Deploy new ERC20 token
        ERC20 token = new CustomERC20(name, symbol, 1_000_000_000);
        address tokenAddress = address(token);

        // Store token information
        tokens[tokenAddress] = TokenInfo({
            creator: msg.sender,
            tokenAddress: tokenAddress,
            liquidityNFT1: 0,
            liquidityNFT2: 0
        });

        emit TokenDeployed(tokenAddress, name, symbol, msg.sender);

        // Create and initialize Uniswap V3 pool
        createPool(tokenAddress, WETH, 10000);

        uint256 amountWETH = convertUSDCtoWETH(500000);
        uint256 sqrtvalue = (500000000 * 10 ** 18) / amountWETH;
        uint160 sqrtPriceX96 = uint160(sqrt(sqrtvalue) * (2**96));

        initializePool(tokenAddress, WETH, 10000, sqrtPriceX96);

        // Add initial liquidity for both recipient and sender
        addFullRangeLiquidity(WETH, tokenAddress, 10000, amountWETH, 500000000 * 10 ** 18, NFT_RECIPIENT);
        addFullRangeLiquidity(WETH, tokenAddress, 10000, amountWETH, 500000000 * 10 ** 18, msg.sender);
    }

    // Create a new Uniswap V3 pool
    function createPool(address token0, address token1, uint24 fee) public {
        address pool = uniswapFactory.getPool(token0, token1, fee);
        require(pool == address(0), "Pool already exists");

        pool = uniswapFactory.createPool(token0, token1, fee);
    }

    // Initialize a Uniswap V3 pool with initial price
    function initializePool(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) public {
        address pool = uniswapFactory.getPool(token0, token1, fee);
        require(pool != address(0), "Pool does not exist");

        IUniswapV3Pool(pool).initialize(sqrtPriceX96);
    }

    // Add full range liquidity to a pool
    function addFullRangeLiquidity(address token0, address token1, uint24 fee, uint256 amount0Desired, uint256 amount1Desired, address recipient) internal {
        int24 tickLower = -887200;
        int24 tickUpper = 887200;

        // Approve token transfers
        IERC20(token0).approve(NONFUNGIBLE_POSITION_MANAGER, amount0Desired);
        IERC20(token1).approve(NONFUNGIBLE_POSITION_MANAGER, amount1Desired);

        // Create mint parameters
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: recipient,
            deadline: block.timestamp + 1 hours
        });

        positionManager.mint(params);
    }

    // Collect fees from a liquidity position
    function collectFees(uint256 tokenId) external {
        address owner = positionManager.ownerOf(tokenId);
        require(owner == msg.sender, "You do not own this position");

        positionManager.collect(INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    // Get the current USDC/WETH price from Chainlink oracle
    function getUSDCtoWETHPrice() internal view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price from oracle");
        return uint256(price);
    }

    // Convert USDC amount to equivalent WETH amount
    function convertUSDCtoWETH(uint256 usdcAmount) public view returns (uint256 wethEquivalent) {
        uint256 price = getUSDCtoWETHPrice();
        wethEquivalent = (usdcAmount * 1e20) / price;
    }

    // Calculate square root using Newton's method
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // Deposit tokens into the contract
    function deposit(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }

    // Withdraw tokens from the contract (only agents)
    function withdraw(address token, uint256 amount) external onlyAgent {
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        require(amount <= contractBalance, "Insufficient contract balance");
        IERC20(token).transfer(msg.sender, amount);
    }

    // Get token balance of the contract
    function balance(address token) public view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

}