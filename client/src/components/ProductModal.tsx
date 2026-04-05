/*
  DESIGN: Dark Forge — Product Modal
  Create or edit a store product. Stripe Connect required.
*/
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  X, Save, Loader2, Trash2, Package, DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export interface StoreProduct {
  _id: string;
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  type: string;
  shippingCost?: number;
  inventory?: number;
  sold?: number;
  imageUrl?: string;
  active: boolean;
  createdAt: number;
}

interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  product: StoreProduct | null;
  isCreate?: boolean;
  onCreateProduct: (data: {
    name: string;
    description?: string;
    price: number;
    type: string;
    inventory?: number;
    shippingCost?: number;
  }) => Promise<void>;
  onUpdateProduct: (data: {
    productId: string;
    name?: string;
    description?: string;
    inventory?: number;
    shippingCost?: number;
    active?: boolean;
    imageUrl?: string;
  }) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
}

export default function ProductModal({
  open, onClose, product, isCreate,
  onCreateProduct, onUpdateProduct, onDeleteProduct,
}: ProductModalProps) {
  const [form, setForm] = useState(() => initForm(product));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inventoryMode, setInventoryMode] = useState<"unlimited" | "limited">(
    product?.inventory != null ? "limited" : "unlimited"
  );

  function initForm(p: StoreProduct | null) {
    if (p) return {
      name: p.name,
      description: p.description || "",
      price: p.amount / 100,
      type: p.type,
      inventory: p.inventory ?? 0,
      shippingCost: (p.shippingCost ?? 0) / 100,
      imageUrl: p.imageUrl || "",
      active: p.active,
    };
    return {
      name: "", description: "", price: 0, type: "one_time",
      inventory: 0, shippingCost: 0, imageUrl: "", active: true,
    };
  }

  // Reset form when product changes
  const productId = product?._id || "";
  const [prevId, setPrevId] = useState(productId);
  if (productId !== prevId) {
    setPrevId(productId);
    setForm(initForm(product));
    setInventoryMode(product?.inventory != null ? "limited" : "unlimited");
    setShowDeleteConfirm(false);
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name required"); return; }
    if (isCreate && form.price <= 0) { toast.error("Price must be greater than 0"); return; }
    setSaving(true);
    try {
      if (isCreate) {
        await onCreateProduct({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: Math.round(form.price * 100),
          type: form.type,
          inventory: inventoryMode === "limited" ? form.inventory : undefined,
          shippingCost: form.shippingCost > 0 ? Math.round(form.shippingCost * 100) : undefined,
        });
        toast.success("Product created");
      } else if (product) {
        await onUpdateProduct({
          productId: product._id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          inventory: inventoryMode === "limited" ? form.inventory : undefined,
          shippingCost: form.shippingCost > 0 ? Math.round(form.shippingCost * 100) : undefined,
          active: form.active,
          imageUrl: form.imageUrl.trim() || undefined,
        });
        toast.success("Product updated");
      }
      onClose();
    } catch {
      toast.error(isCreate ? "Failed to create product" : "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setDeleting(true);
    try {
      await onDeleteProduct(product._id);
      toast.success("Product deleted");
      onClose();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[oklch(0.14_0.005_250)] border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">
          {isCreate ? "Add Product" : `Edit — ${product?.name}`}
        </DialogTitle>

        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gold" />
            <h3 className="text-base font-heading font-bold text-foreground">
              {isCreate ? "Add Product" : "Edit Product"}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Product Name</label>
            <input
              type="text"
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Custom Portrait Commission"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Description</label>
            <textarea
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors resize-y"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {/* Price + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Price {!isCreate && <span className="text-muted-foreground/50">(read-only)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  className="w-full bg-input border border-border rounded-md pl-7 pr-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors disabled:opacity-50"
                  value={form.price.toFixed(2)}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value || "0") }))}
                  step="0.01"
                  min="0"
                  disabled={!isCreate}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Type {!isCreate && <span className="text-muted-foreground/50">(read-only)</span>}
              </label>
              <select
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors disabled:opacity-50"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                disabled={!isCreate}
              >
                <option value="one_time">One-time</option>
                <option value="recurring">Recurring (monthly)</option>
              </select>
            </div>
          </div>

          {/* Inventory */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inventory</label>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-[oklch(0.15_0.005_250)] rounded-md p-0.5">
                <button
                  onClick={() => setInventoryMode("unlimited")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    inventoryMode === "unlimited" ? "bg-[oklch(0.22_0.005_250)] text-gold" : "text-muted-foreground"
                  }`}
                >
                  Unlimited
                </button>
                <button
                  onClick={() => setInventoryMode("limited")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    inventoryMode === "limited" ? "bg-[oklch(0.22_0.005_250)] text-gold" : "text-muted-foreground"
                  }`}
                >
                  Limited
                </button>
              </div>
              {inventoryMode === "limited" && (
                <input
                  type="number"
                  className="w-24 bg-input border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                  value={form.inventory}
                  onChange={(e) => setForm((f) => ({ ...f, inventory: parseInt(e.target.value || "0") }))}
                  min="0"
                  placeholder="Qty"
                />
              )}
            </div>
          </div>

          {/* Shipping */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Shipping Cost</label>
            <div className="relative w-32">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                className="w-full bg-input border border-border rounded-md pl-7 pr-3 py-2 text-sm text-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={form.shippingCost.toFixed(2)}
                onChange={(e) => setForm((f) => ({ ...f, shippingCost: parseFloat(e.target.value || "0") }))}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60">$0 = free shipping</p>
          </div>

          {/* Image URL (edit mode only) */}
          {!isCreate && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Image URL</label>
              <input
                type="text"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          )}

          {/* Active toggle (edit mode only) */}
          {!isCreate && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? "bg-gold" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-muted-foreground">{form.active ? "Active" : "Inactive"}</span>
              </label>
            </div>
          )}

          {/* Sold count (edit mode, read-only) */}
          {!isCreate && product && (product.sold ?? 0) > 0 && (
            <div className="bg-[oklch(0.16_0.005_250)] border border-border rounded-lg p-3 text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{product.sold}</span> sold
              {product.inventory != null && <> of <span className="text-foreground font-medium">{product.inventory}</span></>}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            {!isCreate && product && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Delete this product?</span>
                    <Button onClick={handleDelete} disabled={deleting} size="sm"
                      className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, delete"}
                    </Button>
                    <Button onClick={() => setShowDeleteConfirm(false)} size="sm" variant="ghost"
                      className="text-muted-foreground">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setShowDeleteConfirm(true)} size="sm"
                    className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
                  </Button>
                )}
              </>
            )}
            {isCreate && <div />}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gold text-[oklch(0.13_0.005_250)] hover:bg-gold/90 font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              {isCreate ? "Create Product" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
