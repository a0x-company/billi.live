// next
import Image from "next/image";

// react
import React, { useState } from "react";

// icons
import { LogOut, Tag, Zap } from "lucide-react";

// rainbowkit
import { ConnectButton, useAccountModal } from "@rainbow-me/rainbowkit";

// wagmi
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi, formatUnits } from "viem";

// utils
import { cn } from "@/utils/tailwindcss";

// constants
import { BASE_ADDRESS } from "@/constants/address";

const PRESET_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1];

interface TradeActionsProps {
  onBuy: (amount: number) => void;
  onSell: (amount: number) => void;
  onAmountSelect: (amount: number) => void;
  selectedAmount: number;
}

export const TradeActions: React.FC<TradeActionsProps> = ({
  onBuy,
  onSell,
  onAmountSelect,
  selectedAmount,
}) => {
  const { address, isDisconnected } = useAccount();
  const { data: balance } = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: BASE_ADDRESS.WETH.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address!],
      },
      {
        address: BASE_ADDRESS.WETH.address,
        abi: erc20Abi,
        functionName: "decimals",
      },
      {
        address: BASE_ADDRESS.WETH.address,
        abi: erc20Abi,
        functionName: "symbol",
      },
    ],
    query: {
      enabled: !!address,
    },
  });
  const formattedBalance = balance
    ? Number(formatUnits(balance[0], balance[1])).toFixed(6)
    : "0";

  const [amount, setAmount] = useState(0);
  const [amountFormatted, setAmountFormatted] = useState("0");
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const { openAccountModal } = useAccountModal();

  const handleAmountSelect = (amount: number) => {
    onAmountSelect(amount);
    setAmount(amount);
    setAmountFormatted(amount.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    value = value.replace(/,/g, ".");

    if (!/^(\d+\.?\d*|\.\d*)$/.test(value)) {
      return;
    }

    const parts = value.split(".");
    if (parts[1]?.length > 6) {
      value = `${parts[0]}.${parts[1].slice(0, 6)}`;
    }

    const numericValue = parseFloat(value) || 0;
    if (numericValue > 10000000) {
      value = "10000000";
    }

    setAmount(numericValue);
    setAmountFormatted(value);

    if (numericValue > Number(formattedBalance)) {
      setErrorFields((prev) => [...prev, "amount"]);
    } else {
      setErrorFields((prev) => prev.filter((field) => field !== "amount"));
    }
  };

  return (
    <div className="p-4 space-y-4 relative rounded-lg">
      {isDisconnected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center h-full bg-black/50 backdrop-blur-sm gap-4 z-10 rounded-lg">
          <h1>Connect your wallet to trade</h1>
          <ConnectButton />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {PRESET_AMOUNTS.map((amount) => (
          <button
            key={amount}
            onClick={() => handleAmountSelect(amount)}
            className={`rounded-lg transition-colors flex items-center justify-center gap-2 leading-none py-2.5 ${
              selectedAmount === amount
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Image
              src={`https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png`}
              alt="ETH"
              width={14}
              height={14}
            />
            {amount}
          </button>
        ))}
      </div>

      <p className="text-gray-400 text-sm text-center">Amount to buy in WETH</p>

      <div className="relative w-full">
        <input
          type="text"
          className={cn(
            "w-full bg-gray-800 text-white p-2 rounded-lg outline-none border border-transparent transition-colors",
            errorFields.includes("amount") &&
              "border border-red-500 text-red-500"
          )}
          placeholder="0.00"
          value={amountFormatted}
          onChange={handleAmountChange}
        />
        {errorFields.includes("amount") && (
          <p className="text-red-500 text-sm absolute top-1/2 -translate-y-1/2 right-2">
            Amount is greater than balance
          </p>
        )}
      </div>

      {balance && (
        <div className="flex justify-center items-center relative w-full">
          <p className="text-gray-400 text-sm text-center">
            Balance: {formattedBalance} WETH
          </p>
          <button
            onClick={openAccountModal}
            className="text-gray-400 text-sm hover:text-white hover:bg-purple-700 rounded-lg p-2 transition-colors absolute right-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isDisconnected && (
        <div className="flex gap-2">
          <button
            onClick={() => onBuy(selectedAmount)}
            className="flex items-center justify-center flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4 mr-2" />
            Pump
          </button>
          <button
            onClick={() => onSell(selectedAmount)}
            className="flex items-center justify-center flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg transition-colors"
          >
            <Tag className="w-4 h-4 mr-2" />
            Dump
          </button>
        </div>
      )}
    </div>
  );
};
