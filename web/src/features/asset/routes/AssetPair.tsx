import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useGetAssetPairRatesQuery } from "@/app/myraApi";

function AssetPair() {
  const { data, error, isLoading } = useGetAssetPairRatesQuery("asds");

  console.log(data);
  if (data === null || data === undefined) return <span>Loading</span>;

  return (
    <div className=" h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.rates}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <Tooltip />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 500]} />
          <Line dataKey="rate" dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AssetPair;
