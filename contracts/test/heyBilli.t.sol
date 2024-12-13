// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console2} from "forge-std/Test.sol";
import {HeyBilli} from "../src/heyBilli.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Contract deployed on Base Mainnet
 * @notice You can view the deployed contract at:
 * https://basescan.org/address/0x40585EFA7C02CC8EfA3B8b51009A58C694b88F89#code
*/

contract HeyBilliTest is Test {
    HeyBilli public heyBilli;
    address public owner;
    address public agent;
    address public user;

    // Constant addresses from original contract
    address constant WETH = 0x4200000000000000000000000000000000000006;

    function setUp() public {
        // Set up test accounts
        owner = makeAddr("owner");
        agent = makeAddr("agent");
        user = makeAddr("user");

        // Deploy contract as owner
        vm.startPrank(owner);
        heyBilli = new HeyBilli();
        vm.stopPrank();
    }

    // Test adding an agent by the owner
    function test_AddAgent() public {
        vm.startPrank(owner);
        heyBilli.addAgent(agent);
        vm.stopPrank();
        
        assertTrue(heyBilli.agents(agent), "Agent should be added");
    }

    // Test removing an agent by the owner
    function test_RemoveAgent() public {
        vm.startPrank(owner);
        heyBilli.addAgent(agent);
        heyBilli.removeAgent(agent);
        vm.stopPrank();
        
        assertFalse(heyBilli.agents(agent), "Agent should be removed");
    }

    // Test that non-owners cannot add agents
    function test_RevertWhen_NonOwnerAddsAgent() public {
        vm.startPrank(user);
        vm.expectRevert("Ownable: caller is not the owner");
        heyBilli.addAgent(agent);
        vm.stopPrank();
    }

    // Test token deployment functionality
    function test_DeployToken() public {
        vm.startPrank(user);
        heyBilli.deployToken("heyBilli", "BILLI");
        vm.stopPrank();
    }

    // Test token deposit functionality
    function test_Deposit() public {
        // Create and set up test token
        vm.startPrank(user);
        heyBilli.deployToken("TestToken", "TEST");
        address tokenAddress = address(0); // Here you would need the actual deployed token address
        
        // Approve and deposit tokens
        uint256 depositAmount = 100 * 10**18;
        IERC20(tokenAddress).approve(address(heyBilli), depositAmount);
        heyBilli.deposit(tokenAddress, depositAmount);
        vm.stopPrank();

        assertEq(heyBilli.balance(tokenAddress), depositAmount, "Deposit amount should match");
    }

    // Test token withdrawal by an agent
    function test_Withdraw() public {
        // Set up agent
        vm.startPrank(owner);
        heyBilli.addAgent(agent);
        vm.stopPrank();

        // Create and set up test token
        vm.startPrank(user);
        heyBilli.deployToken("TestToken", "TEST");
        address tokenAddress = address(0); // Here you would need the actual deployed token address
        
        // First deposit tokens
        uint256 depositAmount = 100 * 10**18;
        IERC20(tokenAddress).approve(address(heyBilli), depositAmount);
        heyBilli.deposit(tokenAddress, depositAmount);
        vm.stopPrank();

        // Test withdrawal as agent
        vm.startPrank(agent);
        heyBilli.withdraw(tokenAddress, depositAmount);
        vm.stopPrank();

        assertEq(heyBilli.balance(tokenAddress), 0, "Balance should be zero after withdrawal");
    }

    // Test that non-agents cannot withdraw tokens
    function test_RevertWhen_NonAgentWithdraws() public {
        vm.startPrank(user);
        vm.expectRevert("You are not an Agent");
        heyBilli.withdraw(address(0), 100);
        vm.stopPrank();
    }
}