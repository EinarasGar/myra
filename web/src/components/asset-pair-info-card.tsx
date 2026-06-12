import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  mainTicker: string;
  refTicker: string;
  latestRate?: number | null;
  lastUpdated?: number | null;
  children?: ReactNode;
}

export default function AssetPairInfoCard({
  mainTicker,
  refTicker,
  latestRate,
  lastUpdated,
  children,
}: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Pair</p>
            <p className="font-medium">
              {mainTicker} ↔ {refTicker}
            </p>
          </div>
          {latestRate != null && (
            <div>
              <p className="text-sm text-muted-foreground">Latest Rate</p>
              <p className="font-medium">{latestRate}</p>
            </div>
          )}
          {lastUpdated != null && (
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {new Date(lastUpdated * 1000).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
