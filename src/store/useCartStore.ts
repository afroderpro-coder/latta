import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // product_id or variant_id
  productId: string;
  storeId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  variant?: {
    size: string;
    color: string;
  };
}

export interface ToastInfo {
  show: boolean;
  message: string;
  item?: {
    name: string;
    imageUrl?: string;
    price?: number;
    quantity?: number;
  };
}

interface CartState {
  items: CartItem[];
  toast: ToastInfo;
  addItem: (item: CartItem, customMessage?: string) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  showToast: (message?: string, item?: Partial<CartItem>) => void;
  hideToast: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      toast: {
        show: false,
        message: "",
      },
      addItem: (newItem, customMessage) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === newItem.id);
          const updatedItems = existingItem
            ? state.items.map((item) =>
                item.id === newItem.id
                  ? { ...item, quantity: item.quantity + newItem.quantity }
                  : item
              )
            : [...state.items, newItem];

          return {
            items: updatedItems,
            toast: {
              show: true,
              message: customMessage || "Added to cart successfully !!",
              item: {
                name: newItem.name,
                imageUrl: newItem.imageUrl,
                price: newItem.price,
                quantity: newItem.quantity,
              },
            },
          };
        });
      },
      showToast: (message = "Added to cart successfully !!", item) => {
        set({
          toast: {
            show: true,
            message,
            item: item
              ? {
                  name: item.name || "",
                  imageUrl: item.imageUrl || "",
                  price: item.price || 0,
                  quantity: item.quantity || 1,
                }
              : undefined,
          },
        });
      },
      hideToast: () => {
        set((state) => ({
          toast: {
            ...state.toast,
            show: false,
          },
        }));
      },
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },
      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'luxe-cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
