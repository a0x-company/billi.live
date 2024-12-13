// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

// Import required contracts from Forge Standard Library and local source
import {Script} from "forge-std/Script.sol";
import {HeyBilli} from "../src/heyBilli.sol";

// Script contract for deploying HeyBilli
contract HeyBilliScript is Script {
    // Main deployment function that returns the deployed contract instance
    function run() external returns (HeyBilli) {
        // Start broadcasting transactions
        vm.startBroadcast();
        
        // Deploy new instance of HeyBilli contract
        HeyBilli heyBilli = new HeyBilli();
        
        // Stop broadcasting transactions
        vm.stopBroadcast();
        return heyBilli;
    }
}