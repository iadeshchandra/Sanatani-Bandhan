import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Scroll,
  ShoppingCart,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  ArrowRight,
  TrendingDown,
  Clock,
  Sparkles,
  ExternalLink,
  MessageCircle,
  FileCheck,
  Building,
  Calendar,
  Layers,
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  Package,
  Check,
  RefreshCw,
  X,
  Printer,
  ShieldCheck,
  ChefHat,
  Flame,
  Info
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type BhandarTab = 'INVENTORY' | 'RECIPE_BOM' | 'VENDOR_PO' | 'GRN_TREASURY';

export interface BhandarItem {
  id: string;
  name: string;
  sanskritName?: string;
  category: 'Puja Samagri' | 'Annadanam Ration' | 'Dairy & Ghee' | 'Dry Fruits & Sweets' | 'Spices & Oils' | 'Sacred Herbs';
  unit: 'kg' | 'L' | 'grams' | 'tin (15L)' | 'bundle' | 'pack';
  physicalStock: number;
  committedStock: number; // reserved for upcoming pujas / meals
  reorderThreshold: number;
  unitCost: number; // in INR
  preferredVendorId: string;
  storageLocation: string; // e.g. "Bhandar Vault 2", "Cold Storage", "Aarti Store"
  lastUpdated: string;
}

export interface RecipeIngredient {
  itemId: string;
  itemName: string;
  unit: string;
  quantityPerUnit: number; // quantity needed for 1 unit of recipe (e.g. 1 puja or 1 meal)
}

export interface RecipeBOM {
  id: string;
  name: string;
  type: 'PUJA_SAMAGRI' | 'ANNADANAM_MEALS' | 'HAVAN_SACRED_FIRE';
  baseUnitLabel: string; // e.g., "1 Rudrabhishek Puja", "100 Devotee Meals", "1 Maha Havan"
  baseBatchSize: number; // e.g. 1, 100
  description: string;
  ingredients: RecipeIngredient[];
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string; // WhatsApp number
  category: string;
  address: string;
  gstNumber?: string;
  paymentTerms: 'Immediate UPI' | 'Net 15 Days' | 'Net 30 Days' | 'Cash on Delivery';
  activeRating: number;
}

export interface POItem {
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  items: POItem[];
  totalAmount: number;
  status: 'DRAFT' | 'DISPATCHED' | 'PARTIALLY_RECEIVED' | 'FULFILLED' | 'CANCELLED';
  expectedDeliveryDate: string;
  notes: string;
  generatedBy: string;
  dispatchedAt?: string;
}

export interface GRNItem {
  itemId: string;
  itemName: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  subtotal: number;
}

export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  poNumber: string;
  poId: string;
  receivedDate: string;
  vendorName: string;
  invoiceChallanNo: string;
  inspectedBy: string;
  items: GRNItem[];
  totalAmount: number;
  inspectionStatus: 'PASSED' | 'VARIANCE_FLAGGED';
  treasuryPosted: boolean;
  treasuryTxRef?: string;
  remarks: string;
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================

const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'ven-1',
    name: 'Shree Krishna Ghee Bhandar & Dairy',
    contactPerson: 'Sri Vallabhdas Sharma',
    phone: '919820011223',
    category: 'Pure Cow Ghee & Vedic Dairy',
    address: 'Golghar Mandir Gate, Vrindavan / Varanasi',
    gstNumber: '09AAACG1234F1Z8',
    paymentTerms: 'Net 15 Days',
    activeRating: 4.9,
  },
  {
    id: 'ven-2',
    name: 'Annapurna Agro & Govindobhog Mills',
    contactPerson: 'Sri Ramanuj Agrawal',
    phone: '919830022334',
    category: 'Grains, Dals & Annadanam Ration',
    address: 'Mandi Yard, Sector 4, Varanasi',
    gstNumber: '09AABCA5678B1Z2',
    paymentTerms: 'Net 30 Days',
    activeRating: 4.8,
  },
  {
    id: 'ven-3',
    name: 'Haridwar Sugandh & Puja Samagri Kendra',
    contactPerson: 'Pt. Madhavacharyaji',
    phone: '919840033445',
    category: 'Camphor, Chandan, Dhoop & Bilva',
    address: 'Kankhal Ghat Road, Haridwar',
    gstNumber: '05AACCH9988D1Z4',
    paymentTerms: 'Immediate UPI',
    activeRating: 4.9,
  },
];

const INITIAL_ITEMS: BhandarItem[] = [
  {
    id: 'itm-1',
    name: 'A2 Gir Cow Desi Ghee',
    sanskritName: 'Go-Ghrita (गोघृत)',
    category: 'Dairy & Ghee',
    unit: 'tin (15L)',
    physicalStock: 4,
    committedStock: 2,
    reorderThreshold: 5,
    unitCost: 14500,
    preferredVendorId: 'ven-1',
    storageLocation: 'Vault 1 - Sacred Dairy Room',
    lastUpdated: '2026-09-22',
  },
  {
    id: 'itm-2',
    name: 'Govindobhog Sugandhit Rice',
    sanskritName: 'Shali Tandula (शालि तण्डुल)',
    category: 'Annadanam Ration',
    unit: 'kg',
    physicalStock: 350,
    committedStock: 280,
    reorderThreshold: 200,
    unitCost: 95,
    preferredVendorId: 'ven-2',
    storageLocation: 'Annakshetra Granary Bay A',
    lastUpdated: '2026-09-23',
  },
  {
    id: 'itm-3',
    name: 'Pure Bhimseni Camphor (Karpur)',
    sanskritName: 'Karpura (कर्पूर)',
    category: 'Puja Samagri',
    unit: 'kg',
    physicalStock: 3,
    committedStock: 2,
    reorderThreshold: 5,
    unitCost: 1800,
    preferredVendorId: 'ven-3',
    storageLocation: 'Garbhagriha Safe Locker',
    lastUpdated: '2026-09-20',
  },
  {
    id: 'itm-4',
    name: 'Red Sandalwood & Malaya Chandan Paste',
    sanskritName: 'Rakta Chandana (रक्तचन्दन)',
    category: 'Sacred Herbs',
    unit: 'grams',
    physicalStock: 2500,
    committedStock: 1200,
    reorderThreshold: 3000,
    unitCost: 4.5,
    preferredVendorId: 'ven-3',
    storageLocation: 'Purohit Altar Bay',
    lastUpdated: '2026-09-21',
  },
  {
    id: 'itm-5',
    name: 'Toor Dal (Pigeon Pea - Supreme)',
    sanskritName: 'Adhaki (आढकी)',
    category: 'Annadanam Ration',
    unit: 'kg',
    physicalStock: 180,
    committedStock: 100,
    reorderThreshold: 150,
    unitCost: 165,
    preferredVendorId: 'ven-2',
    storageLocation: 'Annakshetra Granary Bay B',
    lastUpdated: '2026-09-23',
  },
  {
    id: 'itm-6',
    name: 'Cold Pressed Sesame (Til) Taila',
    sanskritName: 'Tila Taila (तिलतैल)',
    category: 'Spices & Oils',
    unit: 'L',
    physicalStock: 15,
    committedStock: 10,
    reorderThreshold: 30,
    unitCost: 280,
    preferredVendorId: 'ven-1',
    storageLocation: 'Deepam Chamber',
    lastUpdated: '2026-09-19',
  },
  {
    id: 'itm-7',
    name: 'Fresh Bilva Patra Bundles',
    sanskritName: 'Bilva Patra (बिल्वपत्र)',
    category: 'Sacred Herbs',
    unit: 'bundle',
    physicalStock: 25,
    committedStock: 20,
    reorderThreshold: 30,
    unitCost: 40,
    preferredVendorId: 'ven-3',
    storageLocation: 'Pushpa Shala',
    lastUpdated: '2026-09-24',
  },
  {
    id: 'itm-8',
    name: 'Vedic Forest Honey (Madhu)',
    sanskritName: 'Shuddha Madhu (शुद्ध मधु)',
    category: 'Dairy & Ghee',
    unit: 'kg',
    physicalStock: 8,
    committedStock: 5,
    reorderThreshold: 10,
    unitCost: 650,
    preferredVendorId: 'ven-3',
    storageLocation: 'Vault 2 - Abhishek Nectar Store',
    lastUpdated: '2026-09-22',
  },
];

const INITIAL_RECIPES: RecipeBOM[] = [
  {
    id: 'bom-1',
    name: 'Maha Rudrabhishek & Shivalinga Archana (1 Sankalp)',
    type: 'PUJA_SAMAGRI',
    baseUnitLabel: '1 Rudrabhishek Puja',
    baseBatchSize: 1,
    description: 'Exact Shastric proportion of panchamrita, aromatic dravyas, and Bilva leaves required for 1 standard Rudrabhishek.',
    ingredients: [
      { itemId: 'itm-1', itemName: 'A2 Gir Cow Desi Ghee', unit: 'tin (15L)', quantityPerUnit: 0.1 }, // ~1.5L
      { itemId: 'itm-3', itemName: 'Pure Bhimseni Camphor (Karpur)', unit: 'kg', quantityPerUnit: 0.25 },
      { itemId: 'itm-4', itemName: 'Red Sandalwood & Malaya Chandan Paste', unit: 'grams', quantityPerUnit: 250 },
      { itemId: 'itm-7', itemName: 'Fresh Bilva Patra Bundles', unit: 'bundle', quantityPerUnit: 5 },
      { itemId: 'itm-8', itemName: 'Vedic Forest Honey (Madhu)', unit: 'kg', quantityPerUnit: 1.0 },
    ],
  },
  {
    id: 'bom-2',
    name: 'Annadanam Mahaprasad Feast (100 Devotee Meals)',
    type: 'ANNADANAM_MEALS',
    baseUnitLabel: '100 Meals Batch',
    baseBatchSize: 100,
    description: 'Nourishing Sattvic Mahaprasad consisting of Govindobhog rice, Toor dal sambar, vegetable curry, and cow ghee payasam.',
    ingredients: [
      { itemId: 'itm-2', itemName: 'Govindobhog Sugandhit Rice', unit: 'kg', quantityPerUnit: 25 },
      { itemId: 'itm-5', itemName: 'Toor Dal (Pigeon Pea - Supreme)', unit: 'kg', quantityPerUnit: 8 },
      { itemId: 'itm-1', itemName: 'A2 Gir Cow Desi Ghee', unit: 'tin (15L)', quantityPerUnit: 0.4 }, // ~6L
      { itemId: 'itm-6', itemName: 'Cold Pressed Sesame (Til) Taila', unit: 'L', quantityPerUnit: 3 },
    ],
  },
  {
    id: 'bom-3',
    name: 'Navagraha & Chandi Maha Havan (1 Sacred Fire)',
    type: 'HAVAN_SACRED_FIRE',
    baseUnitLabel: '1 Maha Havan Fire',
    baseBatchSize: 1,
    description: 'Vedic Havan samagri, dry woods, pure cow ghee, and medicinal herbs prescribed in Grihya Sutras.',
    ingredients: [
      { itemId: 'itm-1', itemName: 'A2 Gir Cow Desi Ghee', unit: 'tin (15L)', quantityPerUnit: 0.5 }, // ~7.5L
      { itemId: 'itm-3', itemName: 'Pure Bhimseni Camphor (Karpur)', unit: 'kg', quantityPerUnit: 1.0 },
      { itemId: 'itm-6', itemName: 'Cold Pressed Sesame (Til) Taila', unit: 'L', quantityPerUnit: 5.0 },
      { itemId: 'itm-8', itemName: 'Vedic Forest Honey (Madhu)', unit: 'kg', quantityPerUnit: 1.5 },
    ],
  },
];

const INITIAL_POS: PurchaseOrder[] = [
  {
    id: 'po-101',
    poNumber: 'PO-2026-089',
    date: '2026-09-21',
    vendorId: 'ven-1',
    vendorName: 'Shree Krishna Ghee Bhandar & Dairy',
    vendorPhone: '919820011223',
    items: [
      { itemId: 'itm-1', itemName: 'A2 Gir Cow Desi Ghee', unit: 'tin (15L)', quantity: 5, unitCost: 14500, totalCost: 72500 },
      { itemId: 'itm-6', itemName: 'Cold Pressed Sesame (Til) Taila', unit: 'L', quantity: 30, unitCost: 280, totalCost: 8400 },
    ],
    totalAmount: 80900,
    status: 'DISPATCHED',
    expectedDeliveryDate: '2026-09-25',
    notes: 'Urgent restocking for upcoming Navratri & Pitru Tarpana rituals.',
    generatedBy: 'Bhandar In-Charge (Pt. Keshava)',
    dispatchedAt: '2026-09-21 14:30',
  },
  {
    id: 'po-102',
    poNumber: 'PO-2026-090',
    date: '2026-09-23',
    vendorId: 'ven-3',
    vendorName: 'Haridwar Sugandh & Puja Samagri Kendra',
    vendorPhone: '919840033445',
    items: [
      { itemId: 'itm-3', itemName: 'Pure Bhimseni Camphor (Karpur)', unit: 'kg', quantity: 10, unitCost: 1800, totalCost: 18000 },
      { itemId: 'itm-4', itemName: 'Red Sandalwood & Malaya Chandan Paste', unit: 'grams', quantity: 2000, unitCost: 4.5, totalCost: 9000 },
      { itemId: 'itm-8', itemName: 'Vedic Forest Honey (Madhu)', unit: 'kg', quantity: 15, unitCost: 650, totalCost: 9750 },
    ],
    totalAmount: 36750,
    status: 'DRAFT',
    expectedDeliveryDate: '2026-09-27',
    notes: 'Aromatic samagri stock replenishment for daily aarti and abhishekam.',
    generatedBy: 'Head Purohit',
  },
];

const INITIAL_GRNS: GoodsReceiptNote[] = [
  {
    id: 'grn-501',
    grnNumber: 'GRN-2026-042',
    poNumber: 'PO-2026-085',
    poId: 'po-prior',
    receivedDate: '2026-09-18',
    vendorName: 'Annapurna Agro & Govindobhog Mills',
    invoiceChallanNo: 'CH-2026/8941',
    inspectedBy: 'Bhandari Karyakarta (Ramdas)',
    items: [
      { itemId: 'itm-2', itemName: 'Govindobhog Sugandhit Rice', unit: 'kg', orderedQty: 500, receivedQty: 500, unitPrice: 95, subtotal: 47500 },
      { itemId: 'itm-5', itemName: 'Toor Dal (Pigeon Pea - Supreme)', unit: 'kg', orderedQty: 100, receivedQty: 100, unitPrice: 165, subtotal: 16500 },
    ],
    totalAmount: 64000,
    inspectionStatus: 'PASSED',
    treasuryPosted: true,
    treasuryTxRef: 'TX-BHANDAR-1726662000',
    remarks: 'Quality verified. Grain moisture below 11%. Stored in Granary Bay A & B.',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SmartBhandarProcurementDesk: React.FC = () => {
  const { activeWorkspace, currentUser } = useAuthWorkspace();
  const { addTreasuryTransaction } = useData();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<BhandarTab>('INVENTORY');

  // Storage keys for persistent state
  const inventoryKey = `sb_bhandar_items_${activeWorkspace?.id || 'default'}`;
  const recipesKey = `sb_bhandar_recipes_${activeWorkspace?.id || 'default'}`;
  const posKey = `sb_bhandar_pos_${activeWorkspace?.id || 'default'}`;
  const grnsKey = `sb_bhandar_grns_${activeWorkspace?.id || 'default'}`;

  // Persistent States
  const [items, setItems] = useState<BhandarItem[]>(() => {
    try {
      const s = localStorage.getItem(inventoryKey);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return INITIAL_ITEMS;
  });

  const [recipes, setRecipes] = useState<RecipeBOM[]>(() => {
    try {
      const s = localStorage.getItem(recipesKey);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return INITIAL_RECIPES;
  });

  const [vendors] = useState<Vendor[]>(INITIAL_VENDORS);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const s = localStorage.getItem(posKey);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return INITIAL_POS;
  });

  const [grns, setGrns] = useState<GoodsReceiptNote[]>(() => {
    try {
      const s = localStorage.getItem(grnsKey);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return INITIAL_GRNS;
  });

  // Filters & Searches
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
  const [isAcceptGRNModalOpen, setIsAcceptGRNModalOpen] = useState(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);
  const [selectedBOMForScaling, setSelectedBOMForScaling] = useState<RecipeBOM | null>(null);
  const [scaleMultiplier, setScaleMultiplier] = useState(1);
  const [viewingGRNVoucher, setViewingGRNVoucher] = useState<GoodsReceiptNote | null>(null);

  // Stock Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<BhandarItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'ADD' | 'SUBTRACT'>('ADD');

  // Persistence Helpers
  const persistItems = (newItems: BhandarItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(inventoryKey, JSON.stringify(newItems));
    } catch (e) {}
  };

  const persistPOs = (newPOs: PurchaseOrder[]) => {
    setPurchaseOrders(newPOs);
    try {
      localStorage.setItem(posKey, JSON.stringify(newPOs));
    } catch (e) {}
  };

  const persistGRNs = (newGRNs: GoodsReceiptNote[]) => {
    setGrns(newGRNs);
    try {
      localStorage.setItem(grnsKey, JSON.stringify(newGRNs));
    } catch (e) {}
  };

  const persistRecipes = (newRecipes: RecipeBOM[]) => {
    setRecipes(newRecipes);
    try {
      localStorage.setItem(recipesKey, JSON.stringify(newRecipes));
    } catch (e) {}
  };

  // =========================================================================
  // MATHEMATICAL AGGREGATIONS & LOW STOCK ALERTS
  // =========================================================================

  const inventorySummary = useMemo(() => {
    let totalPhysicalValue = 0;
    let lowStockCount = 0;
    let committedAlertCount = 0;

    items.forEach((item) => {
      const available = item.physicalStock - item.committedStock;
      totalPhysicalValue += item.physicalStock * item.unitCost;
      if (available <= item.reorderThreshold) {
        lowStockCount++;
      }
      if (available < 0) {
        committedAlertCount++;
      }
    });

    const pendingPODispatches = purchaseOrders.filter((po) => po.status === 'DISPATCHED').length;

    return {
      totalItems: items.length,
      totalPhysicalValue,
      lowStockCount,
      committedAlertCount,
      pendingPODispatches,
    };
  }, [items, purchaseOrders]);

  // Filtered Inventory
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const available = item.physicalStock - item.committedStock;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sanskritName && item.sanskritName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.storageLocation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchLowStock = !onlyLowStock || available <= item.reorderThreshold;

      return matchSearch && matchCat && matchLowStock;
    });
  }, [items, searchQuery, selectedCategory, onlyLowStock]);

  // =========================================================================
  // ACTIONS & HANDLERS
  // =========================================================================

  // 1. Auto-Draft Purchase Order from Low-Stock Item
  const handleAutoDraftPO = (item: BhandarItem) => {
    const deficit = Math.max(item.reorderThreshold * 2 - (item.physicalStock - item.committedStock), item.reorderThreshold);
    const suggestedQty = Math.ceil(deficit);
    const vendor = vendors.find((v) => v.id === item.preferredVendorId) || vendors[0];

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-${new Date().getFullYear()}-${(purchaseOrders.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorPhone: vendor.phone,
      items: [
        {
          itemId: item.id,
          itemName: item.name,
          unit: item.unit,
          quantity: suggestedQty,
          unitCost: item.unitCost,
          totalCost: suggestedQty * item.unitCost,
        },
      ],
      totalAmount: suggestedQty * item.unitCost,
      status: 'DRAFT',
      expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      notes: `Automated re-order triggered by Smart Bhandar monitor. Available stock fell below threshold (${item.reorderThreshold} ${item.unit}).`,
      generatedBy: currentUser?.name || 'Smart Bhandar Engine',
    };

    persistPOs([newPO, ...purchaseOrders]);
    setActiveTab('VENDOR_PO');
    showToast(`Draft PO ${newPO.poNumber} generated for ${item.name}! Review & dispatch to vendor. 🛒`, 'success', 'PO Drafted');
  };

  // 2. Dispatch PO via WhatsApp
  const handleDispatchPOViaWhatsApp = (po: PurchaseOrder) => {
    const templeName = activeWorkspace?.name || 'Sri Sanatan Mandir Trust';
    const itemsListText = po.items
      .map((it, idx) => `${idx + 1}. *${it.itemName}*: ${it.quantity} ${it.unit} @ ₹${it.unitCost} = ₹${it.totalCost.toLocaleString('en-IN')}`)
      .join('\n');

    const message = 
`🚩 *OFFICIAL PURCHASE ORDER - ${templeName.toUpperCase()}* 🚩
━━━━━━━━━━━━━━━━━━━━━━
*PO Number:* ${po.poNumber}
*Date:* ${po.date}
*Expected Delivery:* ${po.expectedDeliveryDate}
*Vendor:* ${po.vendorName}

*REQUIRED BHANDAR SUPPLIES:*
${itemsListText}

*Total Purchase Value:* ₹${po.totalAmount.toLocaleString('en-IN')}
*Special Notes:* ${po.notes || 'Please supply authentic fresh sattvic goods with Challan.'}

_Authorized by: ${po.generatedBy}_
_Bhandar & Rasoi Desk - Sanatani Bandhan ERP_`;

    const encoded = encodeURIComponent(message);
    const cleanPhone = po.vendorPhone.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Mark as Dispatched
    const updatedPOs = purchaseOrders.map((p) =>
      p.id === po.id
        ? { ...p, status: 'DISPATCHED' as const, dispatchedAt: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) }
        : p
    );
    persistPOs(updatedPOs);

    window.open(waUrl, '_blank');
    showToast(`PO ${po.poNumber} dispatched to ${po.vendorName} via WhatsApp! 📲`, 'success', 'WhatsApp PO Sent');
  };

  // 3. Initiate GRN from PO
  const handleOpenGRNModal = (po: PurchaseOrder) => {
    setSelectedPOForGRN(po);
    setIsAcceptGRNModalOpen(true);
  };

  // 4. Accept GRN and Post Treasury Ledger Entry
  const handleExecuteAcceptGRN = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPOForGRN) return;

    const form = e.currentTarget;
    const challanNo = (form.elements.namedItem('challanNo') as HTMLInputElement)?.value || `CH-${Date.now().toString().slice(-4)}`;
    const remarks = (form.elements.namedItem('remarks') as HTMLInputElement)?.value || 'Items received in pristine temple condition.';

    // Construct GRN Items
    const grnItems: GRNItem[] = selectedPOForGRN.items.map((it) => ({
      itemId: it.itemId,
      itemName: it.itemName,
      unit: it.unit,
      orderedQty: it.quantity,
      receivedQty: it.quantity, // 100% fulfill in this execution
      unitPrice: it.unitCost,
      subtotal: it.totalCost,
    }));

    const grnNum = `GRN-${new Date().getFullYear()}-${(grns.length + 1).toString().padStart(3, '0')}`;
    const txRef = `TX-BHANDAR-${Date.now().toString().slice(-6)}`;

    const newGRN: GoodsReceiptNote = {
      id: `grn-${Date.now()}`,
      grnNumber: grnNum,
      poNumber: selectedPOForGRN.poNumber,
      poId: selectedPOForGRN.id,
      receivedDate: new Date().toISOString().split('T')[0],
      vendorName: selectedPOForGRN.vendorName,
      invoiceChallanNo: challanNo,
      inspectedBy: currentUser?.name || 'Bhandari Karyakarta',
      items: grnItems,
      totalAmount: selectedPOForGRN.totalAmount,
      inspectionStatus: 'PASSED',
      treasuryPosted: true,
      treasuryTxRef: txRef,
      remarks,
    };

    // Step A: Increment Physical Stock of each received item
    const updatedItems = items.map((invItem) => {
      const receivedMatch = grnItems.find((g) => g.itemId === invItem.id);
      if (receivedMatch) {
        return {
          ...invItem,
          physicalStock: invItem.physicalStock + receivedMatch.receivedQty,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
      }
      return invItem;
    });

    // Step B: Mark PO as Fulfilled
    const updatedPOs = purchaseOrders.map((p) =>
      p.id === selectedPOForGRN.id ? { ...p, status: 'FULFILLED' as const } : p
    );

    // Step C: Post into Central Treasury Ledger as EXPENSE
    try {
      addTreasuryTransaction({
        workspaceId: activeWorkspace?.id || 'DEMO_ws-mandir',
        date: new Date().toISOString().split('T')[0],
        type: 'Expense',
        category: 'Bhandar & Ration Procurement',
        amount: selectedPOForGRN.totalAmount,
        handledBy: currentUser?.name || 'Bhandari Karyakarta',
        vendorName: selectedPOForGRN.vendorName,
        paymentMode: 'Bank Transfer',
        referenceNo: `${grnNum} (PO: ${selectedPOForGRN.poNumber})`,
        purpose: `Automated Bhandar GRN settlement for ${selectedPOForGRN.items.length} items. Inwarded to temple store.`,
      });
    } catch (err) {
      console.warn('Treasury auto-post simulation:', err);
    }

    persistItems(updatedItems);
    persistPOs(updatedPOs);
    persistGRNs([newGRN, ...grns]);

    setIsAcceptGRNModalOpen(false);
    setSelectedPOForGRN(null);
    setViewingGRNVoucher(newGRN);

    showToast(
      `GRN ${grnNum} Accepted! Inventory incremented & ₹${newGRN.totalAmount.toLocaleString('en-IN')} posted to Treasury Ledger! 📦⚡`,
      'success',
      'GRN & Treasury Synced'
    );
  };

  // 5. Reserve Recipe BOM Stock for an Upcoming Event
  const handleReserveRecipeStock = (recipe: RecipeBOM, multiplier: number) => {
    let hasShortage = false;
    const shortages: string[] = [];

    // Pre-check availability
    recipe.ingredients.forEach((ing) => {
      const item = items.find((i) => i.id === ing.itemId);
      const needed = ing.quantityPerUnit * multiplier;
      if (item) {
        const available = item.physicalStock - item.committedStock;
        if (available < needed) {
          hasShortage = true;
          shortages.push(`${ing.itemName} (Needs ${needed.toFixed(1)} ${ing.unit}, Only ${available.toFixed(1)} available)`);
        }
      }
    });

    if (hasShortage) {
      showToast(
        `Insufficient available stock: ${shortages.join('; ')}. Please draft a PO first.`,
        'warning',
        'Stock Shortage Alert'
      );
    }

    // Apply commitment reservation
    const updated = items.map((invItem) => {
      const match = recipe.ingredients.find((ing) => ing.itemId === invItem.id);
      if (match) {
        const commitIncrease = match.quantityPerUnit * multiplier;
        return {
          ...invItem,
          committedStock: invItem.committedStock + commitIncrease,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
      }
      return invItem;
    });

    persistItems(updated);
    setSelectedBOMForScaling(null);
    showToast(
      `Reserved ingredients for ${multiplier * recipe.baseBatchSize} units of "${recipe.name}"! Committed stock updated. 🔒`,
      'success',
      'BOM Reserved'
    );
  };

  // 6. Manual Stock Quick Adjustment
  const handleApplyStockAdjustment = () => {
    if (!adjustItem || adjustAmount <= 0) return;

    const delta = adjustType === 'ADD' ? adjustAmount : -adjustAmount;
    const newPhysical = Math.max(0, adjustItem.physicalStock + delta);

    const updated = items.map((i) =>
      i.id === adjustItem.id ? { ...i, physicalStock: newPhysical, lastUpdated: new Date().toISOString().split('T')[0] } : i
    );

    persistItems(updated);
    setAdjustItem(null);
    setAdjustAmount(0);
    showToast(
      `Adjusted ${adjustItem.name}: Physical stock is now ${newPhysical} ${adjustItem.unit}.`,
      'success',
      'Stock Adjusted'
    );
  };

  // =========================================================================
  // RENDER INTERFACE
  // =========================================================================

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* =====================================================================
          BANNER & COMMAND CENTER HEADER
      ===================================================================== */}
      <section className="bg-gradient-to-r from-stone-900 via-stone-900/95 to-amber-950/40 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                Domain 4 • Supply Chain & Temple Bhandar Command
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Storefront: <span className="text-amber-200 font-bold">{activeWorkspace?.name || 'Sri Mandir Bhandar'}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight flex items-center gap-3">
              <span>Smart Bhandar, Recipe BOM & Auto-Procurement</span>
            </h1>

            <p className="text-sm text-stone-300 mt-1 max-w-3xl leading-relaxed">
              Enterprise inventory control with mathematical stock reservation (<code className="text-amber-300 font-mono">Available = Physical - Committed</code>), automated WhatsApp purchase order dispatch, and 1-click GRN reconciliation with Central Treasury Ledger.
            </p>
          </div>

          {/* Quick Stat Pill Widget */}
          <div className="flex flex-wrap items-center gap-3 bg-stone-950/80 p-3 rounded-2xl border border-stone-800 backdrop-blur-md shrink-0">
            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Inventory Value</span>
              <span className="text-base sm:text-lg font-black text-amber-300">
                ₹{(inventorySummary.totalPhysicalValue / 100000).toFixed(2)} Lakh
              </span>
            </div>

            <div className="text-center px-3 border-r border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-black block">Low-Stock Alerts</span>
              <span className={`text-base sm:text-lg font-black ${inventorySummary.lowStockCount > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {inventorySummary.lowStockCount} Items
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddItemModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bhandar Item</span>
            </button>
          </div>
        </div>

        {/* 4-Tab Navigation Architecture */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('INVENTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'INVENTORY'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>TAB 1: 📦 Live Inventory & Stock Alerts</span>
            {inventorySummary.lowStockCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {inventorySummary.lowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECIPE_BOM')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'RECIPE_BOM'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Scroll className="w-4 h-4" />
            <span>TAB 2: 📜 Recipe BOM (Bill of Materials) Engine</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-stone-950 text-amber-300">
              {recipes.length} Standard Recipes
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VENDOR_PO')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'VENDOR_PO'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>TAB 3: 🛒 Vendor PO Dispatch & WhatsApp</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-stone-950 text-amber-300">
              {purchaseOrders.length} POs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GRN_TREASURY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'GRN_TREASURY'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-lg shadow-amber-500/30'
                : 'bg-stone-900/80 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>TAB 4: 📥 GRN (Goods Receipt) & Treasury Sync</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Double-Entry Auto
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          TAB 1: LIVE INVENTORY & STOCK ALERTS
      ===================================================================== */}
      {activeTab === 'INVENTORY' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Mathematical Rule Banner */}
          <div className="bg-stone-900/80 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-amber-300 block">
                  Bhandar Shastric Guardrail: Dual-Tier Stock Computation
                </span>
                <p className="text-stone-300">
                  <strong className="text-white">Available Stock</strong> = Physical Stock (Vault Floor) - Committed Stock (Reserved for upcoming Yagnas, Pujas & Annadanam).
                  When Available Stock drops below the Reorder Threshold, instant auto-draft PO actions are activated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOnlyLowStock(!onlyLowStock)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  onlyLowStock
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                }`}
              >
                {onlyLowStock ? 'Showing Critical Items Only' : 'Filter Critical Low Stock'}
              </button>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-900/90 p-4 rounded-3xl border border-stone-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search item, Sanskrit name, storage vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">All Bhandar Categories</option>
                <option value="Dairy & Ghee">Dairy & Ghee</option>
                <option value="Annadanam Ration">Annadanam Ration</option>
                <option value="Puja Samagri">Puja Samagri</option>
                <option value="Sacred Herbs">Sacred Herbs</option>
                <option value="Spices & Oils">Spices & Oils</option>
                <option value="Dry Fruits & Sweets">Dry Fruits & Sweets</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New Bhandar SKU</span>
              </button>
            </div>
          </div>

          {/* Master Inventory Data Grid */}
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 shadow-2xl p-6">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-950 border-b border-stone-800 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">Item & Sanskrit Spec</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 text-right">Physical Stock</th>
                    <th className="py-3 px-4 text-right">Committed</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-right">Reorder Threshold</th>
                    <th className="py-3 px-4 text-right">Unit Rate (₹)</th>
                    <th className="py-3 px-4 text-center">Health Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredItems.map((item) => {
                    const available = item.physicalStock - item.committedStock;
                    const isDeficit = available < 0;
                    const isLow = available <= item.reorderThreshold;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isDeficit
                            ? 'bg-rose-950/20 hover:bg-rose-950/30'
                            : isLow
                            ? 'bg-amber-950/20 hover:bg-amber-950/30'
                            : 'hover:bg-stone-800/40'
                        }`}
                      >
                        {/* Name & Sanskrit */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{item.name}</div>
                          {item.sanskritName && (
                            <span className="text-[11px] text-amber-300 font-serif block">
                              {item.sanskritName}
                            </span>
                          )}
                          <span className="text-[10px] text-stone-500 font-mono block mt-0.5">
                            📍 {item.storageLocation}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-300 border border-stone-700">
                            {item.category}
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-4 text-center font-mono text-stone-300">
                          {item.unit}
                        </td>

                        {/* Physical Stock */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-200">
                          {item.physicalStock.toLocaleString('en-IN')}
                        </td>

                        {/* Committed Stock */}
                        <td className="py-3.5 px-4 text-right font-mono text-amber-400 font-bold">
                          {item.committedStock.toLocaleString('en-IN')}
                        </td>

                        {/* Available Stock */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm">
                          <span className={isDeficit ? 'text-rose-400' : isLow ? 'text-amber-300' : 'text-emerald-400'}>
                            {available.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Reorder Threshold */}
                        <td className="py-3.5 px-4 text-right font-mono text-stone-400">
                          {item.reorderThreshold}
                        </td>

                        {/* Unit Cost */}
                        <td className="py-3.5 px-4 text-right font-mono text-stone-300">
                          ₹{item.unitCost.toLocaleString('en-IN')}
                        </td>

                        {/* Status Flag */}
                        <td className="py-3.5 px-4 text-center">
                          {isDeficit ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              DEFICIT
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black inline-flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              OPTIMAL
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isLow && (
                              <button
                                type="button"
                                onClick={() => handleAutoDraftPO(item)}
                                className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[10px] flex items-center gap-1 shadow transition-transform active:scale-95 cursor-pointer"
                                title="Generate Instant PO"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>Draft PO</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setAdjustItem(item);
                                setAdjustAmount(0);
                                setAdjustType('ADD');
                              }}
                              className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-[10px] transition-colors cursor-pointer"
                              title="Stock Inward/Outward Adjustment"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: RECIPE BOM (BILL OF MATERIALS) ENGINE
      ===================================================================== */}
      {activeTab === 'RECIPE_BOM' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Header & Description */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/80 p-5 rounded-3xl border border-stone-800">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Scroll className="w-4 h-4 text-amber-400" />
                <span>Recipe Bill of Materials (BOM) Standard Directory</span>
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Configure standardized ingredient requirements for Yagnas, Rudrabhishekam, and Annadanam. Calculate exact batch requirements and commit stock in real time.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddRecipeModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Configure New Recipe BOM</span>
            </button>
          </div>

          {/* Recipe BOM Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-stone-900/90 rounded-3xl border border-stone-800 p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {recipe.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono font-bold">
                      Base: {recipe.baseUnitLabel}
                    </span>
                  </div>

                  <h4 className="text-base font-black text-white leading-snug">{recipe.name}</h4>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>

                  {/* Ingredient Ingredients List */}
                  <div className="mt-4 pt-3 border-t border-stone-800 space-y-2">
                    <span className="text-[10px] text-stone-500 uppercase font-black tracking-wider block">
                      Required Ingredients ({recipe.ingredients.length} Items):
                    </span>

                    <div className="space-y-1.5 bg-stone-950 p-3 rounded-2xl border border-stone-800/80">
                      {recipe.ingredients.map((ing, idx) => {
                        const invItem = items.find((i) => i.id === ing.itemId);
                        const available = invItem ? invItem.physicalStock - invItem.committedStock : 0;
                        const isSufficient = available >= ing.quantityPerUnit;

                        return (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-stone-300 truncate max-w-[170px]">{ing.itemName}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-amber-300 font-bold">
                                {ing.quantityPerUnit} {ing.unit}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isSufficient ? 'bg-emerald-400' : 'bg-rose-500'
                                }`}
                                title={isSufficient ? 'In Stock' : 'Shortage'}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBOMForScaling(recipe);
                      setScaleMultiplier(recipe.type === 'ANNADANAM_MEALS' ? 5 : 1);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Scale Batch & Reserve Stock</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: VENDOR PO DISPATCH & WHATSAPP
      ===================================================================== */}
      {activeTab === 'VENDOR_PO' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <span>Vendor Purchase Order (PO) Management & Dispatch</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Generate procurement orders for trusted temple vendors and dispatch immediately via official WhatsApp strings.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsNewPOModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Manual PO</span>
            </button>
          </div>

          {/* Purchase Orders Table */}
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 shadow-2xl p-6">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-950 border-b border-stone-800 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">PO Number & Date</th>
                    <th className="py-3 px-4">Vendor & Phone</th>
                    <th className="py-3 px-4">Line Items</th>
                    <th className="py-3 px-4 text-right">Total Value (₹)</th>
                    <th className="py-3 px-4">Expected Delivery</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {purchaseOrders.map((po) => {
                    const isFulfilled = po.status === 'FULFILLED';
                    const isDispatched = po.status === 'DISPATCHED';

                    return (
                      <tr key={po.id} className="hover:bg-stone-800/40 transition-colors">
                        {/* PO No */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-white text-sm">{po.poNumber}</div>
                          <span className="text-[10px] text-stone-400 font-mono">{po.date}</span>
                        </td>

                        {/* Vendor */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-amber-200">{po.vendorName}</div>
                          <span className="text-[11px] text-stone-400 font-mono">+{po.vendorPhone}</span>
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {po.items.map((it, idx) => (
                              <div key={idx} className="text-[11px] text-stone-300">
                                • {it.itemName} ({it.quantity} {it.unit})
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-amber-300 text-sm">
                          ₹{po.totalAmount.toLocaleString('en-IN')}
                        </td>

                        {/* Expected Delivery */}
                        <td className="py-3.5 px-4 text-stone-300 font-mono">
                          {po.expectedDeliveryDate}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {isFulfilled ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
                              FULFILLED
                            </span>
                          ) : isDispatched ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                              DISPATCHED
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 text-[10px] font-black">
                              DRAFT
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* WhatsApp Dispatch Button */}
                            {!isFulfilled && (
                              <button
                                type="button"
                                onClick={() => handleDispatchPOViaWhatsApp(po)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                                title="Send via WhatsApp to Vendor"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>{isDispatched ? 'Resend WA' : 'Dispatch WA'}</span>
                              </button>
                            )}

                            {/* Inward / GRN Button */}
                            {!isFulfilled && (
                              <button
                                type="button"
                                onClick={() => handleOpenGRNModal(po)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                                title="Accept Goods Receipt Note & Post to Treasury"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Inward GRN</span>
                              </button>
                            )}

                            {isFulfilled && (
                              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Stock Inwarded
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 4: GRN (GOODS RECEIPT NOTE) & TREASURY SYNC
      ===================================================================== */}
      {activeTab === 'GRN_TREASURY' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Double Entry Notice */}
          <div className="bg-stone-900/80 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-emerald-300">
                Automated Double-Entry Synchronization Protocol:
              </span>
              <p className="text-stone-300 leading-relaxed">
                When a Goods Receipt Note (GRN) is accepted, the system simultaneously updates two operational databases in real time:
                (1) <strong>Physical Stock Balance</strong> in the Bhandar Vault is incremented by the verified quantity, and
                (2) An <strong>Expense Ledger Entry</strong> is automatically posted to the Central Treasury (<code className="text-amber-300 font-mono">Bhandar & Ration Procurement</code>), eliminating manual accountant reconciliation.
              </p>
            </div>
          </div>

          {/* GRN Register Table */}
          <div className="bg-stone-900/90 rounded-3xl border border-stone-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Historical GRN & Treasury Inward Register</span>
              </h3>
              <span className="text-xs text-stone-400 font-mono">
                {grns.length} Verified Inwards
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-950 border-b border-stone-800 text-stone-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="py-3 px-4">GRN & PO Ref</th>
                    <th className="py-3 px-4">Receipt Date</th>
                    <th className="py-3 px-4">Vendor & Challan</th>
                    <th className="py-3 px-4">Inspected By</th>
                    <th className="py-3 px-4 text-right">Inward Value (₹)</th>
                    <th className="py-3 px-4 text-center">Quality Status</th>
                    <th className="py-3 px-4 text-center">Treasury Sync</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {grns.map((grn) => (
                    <tr key={grn.id} className="hover:bg-stone-800/40 transition-colors">
                      {/* GRN & PO */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white text-sm">{grn.grnNumber}</div>
                        <span className="text-[10px] text-amber-300 font-mono">Ref: {grn.poNumber}</span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-stone-300">
                        {grn.receivedDate}
                      </td>

                      {/* Vendor & Challan */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{grn.vendorName}</div>
                        <span className="text-[10px] text-stone-400 font-mono">Inv/Challan: {grn.invoiceChallanNo}</span>
                      </td>

                      {/* Inspected By */}
                      <td className="py-3.5 px-4 text-stone-300 font-medium">
                        {grn.inspectedBy}
                      </td>

                      {/* Value */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-300 text-sm">
                        ₹{grn.totalAmount.toLocaleString('en-IN')}
                      </td>

                      {/* Quality */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {grn.inspectionStatus}
                        </span>
                      </td>

                      {/* Treasury Ref */}
                      <td className="py-3.5 px-4 text-center">
                        {grn.treasuryPosted ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              POSTED TO TREASURY
                            </span>
                            <span className="text-[9px] text-stone-500 font-mono mt-0.5">
                              {grn.treasuryTxRef}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-500">Pending</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingGRNVoucher(grn)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          View Voucher
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODAL: ACCEPT GRN & POST TO TREASURY
      ===================================================================== */}
      {isAcceptGRNModalOpen && selectedPOForGRN && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Goods Receipt Note (GRN) Inward
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Inward Supplies for {selectedPOForGRN.poNumber}
                </h3>
                <span className="text-xs text-stone-400 font-mono">
                  Vendor: <strong className="text-amber-200">{selectedPOForGRN.vendorName}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAcceptGRNModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAcceptGRN} className="space-y-4 text-xs">
              <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                <span className="text-[10px] text-stone-400 uppercase font-black block">
                  Items to Inward:
                </span>
                {selectedPOForGRN.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-white font-medium">{it.itemName}</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {it.quantity} {it.unit} (₹{it.totalCost.toLocaleString('en-IN')})
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-white text-sm">
                  <span>Total Inward Value:</span>
                  <span className="text-emerald-400">₹{selectedPOForGRN.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Vendor Invoice / Delivery Challan Number *
                </label>
                <input
                  type="text"
                  name="challanNo"
                  defaultValue={`CH-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`}
                  required
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Quality Inspection & Remarks
                </label>
                <textarea
                  name="remarks"
                  defaultValue="Pure and unadulterated shastric goods verified. Moisture and aroma optimal."
                  rows={2}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-stone-300 text-[11px] leading-relaxed">
                ⚡ <strong>Treasury Handoff:</strong> Clicking "Accept GRN" will automatically update stock in Bhandar and log an expense transaction in the Mandir Treasury under <em>Bhandar & Ration Procurement</em>.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAcceptGRNModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept GRN & Post Treasury</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SCALE RECIPE BOM & RESERVE STOCK
      ===================================================================== */}
      {selectedBOMForScaling && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Recipe BOM Scaling & Stock Reservation
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {selectedBOMForScaling.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBOMForScaling(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-stone-300 font-bold block mb-1">
                  Target Event Multiplier / Batches
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={scaleMultiplier}
                    onChange={(e) => setScaleMultiplier(Math.max(1, Number(e.target.value) || 1))}
                    className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-stone-400 font-bold">
                    = {scaleMultiplier * selectedBOMForScaling.baseBatchSize} Units ({selectedBOMForScaling.baseUnitLabel})
                  </span>
                </div>
              </div>

              {/* Scaled Requirements Table */}
              <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2">
                <span className="text-[10px] text-stone-400 uppercase font-black block">
                  Scaled Ingredient Calculation & Stock Verification:
                </span>

                <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                  {selectedBOMForScaling.ingredients.map((ing, idx) => {
                    const totalNeeded = ing.quantityPerUnit * scaleMultiplier;
                    const inv = items.find((i) => i.id === ing.itemId);
                    const available = inv ? inv.physicalStock - inv.committedStock : 0;
                    const isAvailable = available >= totalNeeded;

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isAvailable
                            ? 'bg-stone-900 border-stone-800'
                            : 'bg-rose-950/20 border-rose-500/40'
                        }`}
                      >
                        <div>
                          <span className="text-white font-bold block">{ing.itemName}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            Available: {available.toFixed(1)} {ing.unit} | Needed: {totalNeeded.toFixed(1)} {ing.unit}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-amber-300 block">
                            {totalNeeded.toFixed(1)} {ing.unit}
                          </span>
                          <span
                            className={`text-[9px] font-bold ${
                              isAvailable ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isAvailable ? '✓ In Stock' : '⚠️ Shortage'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setSelectedBOMForScaling(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleReserveRecipeStock(selectedBOMForScaling, scaleMultiplier)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Stock Reservation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: QUICK STOCK ADJUSTMENT
      ===================================================================== */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Stock Adjustment</span>
                <h3 className="text-base font-black text-white mt-0.5">{adjustItem.name}</h3>
                <span className="text-xs text-stone-400 font-mono">Current Physical: {adjustItem.physicalStock} {adjustItem.unit}</span>
              </div>
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('ADD')}
                  className={`flex-1 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
                    adjustType === 'ADD' ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  + Inward (Restock)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('SUBTRACT')}
                  className={`flex-1 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
                    adjustType === 'SUBTRACT' ? 'bg-rose-600 text-white' : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  - Outward (Damaged/Used)
                </button>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Quantity ({adjustItem.unit})</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={adjustAmount || ''}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  placeholder={`Amount in ${adjustItem.unit}`}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyStockAdjustment}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
                >
                  Apply Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD NEW BHANDAR ITEM
      ===================================================================== */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Inventory Catalog</span>
                <h3 className="text-lg font-black text-white mt-0.5">Register New Bhandar Item</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const sanskrit = (form.elements.namedItem('sanskrit') as HTMLInputElement).value;
                const category = (form.elements.namedItem('category') as HTMLSelectElement).value as any;
                const unit = (form.elements.namedItem('unit') as HTMLSelectElement).value as any;
                const physicalStock = Number((form.elements.namedItem('physicalStock') as HTMLInputElement).value) || 0;
                const reorder = Number((form.elements.namedItem('reorder') as HTMLInputElement).value) || 10;
                const unitCost = Number((form.elements.namedItem('unitCost') as HTMLInputElement).value) || 100;
                const location = (form.elements.namedItem('location') as HTMLInputElement).value || 'Main Bhandar Vault';

                const newItem: BhandarItem = {
                  id: `itm-${Date.now()}`,
                  name,
                  sanskritName: sanskrit || undefined,
                  category,
                  unit,
                  physicalStock,
                  committedStock: 0,
                  reorderThreshold: reorder,
                  unitCost,
                  preferredVendorId: vendors[0].id,
                  storageLocation: location,
                  lastUpdated: new Date().toISOString().split('T')[0],
                };

                persistItems([newItem, ...items]);
                setIsAddItemModalOpen(false);
                showToast(`Registered "${name}" into Bhandar master catalog! 📦`, 'success');
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-stone-300 font-bold block mb-1">Item Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Kashmiri Kesar / Saffron"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-stone-300 font-bold block mb-1">Sanskrit / Shastric Name</label>
                  <input
                    type="text"
                    name="sanskrit"
                    placeholder="e.g. Kumkuma (कुङ्कुम)"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Category *</label>
                  <select
                    name="category"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Puja Samagri">Puja Samagri</option>
                    <option value="Annadanam Ration">Annadanam Ration</option>
                    <option value="Dairy & Ghee">Dairy & Ghee</option>
                    <option value="Dry Fruits & Sweets">Dry Fruits & Sweets</option>
                    <option value="Spices & Oils">Spices & Oils</option>
                    <option value="Sacred Herbs">Sacred Herbs</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Measurement Unit *</label>
                  <select
                    name="unit"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="grams">grams</option>
                    <option value="tin (15L)">tin (15L)</option>
                    <option value="bundle">bundle</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Physical Stock</label>
                  <input
                    type="number"
                    name="physicalStock"
                    defaultValue={10}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    name="reorder"
                    defaultValue={15}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Rate / Unit (₹)</label>
                  <input
                    type="number"
                    name="unitCost"
                    defaultValue={250}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Storage Room / Vault</label>
                <input
                  type="text"
                  name="location"
                  placeholder="e.g. Vault 3 - Fragrant Herbs Cabinet"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: VIEW PRINTABLE GRN VOUCHER
      ===================================================================== */}
      {viewingGRNVoucher && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Official Goods Receipt Voucher
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {viewingGRNVoucher.grnNumber}
                </h3>
                <span className="text-xs text-stone-400 font-mono">
                  Linked PO: {viewingGRNVoucher.poNumber} | Date: {viewingGRNVoucher.receivedDate}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingGRNVoucher(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-stone-950 p-4 rounded-2xl border border-stone-800">
              <div className="flex justify-between">
                <span className="text-stone-400">Vendor:</span>
                <span className="text-white font-bold">{viewingGRNVoucher.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Challan / Invoice:</span>
                <span className="text-amber-300 font-mono">{viewingGRNVoucher.invoiceChallanNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Inspecting Officer:</span>
                <span className="text-stone-200">{viewingGRNVoucher.inspectedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Treasury Entry Ref:</span>
                <span className="text-emerald-400 font-mono font-bold">{viewingGRNVoucher.treasuryTxRef}</span>
              </div>

              <div className="pt-2 border-t border-stone-800 space-y-1.5">
                <span className="text-[10px] text-stone-400 uppercase font-black block">Inward Line Items:</span>
                {viewingGRNVoucher.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-stone-300">{it.itemName} ({it.receivedQty} {it.unit})</span>
                    <span className="font-mono text-amber-300 font-bold">₹{it.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-white text-sm">
                <span>Total Settled Inward:</span>
                <span className="text-emerald-400">₹{viewingGRNVoucher.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingGRNVoucher(null)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE MANUAL PURCHASE ORDER
      ===================================================================== */}
      {isNewPOModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Procurement Desk</span>
                <h3 className="text-lg font-black text-white mt-0.5">Draft Purchase Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPOModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const vendorId = (form.elements.namedItem('vendorId') as HTMLSelectElement).value;
                const itemId = (form.elements.namedItem('itemId') as HTMLSelectElement).value;
                const qty = Number((form.elements.namedItem('qty') as HTMLInputElement).value) || 1;
                const notes = (form.elements.namedItem('notes') as HTMLInputElement).value;

                const vendor = vendors.find((v) => v.id === vendorId) || vendors[0];
                const item = items.find((i) => i.id === itemId) || items[0];

                const newPO: PurchaseOrder = {
                  id: `po-${Date.now()}`,
                  poNumber: `PO-${new Date().getFullYear()}-${(purchaseOrders.length + 1).toString().padStart(3, '0')}`,
                  date: new Date().toISOString().split('T')[0],
                  vendorId: vendor.id,
                  vendorName: vendor.name,
                  vendorPhone: vendor.phone,
                  items: [
                    {
                      itemId: item.id,
                      itemName: item.name,
                      unit: item.unit,
                      quantity: qty,
                      unitCost: item.unitCost,
                      totalCost: qty * item.unitCost,
                    },
                  ],
                  totalAmount: qty * item.unitCost,
                  status: 'DRAFT',
                  expectedDeliveryDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
                  notes: notes || 'Standard procurement order.',
                  generatedBy: currentUser?.name || 'Bhandari Karyakarta',
                };

                persistPOs([newPO, ...purchaseOrders]);
                setIsNewPOModalOpen(false);
                showToast(`Draft PO ${newPO.poNumber} created successfully!`, 'success');
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="text-stone-300 font-bold block mb-1">Select Preferred Vendor *</label>
                <select
                  name="vendorId"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Select Bhandar Item *</label>
                  <select
                    name="itemId"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.unit} @ ₹{i.unitCost})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Quantity to Order *</label>
                  <input
                    type="number"
                    name="qty"
                    min={1}
                    defaultValue={10}
                    required
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Special Delivery Notes</label>
                <textarea
                  name="notes"
                  placeholder="e.g. Please supply fresh batches for upcoming Purnima festival."
                  rows={2}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewPOModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Save Draft PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD NEW RECIPE BOM
      ===================================================================== */}
      {isAddRecipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Recipe Engineering</span>
                <h3 className="text-lg font-black text-white mt-0.5">Configure Shastric Recipe BOM</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRecipeModalOpen(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const type = (form.elements.namedItem('type') as HTMLSelectElement).value as any;
                const baseUnitLabel = (form.elements.namedItem('baseUnitLabel') as HTMLInputElement).value;
                const baseBatchSize = Number((form.elements.namedItem('baseBatchSize') as HTMLInputElement).value) || 1;
                const description = (form.elements.namedItem('description') as HTMLInputElement).value;

                // Pick first 2 items as initial template
                const newRecipe: RecipeBOM = {
                  id: `bom-${Date.now()}`,
                  name,
                  type,
                  baseUnitLabel,
                  baseBatchSize,
                  description: description || 'Shastric recipe proportion.',
                  ingredients: [
                    { itemId: items[0].id, itemName: items[0].name, unit: items[0].unit, quantityPerUnit: 1 },
                    { itemId: items[1].id, itemName: items[1].name, unit: items[1].unit, quantityPerUnit: 2 },
                  ],
                };

                persistRecipes([newRecipe, ...recipes]);
                setIsAddRecipeModalOpen(false);
                showToast(`Recipe BOM "${name}" created successfully!`, 'success');
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="text-stone-300 font-bold block mb-1">Recipe / Ritual Title *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Satyanarayan Vrat Katha & Prasad"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Type *</label>
                  <select
                    name="type"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PUJA_SAMAGRI">Puja Samagri</option>
                    <option value="ANNADANAM_MEALS">Annadanam Meals</option>
                    <option value="HAVAN_SACRED_FIRE">Havan Sacred Fire</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-300 font-bold block mb-1">Base Batch Size</label>
                  <input
                    type="number"
                    name="baseBatchSize"
                    defaultValue={1}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Base Unit Label *</label>
                <input
                  type="text"
                  name="baseUnitLabel"
                  required
                  defaultValue="1 Pooja Sankalp"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-300 font-bold block mb-1">Description / Shastric Instructions</label>
                <textarea
                  name="description"
                  placeholder="Details on preparation, required offering vessels, etc."
                  rows={2}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddRecipeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-lg cursor-pointer"
                >
                  Save Recipe BOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartBhandarProcurementDesk;
