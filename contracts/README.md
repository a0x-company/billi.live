# HeyBilli Smart Contract

## Overview
The `HeyBilli` smart contract is a comprehensive solution for deploying custom ERC20 tokens and managing their liquidity on the Uniswap V3 decentralized exchange. It empowers users to create their own tokens, establish liquidity pools with WETH (Wrapped Ether), and manage token interactions in a secure and efficient manner.

## Purpose
The primary purpose of the `HeyBilli` contract is to facilitate the deployment of new tokens and their integration into the Uniswap V3 ecosystem. This contract provides a user-friendly interface for minting tokens, creating liquidity pools, and managing assets, making it accessible for both developers and non-developers.

## Flow
1. **Deploy the Contract**: The `HeyBilli` contract is deployed on the Base Mainnet, providing a foundation for token deployment and liquidity management.
2. **Become an Agent**: The contract owner can designate specific addresses as agents. Agents have special permissions to perform certain actions within the contract, enhancing security and control.
3. **Add WETH to the Contract**: The contract can hold WETH, which is essential for creating liquidity pools. This allows for seamless trading between the newly deployed tokens and WETH.
4. **Deploy a Token**: Any user can deploy their own ERC20 token by providing a name and symbol. The `deployToken` function mints the specified amount of tokens directly to the contract, allowing users to start trading immediately.
5. **Create a Liquidity Pool**: Upon token deployment, the contract automatically creates a liquidity pool for the newly deployed token paired with WETH. This is done using the Uniswap V3 factory interface.
6. **Initialize the Pool**: The pool is initialized based on the price relationship between the token and WETH. The contract retrieves the current price from a Chainlink oracle to ensure accurate pricing.
7. **Add Liquidity**: Liquidity is added to the pool in two stages:
   - **First Stage**: Half of the minted tokens are sent to a designated safe address (NFT recipient) to ensure security and proper management of funds.
   - **Second Stage**: The remaining half of the tokens are sent to the token creator, allowing them to retain control over their assets.

## Functions
- **addAgent**: This function allows the contract owner to add a new agent. Agents can perform specific actions, enhancing the contract's operational flexibility.
- **removeAgent**: The owner can remove an agent, revoking their permissions and ensuring that only trusted addresses can interact with sensitive functions.
- **deployToken**: This function deploys a new ERC20 token, creates a liquidity pool with WETH, and adds initial liquidity. It mints a specified amount of tokens and stores relevant information in the contract.
- **createPool**: This function creates a new Uniswap V3 pool for the specified token pair. It checks if a pool already exists and creates one if it does not.
- **initializePool**: Initializes the created pool with a specified price, ensuring that the pool is ready for trading.
- **addFullRangeLiquidity**: This function adds liquidity to the pool for both the NFT recipient and the token creator, ensuring that there is sufficient liquidity for trading.
- **collectFees**: Allows the owner of a liquidity position to collect fees generated from the pool, providing a revenue stream for liquidity providers.
- **getUSDCtoWETHPrice**: Retrieves the current price of USDC in terms of WETH from a Chainlink oracle, ensuring that price data is accurate and up-to-date.
- **convertUSDCtoWETH**: Converts a specified amount of USDC to its equivalent in WETH, allowing users to understand the value of their assets in different currencies.
- **deposit**: Allows users to deposit tokens into the contract, enabling the contract to manage and utilize these tokens for liquidity and trading.
- **withdraw**: This function allows agents to withdraw tokens from the contract, providing flexibility for managing assets.
- **balance**: Returns the token balance of the contract, allowing users to check how many tokens are held by the contract at any time.

## Technologies Used
- **Solidity**: The programming language used to write the smart contract, enabling the creation of decentralized applications on the Ethereum blockchain.
- **OpenZeppelin**: A library for secure smart contract development, providing essential functionalities such as ERC20 token standards and access control mechanisms.
- **Uniswap V3**: A decentralized exchange protocol that allows users to create and manage liquidity pools, facilitating trading between different tokens.
- **Chainlink**: A decentralized oracle network that provides reliable price feeds, ensuring that the contract has access to accurate and real-time market data.

## Deployed Contract
You can view the deployed contract on the Base Mainnet at the following address:
[HeyBilli Contract on BaseScan](https://basescan.org/address/0x40585EFA7C02CC8EfA3B8b51009A58C694b88F89#code)