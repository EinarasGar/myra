import React, { useState, useEffect } from "react";
import axios from "axios";
import * as Separator from "@radix-ui/react-separator";

export interface PortfolioResponse {
  assets: PortfolioEntry[];
}

export interface PortfolioEntry {
  asset: Asset;
  sum: string;
}

export interface Asset {
  ticker: string;
  name: string;
  category: string;
  asset_id: number;
}

function Portfolio() {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [errorr, setError] = useState(null);

  useEffect(() => {
    axios
      .get("users/2396480f-0052-4cf0-81dc-8cedbde5ce13/portfolio")
      .then((response) => setData(response.data))
      .catch((error) => setError(error));
  }, []);

  if (errorr) {
    return <div>Error: {errorr}</div>;
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    // <div>
    //   <p>my portfolio</p>
    //   <div>
    //     {data.assets.map((x) => (
    //       <p key={x.asset.asset_id}>
    //         {x.asset.name} {x.asset.category} {x.asset.ticker} and i have
    //         {x.sum} of it
    //       </p>
    //     ))}
    //   </div>
    // </div>
    <div className="relative max-w-screen-lg mx-auto pt-20 sm:pt-24 lg:pt-16">
      {/* <div className="dark:bg-dark-600 shadow-xl rounded-lg"> */}
      <div className="p-6">
        <div className="flex">
          <h5 className="text-2xl flex-grow font-bold leading-tight tracking-tight text-light-text dark:text-dark-text px-6">
            Transcations
          </h5>
        </div>

        <Separator.Root className="bg-light-text dark:bg-dark-text h-px my-4" />
        <div className="flex flex-col">
          <div className="overflow-x-auto sm:-mx-6 lg:-mrx-8">
            <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
              <div className="overflow-hidden">
                <div className="min-w-full text-left text-sm font-light">
                  {/* {assetData.groups.map((group) => (
                    <TransactionRow
                      key={group.group_id}
                      {...group}
                    ></TransactionRow>
                  ))} */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Portfolio;
