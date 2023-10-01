import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetPortfolioHistoryQuery,
  useGetPortfolioQuery,
} from "@/app/myraApi";

function Portfolio() {
  const portfolioResp = useGetPortfolioQuery("asds");
  const { data, error, isLoading } = useGetPortfolioHistoryQuery("asds");

  if (isLoading) return <span>Loading</span>;
  if (portfolioResp.isLoading) return <span>Loading</span>;

  const rates = data?.sums.map((sum) => sum.rate) ?? [];
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const rateRange = maxRate - minRate;
  const bufferPercentage = 0.1; // 10% buffer
  const buffer = rateRange * bufferPercentage;
  const yAxisDomain = [minRate - buffer, maxRate + buffer];

  return (
    // (portfolioResp.data?.portfolio_entries.map((x) => (
    //   <div key={x.account.id}>
    //     {x.asset.name} {x.account.name} {x.sum} {x.last_rate?.rate}{" "}
    //     {x.last_rate?.rate * x.sum} {x.last_rate?.date}
    //   </div>
    // ))
    <>
      {portfolioResp.data?.portfolio_entries.map((x) => {
        if (x.sum === 0) {
          return null;
        }
        return (
          <div key={x.account.id}>
            {x.asset.name} {x.account.name} {x.sum} {x.last_rate?.rate}{" "}
            {x.last_rate?.rate! * x.sum} {x.last_rate?.date}
          </div>
        );
      })}
      <div className=" h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data?.sums}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <Tooltip />
            <XAxis dataKey="date" />

            <YAxis domain={yAxisDomain} />
            <Line dataKey="rate" dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export default Portfolio;
