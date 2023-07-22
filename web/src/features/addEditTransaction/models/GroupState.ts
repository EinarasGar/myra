import { CategoryViewModel } from "@/models";

export interface GroupState {
  id: string;
  description: string | null;
  category: CategoryViewModel | null;
  date: Date | null;
}
