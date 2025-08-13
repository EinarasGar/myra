import { ComboBoxElement } from "@/interfaces/combo-box-element";

export interface Asset {
  id: number;
  ticker: string;
  name: string;
  asset_type_id: number;
}

export interface AssetType {
  id: number;
  name: string;
}

export interface ExpandedAsset {
  id: number;
  ticker: string;
  name: string;
  type: AssetType | null;
}

export const mapAssetComboBoxProps = (
  category: ExpandedAsset,
): ExpandedAsset & ComboBoxElement => ({
  ...category,
  getLabel: () => category.name,
  getKey: () => category.id.toString(),
  getKeyWords: () => [category.ticker, category.name],
  getGroupKey: () => (category.type ? category.type.id.toString() : null),
  getGroupLabel: () => (category.type ? category.type?.name : null),
});
