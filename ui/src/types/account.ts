import { ComboBoxElement } from "@/interfaces/combo-box-element";

export interface Account {
  id: string;
  type_id: number;
  name: string;
}

export const mapAccountComboBoxProps = (
  category: Account
): Account & ComboBoxElement => ({
  ...category,
  getLabel: () => category.name,
  getKey: () => category.id.toString(),
});
