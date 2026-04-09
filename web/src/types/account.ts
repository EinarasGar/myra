import { ComboBoxElement } from "@/interfaces/combo-box-element";

export interface AccountType {
  id: number;
  name: string;
}

export interface LiquidityType {
  id: number;
  name: string;
}

export interface Account {
  id: string;
  account_type_id: number;
  liquidity_type_id: number;
  name: string;
}

export interface ExpandedAccount {
  id: string;
  name: string;
  accountType?: AccountType;
  liquidityType?: LiquidityType;
  ownershipShare: number;
}

export const mapAccountComboBoxProps = <T extends Account | ExpandedAccount>(
  account: T,
): T & ComboBoxElement => ({
  ...account,
  getLabel: () => account.name,
  getKey: () => account.id.toString(),
});
