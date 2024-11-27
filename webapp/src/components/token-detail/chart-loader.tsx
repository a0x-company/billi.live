import LineChartLoaderSVG from "./line-chart-svg";
export const LineChartLoader: React.FC<React.PropsWithChildren> = () => {
  return (
    <div className="h-full relative">
      <LineChartLoaderSVG />
      <div className="absolute left-0 right-0 top-1/2 text-center">
        <p className="text-xl relative">Loading chart data...</p>
      </div>
    </div>
  );
};
