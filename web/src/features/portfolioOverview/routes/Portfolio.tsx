import { useGetPortfolioQuery } from "@/app/myraApi";

function Portfolio() {
  const { data, error, isLoading } = useGetPortfolioQuery("asds");

  return data?.portfolio_entries.map((x) => (
    <div key={x.account.id}>
      {x.asset.name} {x.account.name} {x.sum} {x.last_rate?.rate}{" "}
      {x.last_rate?.rate * x.sum} {x.last_rate?.date}
    </div>
  ));
}

export default Portfolio;
