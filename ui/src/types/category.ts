import { ComboBoxElement } from "@/interfaces/combo-box-element";

export type Category = {
  id: number;
  icon: string;
  name: string;
  type: CategoryType;
  isSystem?: boolean;
  isGlobal?: boolean;
};

export const mapCategoryComboBoxProps = (
  category: Category,
): Category & ComboBoxElement => ({
  ...category,
  getLabel: () => category.name,
  getKey: () => category.id.toString(),
  getIcon: () => category.icon,
  getGroupKey: () => category.type.id.toString(),
  getGroupLabel: () => category.type.name,
  getSuffixIcon: () => (category.isGlobal ? null : "user"),
});

export interface CategoryType {
  id: number;
  name: string;
  is_global?: boolean;
}

export const mapCategoryTypeComboBoxProps = (
  type: CategoryType,
): CategoryType & ComboBoxElement => ({
  ...type,
  getKey: () => type.id.toString(),
  getLabel: () => type.name,
  getKeyWords: () => [type.name.toLowerCase()],
  getSuffixIcon: () => (type.is_global ? null : "user"),
});
