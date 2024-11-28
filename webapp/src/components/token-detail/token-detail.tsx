import Chart from "./chart";
import CreateToken from "./create-token";

const TokenDetail = () => {
  return (
    <div className="w-full h-full">
      <CreateToken />
      <Chart tokenAddress="0x283024E266B46C7B52bc4BE4B1Fd0F232DEb219F" />
    </div>
  );
};

export default TokenDetail;
