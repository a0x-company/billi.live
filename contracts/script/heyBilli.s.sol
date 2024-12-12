// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {HeyBilli} from "../src/heyBilli.sol";

contract HeyBilliScript is Script {
    function run() external returns (HeyBilli) {
        vm.startBroadcast();
        
        HeyBilli heyBilli = new HeyBilli();
        
        vm.stopBroadcast();
        return heyBilli;
    }
}