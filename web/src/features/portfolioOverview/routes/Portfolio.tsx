import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import Table from "@mui/material/Table";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { formatDistance } from "date-fns";
import PortfolioCard from "../components/PortfolioCard";
import { PortfolioEntryViewModel } from "@/models";
import {
  useGetPortfolioHistoryQuery,
  useGetPortfolioOverviewQuery,
  useGetPortfolioQuery,
} from "@/app/myraApi";
import { Card } from "@mui/material";

function Portfolio() {
  const { data } = useGetPortfolioQuery("asds");
  // console.log(portfolioResp.data);
  console.log(data);
  const { data: dataa, error, isLoading } = useGetPortfolioHistoryQuery("asds");

  const { data: portfolioOverviewData } = useGetPortfolioOverviewQuery("asds");

  // if (isLoading) return <span>Loading</span>;
  // if (portfolioResp.isLoading) return <span>Loading</span>;

  const rates = dataa?.sums.map((sum) => sum.rate) ?? [];
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const rateRange = maxRate - minRate;
  const bufferPercentage = 0.1; // 10% buffer
  const buffer = rateRange * bufferPercentage;
  const yAxisDomain = [minRate - buffer, maxRate + buffer];

  // sort portfolioResp.data?.portfolio_entries by assets
  // let portfolioEntries = portfolioResp.data?.portfolio_entries ?? [];
  // // remove where sum is 0
  // portfolioEntries = portfolioEntries.filter((x) => x.sum !== 0);

  // // hashmap of entries by asset id
  // const entriesByAssetId = new Map<number, PortfolioEntryViewModel[]>();
  // portfolioEntries.forEach((entry) => {
  //   const assetId = entry.asset.id;
  //   if (entriesByAssetId.has(assetId)) {
  //     entriesByAssetId.get(assetId)?.push(entry);
  //   } else {
  //     entriesByAssetId.set(assetId, [entry]);
  //   }
  // });

  if (!data) {
    return <>1</>;
  }

  if (!portfolioOverviewData) {
    return <>1</>;
  }

  console.log(portfolioOverviewData);
  return (
    <>
      <div className=" h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={dataa?.sums}
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
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Asset name</TableCell>
              <TableCell align="right">Account</TableCell>
              <TableCell align="right">Ticker</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.holdings.map((row) => (
              <TableRow
                key={row.account_id + row.asset_id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {
                    data.lookup_tables.assets.find(
                      (x) => x.asset_id == row.asset_id
                    )?.name
                  }
                </TableCell>
                <TableCell align="right">
                  {
                    data.lookup_tables.accounts.find(
                      (x) => x.account_id == row.account_id
                    )?.name
                  }
                </TableCell>
                <TableCell align="right">
                  {
                    data.lookup_tables.assets.find(
                      (x) => x.asset_id == row.asset_id
                    )?.ticker
                  }
                </TableCell>
                <TableCell align="right">{row.units}</TableCell>
                <TableCell align="right">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <br></br>
      <Card>Portfolios</Card>
      <br></br>
      <Card>Asset Portfolios</Card>
      <Card>
        {portfolioOverviewData.portfolios.asset_portfolios.map((entry) => (
          <Card key={String(entry.asset_id) + entry.account_id}>
            <p>account_id: {entry.account_id}</p>
            <p>asset_id: {entry.asset_id}</p>
            <p>cash_dividends: {entry.cash_dividends}</p>
            <p>realized_gains: {entry.realized_gains}</p>
            <p>total_cost_basis: {entry.total_cost_basis}</p>
            <p>total_fees: {entry.total_fees}</p>
            <p>total_gains: {entry.total_gains}</p>
            <p>total_units: {entry.total_units}</p>
            <p>unit_cost_basis: {entry.unit_cost_basis}</p>
            <p>unrealized_gains: {entry.unrealized_gains}</p>
          </Card>
        ))}
      </Card>
    </>
  );
}

export default Portfolio;
