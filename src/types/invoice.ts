export type ItemType = 'te' | 'nl' | 'bte' | 'bnl' | 'blo'
export type PriceMode = 'ndt' | 'vnd'
export type PaymentMethod = 'transfer' | 'cash' | 'cod'

export const ITEM_TYPES: ItemType[] = ['te', 'nl', 'bte', 'bnl', 'blo']

export interface AppSettings {
  exchangeRate: number
  surcharges: Record<ItemType, number>
  itemOperatingCosts: Record<ItemType, number>
  apiUrl: string
}

export interface OperatingCosts {
  packing: number
  tape: number
  loading: number
  shipping: number
  cancelledGoods: number
}

export interface OperatingExpense {
  expenseId: string
  expenseDate: string
  costs: OperatingCosts
  total: number
  note: string
  createdAt: string
}

export interface Customer {
  customerId: string
  name: string
  phone?: string
  address: string
  createdAt: string
  updatedAt: string
}

/** A receivable recorded without creating a sales invoice. */
export interface CustomerDebt {
  debtId: string
  customerId: string
  amount: number
  remaining: number
  debtDate: string
  note: string
  createdAt: string
  updatedAt: string
}

/** An auditable increase or decrease of a manually recorded customer debt. */
export interface CustomerDebtTransaction {
  transactionId: string
  customerId: string
  debtId: string
  amount: number
  direction: 'debt' | 'payment'
  transactionDate: string
  paymentMethod?: 'transfer' | 'cash'
  note: string
  createdAt: string
}

export interface SupplierPayment {
  paymentId: string
  amount: number
  paymentDate: string
  note: string
  createdAt: string
  supplierId?: string
  amountNdt?: number
  exchangeRate?: number
}

/** A purchase liability added after the supplier's opening balance. */
export interface SupplierDebtEntry {
  debtEntryId: string
  supplierId: string
  amountNdt: number
  exchangeRate: number
  debtDate: string
  note: string
  createdAt: string
}

export interface ChinaSupplier {
  supplierId: string
  name: string
  exchangeRate: number
  openingDebtNdt: number
  createdAt: string
  updatedAt: string
}

export interface InventoryProduct {
  productKey: string
  inventoryCode: string
  productName: string
  unitPrice: number
  quantityAdjustment: number
  createdAt: string
  updatedAt: string
}

export interface InvoiceItemDraft {
  id: string
  productName: string
  quantity: number
  itemType: ItemType
  priceMode: PriceMode
  originalPrice: number
  /** Extra selling fee in VND, applied once per unit after the base price. */
  extraFeeVnd?: number
  fromInventory?: boolean
  /** Selling price is separate from the preserved original cost for stock items. */
  saleUnitPrice?: number
}

export interface CalculatedInvoiceItem extends InvoiceItemDraft {
  exchangeRate: number
  surcharge: number
  /** Giá gốc quy về tệ, được chốt tại lúc lập hóa đơn. */
  chinaAmount: number
  /** Tiền gốc TQ sau khi quy đổi ra VNĐ, được chốt tại lúc lập hóa đơn. */
  chinaCostVnd: number
  /** Chi phí vận hành cố định cho một đơn vị hàng của loại này. */
  itemOperatingCost: number
  unitPrice: number
  subtotal: number
}

export interface InvoiceLineItem extends CalculatedInvoiceItem {
  itemId: string
}

export interface Invoice {
  deletedAt?: string
  invoiceId: string
  customerId: string | null
  customerName: string
  customerPhone?: string
  customerAddress: string
  paymentMethod: PaymentMethod
  invoiceDate: string
  items: InvoiceLineItem[]
  subtotal: number
  deposit: number
  paid: number
  remaining: number
  operatingCosts: OperatingCosts
  operatingCostTotal: number
  itemOperatingCostTotal: number
  chinaCostTotal: number
  profit: number
  status: 'active' | 'bombed'
  bombedAt?: string
  createdAt: string
}

export interface Payment {
  deletedAt?: string
  paymentId: string
  customerId: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: 'transfer' | 'cash' | 'cod'
  note: string
  createdAt: string
  kind: 'deposit' | 'payment'
  /** System-created settlement used only while an invoice is set to COD. */
  isAutoCod?: boolean
}
