/**
 * 訪客購物車工具（儲存於 localStorage）
 * 登入後由 /api/cart/merge 合併至伺服器
 */

interface GuestCartItem {
  productId: string;
  quantity: number;
}

const KEY = 'guest_cart';

export function getGuestCart(): GuestCartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addToGuestCart(productId: string, quantity: number) {
  const cart = getGuestCart();
  const existing = cart.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function removeFromGuestCart(productId: string) {
  const cart = getGuestCart().filter(i => i.productId !== productId);
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function clearGuestCart() {
  localStorage.removeItem(KEY);
}

export function getGuestCartCount(): number {
  return getGuestCart().reduce((s, i) => s + i.quantity, 0);
}
