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
  useGetPortfolioQuery,
} from "@/app/myraApi";

function Portfolio() {
  const { data } = useGetPortfolioQuery("asds");
  // console.log(portfolioResp.data);
  console.log(data);
  const { data: dataa, error, isLoading } = useGetPortfolioHistoryQuery("asds");

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

  return (
    // <>1</>
    // (portfolioResp.data?.portfolio_entries.map((x) => (
    //   <div key={x.account.id}>
    //     {x.asset.name} {x.account.name} {x.sum} {x.last_rate?.rate}{" "}
    //     {x.last_rate?.rate * x.sum} {x.last_rate?.date}
    //   </div>
    // ))
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
      {/* {Array.from(entriesByAssetId.values()).map((entry) =>
        entry.map((x) => <PortfolioCard key={x.asset.id} entries={entry} />)
      )} */}
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
                {/* <TableCell align="right">
                  {row.base_asset
                    ? (row.sum * (row.last_rate?.rate ?? 0)).toLocaleString(
                        "en-US",
                        { style: "currency", currency: row.base_asset.ticker }
                      )
                    : "-"}
                </TableCell>
                <TableCell align="right">
                  {(
                    row.sum * (row.last_reference_rate?.rate ?? 0)
                  ).toLocaleString("en-US", {
                    style: "currency",
                    currency: portfolioResp.data?.reference_asset?.ticker,
                  })}
                </TableCell>
                <TableCell align="right">
                  {row.sum_of_costs
                    ? `${(
                        row.sum * (row.last_reference_rate?.rate ?? 0) -
                        row.sum_of_costs
                      ).toLocaleString("en-US", {
                        style: "currency",
                        currency: portfolioResp.data?.reference_asset?.ticker,
                      })} (${(
                        ((row.sum * (row.last_reference_rate?.rate ?? 0) -
                          row.sum_of_costs) /
                          row.sum_of_costs) *
                        100
                      ).toFixed(2)}%)`
                    : "-"}
                </TableCell>

                <TableCell align="right">
                  {row.last_rate?.date &&
                    `${formatDistance(
                      new Date(row.last_rate.date),
                      new Date()
                    )} ago`}
                </TableCell> */}
              </TableRow>
            ))}
            {/* <TableRow
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                Total
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">
                {portfolioResp.data?.portfolio_entries
                  .reduce(
                    (acc, x) =>
                      acc + x.sum * (x.last_reference_rate?.rate ?? 0),
                    0
                  )
                  .toLocaleString("en-US", {
                    style: "currency",
                    currency: portfolioResp.data?.reference_asset?.ticker,
                  })}
              </TableCell>
              <TableCell align="right">-</TableCell>
            </TableRow> */}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default Portfolio;
