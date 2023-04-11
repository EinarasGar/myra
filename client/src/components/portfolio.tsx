import React, { useState, useEffect } from "react";
import axios from "axios";

export interface Root {
  assets: Asset[];
}

export interface Asset {
  asset: Asset2;
  sum: string;
}

export interface Asset2 {
  ticker: string;
  name: string;
  category: string;
  asset_id: number;
}

function Portfolio() {
  const [data, setData] = useState<Root | null>(null);
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
    <div>
      <p>my portfolio</p>
      <div>
        {data.assets.map((x) => (
          <p key={x.asset.asset_id}>
            {x.asset.name} {x.asset.category} {x.asset.ticker} and i have
            {x.sum} of it
          </p>
        ))}
      </div>
    </div>
  );
}

export default Portfolio;
