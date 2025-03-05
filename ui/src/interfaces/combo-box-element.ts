export interface ComboBoxElement {
  getKey: () => string;
  getLabel: () => string;
  getKeyWords?: () => string[];
  getIcon?: () => string;
  getGroupKey?: () => string | null;
  getGroupLabel?: () => string | null;
}
