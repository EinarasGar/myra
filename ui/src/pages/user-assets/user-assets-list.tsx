import { useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import useGetUserAssets from "@/hooks/api/use-get-user-assets";
import { useAuthUserId } from "@/hooks/use-auth";
import CreateAssetDialog from "./create-asset-dialog";

export default function UserAssetsList() {
  const userId = useAuthUserId();
  const { data } = useGetUserAssets(userId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const assets = data?.data?.results ?? [];
  const assetTypes = data?.data?.lookup_tables?.asset_types ?? [];

  const getAssetTypeName = (typeId: number) => {
    const found = assetTypes.find((t) => t.id === typeId);
    return found?.name ?? "Unknown";
  };

  return (
    <>
      <Card className="m-4">
        <CardHeader>
          <CardTitle>User Assets</CardTitle>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Asset
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-lg">No assets yet.</p>
              <p className="text-muted-foreground text-sm mt-1">
                Create your first custom asset to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {assets.map((asset) => (
                <Link
                  key={asset.asset_id}
                  to="/user-assets/$assetId"
                  params={{ assetId: String(asset.asset_id) }}
                  className="flex items-center justify-between py-3 px-2 hover:bg-muted/50 rounded-md transition-colors"
                >
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.ticker}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {getAssetTypeName(asset.asset_type)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateAssetDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </>
  );
}
