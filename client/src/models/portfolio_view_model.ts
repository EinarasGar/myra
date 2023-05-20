export interface PortfolioAccountViewModel {
	id: string;
	name: string;
}

export interface PortfolioEntryViewModel {
	asset: AssetViewModel;
	account: PortfolioAccountViewModel;
	sum: number;
}

export interface PortfolioViewModel {
	portfolio_entries: PortfolioEntryViewModel[];
}

