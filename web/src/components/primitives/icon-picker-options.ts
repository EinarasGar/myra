import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Apple,
  ArrowLeftRight,
  Baby,
  Backpack,
  BadgeEuro,
  BadgePoundSterling,
  Bandage,
  Banknote,
  Bath,
  Bed,
  Beer,
  Bell,
  Bike,
  BookOpen,
  BookText,
  Bookmark,
  Brain,
  Briefcase,
  Brush,
  Building2,
  Bus,
  CakeSlice,
  Calculator,
  Calendar,
  Camera,
  Car,
  CarTaxiFront,
  Carrot,
  ChartLine,
  Check,
  Circle,
  CircleAlert,
  CircleDollarSign,
  CircleParking,
  ClipboardList,
  Clock,
  Cloud,
  Coffee,
  Coins,
  CreditCard,
  Croissant,
  CupSoda,
  Dice5,
  DoorOpen,
  Drama,
  Droplets,
  Dumbbell,
  Egg,
  Ellipsis,
  Eye,
  FileText,
  Film,
  Flag,
  Flame,
  Flower2,
  Footprints,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  Glasses,
  Globe,
  GraduationCap,
  Guitar,
  Hammer,
  HandCoins,
  Handshake,
  HardHat,
  Hash,
  Headphones,
  Heart,
  HeartHandshake,
  HeartPulse,
  Hospital,
  House,
  IceCreamCone,
  Info,
  Key,
  Lamp,
  Landmark,
  Laptop,
  Leaf,
  Lock,
  Luggage,
  Mail,
  MapPin,
  Martini,
  Milk,
  Monitor,
  Moon,
  Music,
  Package,
  Paintbrush,
  Palette,
  PartyPopper,
  PawPrint,
  PenTool,
  Percent,
  Phone,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Plug,
  Popcorn,
  Presentation,
  Printer,
  Receipt,
  Repeat,
  Route,
  Salad,
  Sandwich,
  Scale,
  Scissors,
  Shield,
  ShieldCheck,
  ShieldPlus,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Smile,
  Sofa,
  Soup,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Sun,
  Syringe,
  Tag,
  Tent,
  Thermometer,
  Ticket,
  TrainFront,
  TramFront,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Truck,
  Tv,
  Users,
  Utensils,
  Vault,
  Wallet,
  WalletCards,
  WashingMachine,
  Watch,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from "lucide-react"
import { iconNames } from "lucide-react/dynamic"

import type { RowGlyphIcon } from "./row-glyph"

export const ICON_PICKER_PLACEHOLDER = "Choose an icon"
export const ICON_PICKER_SEARCH_PLACEHOLDER = "Search icons…"
export const ICON_PICKER_EMPTY = "No icon matches that."
export const ICON_PICKER_CLEAR = "Clear icon"
export const ICON_PICKER_LIST_LABEL = "Icons"

export const ICON_SEARCH_LIMIT = 96

export interface IconOption {
  readonly name: string
  readonly icon: RowGlyphIcon
}

export interface IconGroup {
  readonly label: string
  readonly keywords: string
  readonly icons: readonly {
    readonly name: string
    readonly icon: LucideIcon
  }[]
}

export const ICON_GROUPS: readonly IconGroup[] = [
  {
    label: "Money",
    keywords: "finance banking savings tax fee income salary invest",
    icons: [
      { name: "wallet", icon: Wallet },
      { name: "banknote", icon: Banknote },
      { name: "coins", icon: Coins },
      { name: "hand-coins", icon: HandCoins },
      { name: "piggy-bank", icon: PiggyBank },
      { name: "landmark", icon: Landmark },
      { name: "credit-card", icon: CreditCard },
      { name: "receipt", icon: Receipt },
      { name: "calculator", icon: Calculator },
      { name: "percent", icon: Percent },
      { name: "chart-line", icon: ChartLine },
      { name: "trending-up", icon: TrendingUp },
      { name: "trending-down", icon: TrendingDown },
      { name: "circle-dollar-sign", icon: CircleDollarSign },
      { name: "badge-pound-sterling", icon: BadgePoundSterling },
      { name: "badge-euro", icon: BadgeEuro },
      { name: "arrow-left-right", icon: ArrowLeftRight },
      { name: "repeat", icon: Repeat },
      { name: "wallet-cards", icon: WalletCards },
      { name: "vault", icon: Vault },
      { name: "scale", icon: Scale },
      { name: "handshake", icon: Handshake },
      { name: "heart-handshake", icon: HeartHandshake },
    ],
  },
  {
    label: "Home & bills",
    keywords: "utilities rent mortgage household repair energy",
    icons: [
      { name: "house", icon: House },
      { name: "bed", icon: Bed },
      { name: "sofa", icon: Sofa },
      { name: "lamp", icon: Lamp },
      { name: "key", icon: Key },
      { name: "wrench", icon: Wrench },
      { name: "hammer", icon: Hammer },
      { name: "plug", icon: Plug },
      { name: "zap", icon: Zap },
      { name: "flame", icon: Flame },
      { name: "droplets", icon: Droplets },
      { name: "wifi", icon: Wifi },
      { name: "trash-2", icon: Trash2 },
      { name: "washing-machine", icon: WashingMachine },
      { name: "shield", icon: Shield },
      { name: "shield-check", icon: ShieldCheck },
      { name: "sparkles", icon: Sparkles },
      { name: "paintbrush", icon: Paintbrush },
      { name: "thermometer", icon: Thermometer },
      { name: "door-open", icon: DoorOpen },
      { name: "bath", icon: Bath },
    ],
  },
  {
    label: "Food & drink",
    keywords: "groceries eating restaurant cafe takeaway supermarket",
    icons: [
      { name: "shopping-cart", icon: ShoppingCart },
      { name: "shopping-basket", icon: ShoppingBasket },
      { name: "store", icon: Store },
      { name: "utensils", icon: Utensils },
      { name: "coffee", icon: Coffee },
      { name: "beer", icon: Beer },
      { name: "wine", icon: Wine },
      { name: "martini", icon: Martini },
      { name: "sandwich", icon: Sandwich },
      { name: "pizza", icon: Pizza },
      { name: "ice-cream-cone", icon: IceCreamCone },
      { name: "cake-slice", icon: CakeSlice },
      { name: "apple", icon: Apple },
      { name: "carrot", icon: Carrot },
      { name: "egg", icon: Egg },
      { name: "milk", icon: Milk },
      { name: "cup-soda", icon: CupSoda },
      { name: "salad", icon: Salad },
      { name: "soup", icon: Soup },
      { name: "croissant", icon: Croissant },
    ],
  },
  {
    label: "Getting around",
    keywords: "transport travel commute fuel parking taxi",
    icons: [
      { name: "car", icon: Car },
      { name: "car-taxi-front", icon: CarTaxiFront },
      { name: "bus", icon: Bus },
      { name: "train-front", icon: TrainFront },
      { name: "tram-front", icon: TramFront },
      { name: "plane", icon: Plane },
      { name: "ship", icon: Ship },
      { name: "bike", icon: Bike },
      { name: "fuel", icon: Fuel },
      { name: "circle-parking", icon: CircleParking },
      { name: "truck", icon: Truck },
      { name: "footprints", icon: Footprints },
      { name: "map-pin", icon: MapPin },
      { name: "ticket", icon: Ticket },
      { name: "luggage", icon: Luggage },
      { name: "route", icon: Route },
    ],
  },
  {
    label: "Shopping",
    keywords: "clothes gift retail personal beauty",
    icons: [
      { name: "shopping-bag", icon: ShoppingBag },
      { name: "shirt", icon: Shirt },
      { name: "glasses", icon: Glasses },
      { name: "watch", icon: Watch },
      { name: "gift", icon: Gift },
      { name: "scissors", icon: Scissors },
      { name: "palette", icon: Palette },
      { name: "package", icon: Package },
      { name: "tag", icon: Tag },
      { name: "gem", icon: Gem },
      { name: "flower-2", icon: Flower2 },
      { name: "baby", icon: Baby },
      { name: "paw-print", icon: PawPrint },
      { name: "brush", icon: Brush },
    ],
  },
  {
    label: "Health",
    keywords: "medical fitness wellbeing pharmacy doctor insurance",
    icons: [
      { name: "heart-pulse", icon: HeartPulse },
      { name: "hospital", icon: Hospital },
      { name: "stethoscope", icon: Stethoscope },
      { name: "pill", icon: Pill },
      { name: "syringe", icon: Syringe },
      { name: "dumbbell", icon: Dumbbell },
      { name: "brain", icon: Brain },
      { name: "smile", icon: Smile },
      { name: "eye", icon: Eye },
      { name: "shield-plus", icon: ShieldPlus },
      { name: "bandage", icon: Bandage },
      { name: "activity", icon: Activity },
    ],
  },
  {
    label: "Leisure",
    keywords: "entertainment hobby sport holiday music games",
    icons: [
      { name: "film", icon: Film },
      { name: "music", icon: Music },
      { name: "headphones", icon: Headphones },
      { name: "gamepad-2", icon: Gamepad2 },
      { name: "camera", icon: Camera },
      { name: "book-open", icon: BookOpen },
      { name: "trophy", icon: Trophy },
      { name: "party-popper", icon: PartyPopper },
      { name: "dice-5", icon: Dice5 },
      { name: "tv", icon: Tv },
      { name: "tent", icon: Tent },
      { name: "guitar", icon: Guitar },
      { name: "drama", icon: Drama },
      { name: "popcorn", icon: Popcorn },
    ],
  },
  {
    label: "Work & study",
    keywords: "office education tuition career school",
    icons: [
      { name: "briefcase", icon: Briefcase },
      { name: "laptop", icon: Laptop },
      { name: "monitor", icon: Monitor },
      { name: "smartphone", icon: Smartphone },
      { name: "printer", icon: Printer },
      { name: "mail", icon: Mail },
      { name: "phone", icon: Phone },
      { name: "graduation-cap", icon: GraduationCap },
      { name: "book-text", icon: BookText },
      { name: "backpack", icon: Backpack },
      { name: "presentation", icon: Presentation },
      { name: "building-2", icon: Building2 },
      { name: "hard-hat", icon: HardHat },
      { name: "pen-tool", icon: PenTool },
      { name: "clipboard-list", icon: ClipboardList },
      { name: "file-text", icon: FileText },
      { name: "calendar", icon: Calendar },
      { name: "clock", icon: Clock },
      { name: "users", icon: Users },
    ],
  },
  {
    label: "Symbols",
    keywords: "general misc other plain",
    icons: [
      { name: "circle", icon: Circle },
      { name: "ellipsis", icon: Ellipsis },
      { name: "star", icon: Star },
      { name: "heart", icon: Heart },
      { name: "flag", icon: Flag },
      { name: "bookmark", icon: Bookmark },
      { name: "bell", icon: Bell },
      { name: "lock", icon: Lock },
      { name: "check", icon: Check },
      { name: "info", icon: Info },
      { name: "circle-alert", icon: CircleAlert },
      { name: "triangle-alert", icon: TriangleAlert },
      { name: "sun", icon: Sun },
      { name: "moon", icon: Moon },
      { name: "cloud", icon: Cloud },
      { name: "leaf", icon: Leaf },
      { name: "globe", icon: Globe },
      { name: "hash", icon: Hash },
    ],
  },
]

const CURATED = new Map<string, IconOption>(
  ICON_GROUPS.flatMap((group) => group.icons.map((icon) => [icon.name, icon]))
)

export function iconGlyph(name: string): RowGlyphIcon {
  return CURATED.get(name)?.icon ?? name
}

export const CURATED_ICON_COUNT = CURATED.size

function terms(query: string): readonly string[] {
  const trimmed = query.trim().toLowerCase()
  return trimmed === "" ? [] : trimmed.split(/[\s-]+/)
}

function matches(haystack: string, tokens: readonly string[]): boolean {
  return tokens.every((token) => haystack.includes(token))
}

export interface IconSearch {
  readonly icons: readonly IconOption[]
  readonly total: number
}

/**
 * Curated icons win the top of the list because they carry a bundled component and render
 * without a round trip; the rest of Lucide is reachable by name and loads on demand.
 */
export function searchIcons(query: string): IconSearch {
  const tokens = terms(query)
  if (tokens.length === 0) return { icons: [], total: 0 }
  const needle = query.trim().toLowerCase()
  const ranked: { readonly option: IconOption; readonly rank: number }[] = []
  const rank = (name: string, offset: number) => {
    if (name === needle) return offset
    return name.startsWith(needle) ? offset + 1 : offset + 2
  }
  for (const group of ICON_GROUPS) {
    const label = `${group.label} ${group.keywords}`.toLowerCase()
    for (const icon of group.icons) {
      const spelled = icon.name.replaceAll("-", " ")
      if (matches(spelled, tokens)) {
        ranked.push({ option: icon, rank: rank(icon.name, 0) })
        continue
      }
      if (matches(`${spelled} ${label}`, tokens)) {
        ranked.push({ option: icon, rank: 3 })
      }
    }
  }
  for (const name of iconNames) {
    if (CURATED.has(name)) continue
    if (matches(name.replaceAll("-", " "), tokens)) {
      ranked.push({ option: { name, icon: name }, rank: rank(name, 4) })
    }
  }
  const icons = ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, ICON_SEARCH_LIMIT)
    .map((entry) => entry.option)
  return { icons, total: ranked.length }
}

export function iconStatusLine(shown: number, total: number): string {
  if (total === 0) return ""
  if (total > shown) {
    return `Showing ${String(shown)} of ${String(total)} matches — keep typing to narrow`
  }
  return total === 1 ? "1 match" : `${String(total)} matches`
}
