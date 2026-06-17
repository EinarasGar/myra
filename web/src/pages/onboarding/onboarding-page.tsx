import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AssetsApiFactory, AuthMe } from "@/api";
import { QueryKeys } from "@/constants/query-keys";
import { CURRENT_ONBOARDING_VERSION } from "@/constants/onboarding";
import { useSetBaseAsset } from "@/hooks/api/use-set-base-asset";
import { useSetOnboarding } from "@/hooks/api/use-set-onboarding";
import { useUserId } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CurrencyOption {
  id: number;
  name: string;
  ticker: string;
}

type Step = "welcome" | "currency" | "finish";

export default function OnboardingPage() {
  const userId = useUserId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBaseAsset = useSetBaseAsset(userId);
  const setOnboarding = useSetOnboarding(userId);

  const [step, setStep] = useState<Step>("welcome");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyOption | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const fetchCurrencies = useCallback(async (query: string) => {
    setIsFetching(true);
    try {
      const data = await AssetsApiFactory().searchAssets(
        20,
        0,
        query || undefined,
        1,
      );
      const options = data.data.results.map((asset) => ({
        id: asset.asset_id,
        name: asset.name,
        ticker: asset.ticker,
      }));
      setCurrencies(options);
      setSelectedCurrency((current) => current ?? options[0] ?? null);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (step === "currency") {
      fetchCurrencies(searchQuery);
    }
  }, [fetchCurrencies, searchQuery, step]);

  const selectedOrFirstCurrency = selectedCurrency ?? currencies[0] ?? null;

  const handleFinish = async () => {
    if (!selectedOrFirstCurrency) return;
    setIsFinishing(true);
    try {
      await setBaseAsset.mutateAsync({ asset_id: selectedOrFirstCurrency.id });
      await setOnboarding.mutateAsync({ version: CURRENT_ONBOARDING_VERSION });
      queryClient.setQueryData<AuthMe>([QueryKeys.AUTH_ME], (old) =>
        old
          ? {
              ...old,
              default_asset_id: selectedOrFirstCurrency.id,
              onboarding_version: CURRENT_ONBOARDING_VERSION,
            }
          : old,
      );
      navigate({ to: "/" });
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        {step === "welcome" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to Sverto</CardTitle>
              <CardDescription>
                Your unified investment portfolio tracker. Track all your
                assets, accounts, and net worth in one place.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setStep("currency")}>
                Get started
              </Button>
            </CardContent>
          </>
        )}

        {step === "currency" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">
                Choose your base currency
              </CardTitle>
              <CardDescription>
                All your balances and net worth are converted into this currency
                for reporting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search currencies..."
                aria-label="Base currency"
              />
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {isFetching && <p className="text-sm text-muted-foreground">Loading...</p>}
                {currencies.map((currency) => (
                  <button
                    key={currency.id}
                    type="button"
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedOrFirstCurrency?.id === currency.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                    onClick={() => setSelectedCurrency(currency)}
                  >
                    {currency.ticker} - {currency.name}
                  </button>
                ))}
              </div>
              <Button
                className="w-full"
                disabled={!selectedOrFirstCurrency}
                onClick={() => setStep("finish")}
              >
                Continue
              </Button>
            </CardContent>
          </>
        )}

        {step === "finish" && (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
              <CardDescription>
                Your base currency is set to{" "}
                <strong>{selectedOrFirstCurrency?.ticker}</strong>. You can
                change this later in Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={handleFinish}
                disabled={isFinishing}
              >
                {isFinishing ? "Setting up..." : "Go to dashboard"}
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
