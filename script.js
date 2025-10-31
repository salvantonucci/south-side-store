// === SISTEMA DE CARRITO ===
// Use a namespaced localStorage key to avoid collisions and make debugging easier
const CART_KEY = 'southside_cart_v1';
// Keep a separate namespaced map of product prices so pages can stay in sync
const PRODUCTS_KEY = 'southside_products_v1';

// Migrate from old 'cart' key if present
const _old = localStorage.getItem('cart');
if (_old && !localStorage.getItem(CART_KEY)) {
  try {
    localStorage.setItem(CART_KEY, _old);
    console.info('Migrated cart data from legacy key `cart` to namespaced key.');
  } catch (e) {
    console.warn('Could not migrate legacy cart key:', e);
  }
}

let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

// Safe loader to refresh `cart` variable from localStorage
function loadCartFromStorage() {
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    cart = [];
  }
}

// Small visual badge to show cart count in the header/nav
function updateCartBadge() {
  // find cart link (by href)
  const cartLink = document.querySelector('a[href="cart.html"]');
  if (!cartLink) return;
  // ensure badge element
  let badge = document.getElementById('cart-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'cart-badge';
    badge.style.minWidth = '20px';
    badge.style.height = '20px';
    badge.style.padding = '2px 6px';
    badge.style.background = '#ff007b';
    badge.style.color = '#111';
    badge.style.borderRadius = '999px';
    badge.style.fontSize = '0.8rem';
    badge.style.fontWeight = '700';
    badge.style.marginLeft = '8px';
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    cartLink.appendChild(badge);
  }
  // show count
  const count = (cart && cart.length) ? cart.length : 0;
  badge.textContent = String(count);
}

// Load products map from localStorage (productName -> price)
function loadProductsMap() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveProductsMap(map) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Could not save products map', e);
  }
}

// Attempt to parse a price string like "$28.000 ARS" or "28000" into a number
function parsePriceString(str) {
  if (!str && str !== 0) return null;
  // Remove currency symbols, dots, commas and non-digits
  const cleaned = String(str).replace(/[^0-9\-]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

// If we're on the shop page, read product cards and update the products map so prices stay authoritative
function syncProductsFromShopDOM() {
  // Build map keyed by product id: { id: { name, price } }
  const products = {};
  document.querySelectorAll('.product').forEach(card => {
    const nameEl = card.querySelector('h3');
    const priceEl = card.querySelector('p');
    if (!nameEl) return;
    const name = nameEl.textContent.trim();
    // id comes from data-id or is a slug of the name
    const id = (card.dataset && card.dataset.id) ? card.dataset.id : slugify(name);
    // prefer visible price text first so UI and cart match what user sees
    let price = null;
    if (priceEl) {
      price = parsePriceString(priceEl.textContent);
    }
    // fallback to data-price attribute if visible text is not parseable
    if (price === null && card.dataset && card.dataset.price) {
      price = parsePriceString(card.dataset.price);
    }
    products[id] = { name, price };
  });

  // migrate/merge with existing map (support old format where keys were names -> price number)
  const existing = loadProductsMap();
  const migrated = {};
  Object.keys(existing || {}).forEach(k => {
    const v = existing[k];
    if (v && typeof v === 'object' && ('name' in v || 'price' in v)) {
      // already new format
      migrated[k] = { name: v.name || k, price: v.price || null };
    } else if (typeof v === 'number') {
      // old format: key is product name, value is price -> convert to slug id
      const id = slugify(k);
      migrated[id] = { name: k, price: v };
    }
  });

  // merge: migrated <- products (products override migrated)
  const merged = Object.assign({}, migrated, products);
  saveProductsMap(merged);
  return merged;
}

// simple slug helper
function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Update prices of items already present in cart according to products map
function updateCartPricesFromProducts() {
  const map = loadProductsMap();
  let changed = false;
  cart.forEach(item => {
    // prefer matching by id if present
    if (item.id && map[item.id] && map[item.id].price != null && map[item.id].price !== item.price) {
      item.price = map[item.id].price;
      item.product = map[item.id].name || item.product;
      changed = true;
      return;
    }
    // otherwise try to find by name
    const foundId = Object.keys(map).find(k => (map[k].name || '').toLowerCase() === String(item.product).toLowerCase());
    if (foundId && map[foundId].price != null && map[foundId].price !== item.price) {
      item.id = foundId;
      item.price = map[foundId].price;
      item.product = map[foundId].name || item.product;
      changed = true;
    }
  });
  if (changed) saveCart();
}

function calculateTotal() {
  total = cart.reduce((acc, item) => acc + item.price, 0);
  return total;
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // small debug log to help trace issues in devtools
    console.debug('Cart saved', cart);
    // update UI badge if possible
    try { updateCartBadge(); } catch (e) { /* ignore */ }
    // dispatch a simple event so other listeners can react
    try { window.dispatchEvent(new Event('cart-updated')); } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
}

function addToCart(product, price) {
  // identifier may be an id or a name; determine id & product data
  const pm = loadProductsMap();
  let id = null;
  let name = null;
  let p = (typeof price === 'number') ? price : (parsePriceString(price) || null);

  // if identifier matches an existing id in map
  if (pm[product]) {
    id = product;
    name = pm[id].name;
    if (pm[id].price != null) p = pm[id].price;
  } else {
    // try find by name (case-insensitive)
    const foundId = Object.keys(pm).find(k => (pm[k].name || '').toLowerCase() === String(product).toLowerCase());
    if (foundId) {
      id = foundId;
      name = pm[id].name;
      if (pm[id].price != null) p = pm[id].price;
    }
  }

  // If still no id, maybe called with product name and we can read DOM to prefer visible price
  if (!id) {
    try {
      const cards = document.querySelectorAll('.product');
      for (const card of cards) {
        const nameEl = card.querySelector('h3');
        if (!nameEl) continue;
        const nm = nameEl.textContent.trim();
        if (nm.toLowerCase() === String(product).toLowerCase()) {
          const domId = card.dataset && card.dataset.id ? card.dataset.id : slugify(nm);
          id = domId;
          name = nm;
          const parsed = parsePriceString(card.dataset && card.dataset.price ? card.dataset.price : (card.querySelector('p') ? card.querySelector('p').textContent : null));
          if (parsed !== null) p = parsed;
          break;
        }
      }
    } catch (err) {}
  }

  // If still no id, create one from the name passed in
  if (!id) {
    name = String(product);
    id = slugify(name);
  }

  // ensure numeric price
  if (p === null) p = 0;

  // reload latest cart and push item (store id + name + price)
  loadCartFromStorage();
  cart.push({ id, product: name, price: p });
  // update products map with authoritative data
  const newMap = loadProductsMap();
  newMap[id] = { name, price: p };
  saveProductsMap(newMap);
  saveCart();
  calculateTotal();
  // If we're on the cart page, re-render
  if (document.getElementById('cart-items')) renderCart();
  alert(`${product} agregado al carrito ✅`);
}

// === MOSTRAR CARRITO (solo en cart.html) ===
function renderCart() {
  // always refresh in-memory cart from storage before rendering
  loadCartFromStorage();
  const list = document.getElementById('cart-items');
  if (!list) return;
  list.innerHTML = '';
  cart.forEach((item, index) => {
    const li = document.createElement('li');

    const productName = document.createElement('span');
    productName.textContent = item.product;

    const price = document.createElement('span');
    price.textContent = `$${item.price.toLocaleString('es-AR')}`;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.alignItems = 'center';
    actions.style.gap = '10px';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.title = 'Eliminar';
    // Use a small trash SVG icon to match site aesthetic
    removeBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    removeBtn.setAttribute('aria-label', 'Eliminar item');
    removeBtn.addEventListener('click', (e) => {
      // confirmation before removing
      const confirmed = window.confirm('¿Eliminar este item del carrito?');
      if (confirmed) removeFromCart(index);
    });

    actions.appendChild(removeBtn);

    li.appendChild(productName);
    // wrap price + actions in a container so layout stays clean
    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '12px';
    right.appendChild(price);
    right.appendChild(actions);

    li.appendChild(right);
    list.appendChild(li);
  });
  calculateTotal();
  // Update any total display elements that exist on the page
  const totalText = document.getElementById('total');
  if (totalText) totalText.textContent = `Total: $${total.toLocaleString('es-AR')}`;
  const summaryTotal = document.getElementById('summary-total-text');
  if (summaryTotal) summaryTotal.textContent = `$${total.toLocaleString('es-AR')}`;
  // also update summary list if present
  renderSummary();
}

function renderSummary() {
  const summaryList = document.getElementById('summary-items');
  const summaryTotal = document.getElementById('summary-total-text');
  if (!summaryList || !summaryTotal) return;
  summaryList.innerHTML = '';
  cart.forEach(item => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = item.product;
    const price = document.createElement('strong');
    price.textContent = `$${item.price.toLocaleString('es-AR')}`;
    li.appendChild(name);
    li.appendChild(price);
    summaryList.appendChild(li);
  });
  calculateTotal();
  summaryTotal.textContent = `$${total.toLocaleString('es-AR')}`;
}

function removeFromCart(index) {
  if (index < 0 || index >= cart.length) return;
  cart.splice(index, 1);
  saveCart();
  calculateTotal();
  renderCart();
}

// Render on page load if we're on the cart page
if (document.getElementById('cart-items')) {
  // If the DOM also contains shop product cards (rare on cart page), sync them first
  if (document.querySelectorAll('.product').length) syncProductsFromShopDOM();
  // ensure cart prices reflect the authoritative products map
  updateCartPricesFromProducts();
  calculateTotal();
  renderCart();
  console.info('Cart loaded, items:', cart.length);
}

// --- Checkout step navigation ---
let currentStep = 0;
const totalSteps = 3;

function updateStepUI() {
  const indicators = document.querySelectorAll('.step-indicator');
  indicators.forEach(ind => {
    const step = Number(ind.getAttribute('data-step'));
    ind.classList.toggle('active', step === currentStep);
    ind.classList.toggle('done', step < currentStep);
  });

  document.querySelectorAll('.checkout-step').forEach(el => {
    const s = Number(el.getAttribute('data-step'));
    el.style.display = s === currentStep ? '' : 'none';
  });
}

function goToStep(step) {
  if (step < 0 || step >= totalSteps) return;
  currentStep = step;
  updateStepUI();
}

function nextFromCart() {
  if (cart.length === 0) {
    alert('Tu carrito está vacío. Agrega al menos un producto antes de continuar.');
    return;
  }
  goToStep(1);
}

function nextFromDelivery() {
  // basic validation of delivery fields
  const nombre = document.getElementById('nombre');
  const direccion = document.getElementById('direccion');
  const ciudad = document.getElementById('ciudad');
  const cp = document.getElementById('codigo_postal');
  const email = document.getElementById('email');
  const telefono = document.getElementById('telefono');

  if (!nombre.checkValidity() || !direccion.checkValidity() || !ciudad.checkValidity() || !cp.checkValidity() || !email.checkValidity() || !telefono.checkValidity()) {
    // trigger native validation UI
    nombre.reportValidity();
    return;
  }

  goToStep(2);
}

// wire buttons if present
document.addEventListener('DOMContentLoaded', () => {
  const toDelivery = document.getElementById('to-delivery');
  if (toDelivery) toDelivery.addEventListener('click', nextFromCart);

  const backToCart = document.getElementById('back-to-cart');
  if (backToCart) backToCart.addEventListener('click', () => goToStep(0));

  const backToCartBottom = document.getElementById('back-to-cart-bottom');
  if (backToCartBottom) backToCartBottom.addEventListener('click', () => goToStep(0));

  const toPayment = document.getElementById('to-payment');
  if (toPayment) toPayment.addEventListener('click', nextFromDelivery);

  const toPaymentBottom = document.getElementById('to-payment-bottom');
  if (toPaymentBottom) toPaymentBottom.addEventListener('click', nextFromDelivery);

  const backToDelivery = document.getElementById('back-to-delivery');
  if (backToDelivery) backToDelivery.addEventListener('click', () => goToStep(1));

  // payment method selection updates hidden input
  const paymentInputs = document.querySelectorAll('input[name="payment"]');
  paymentInputs.forEach(inp => inp.addEventListener('change', (e) => {
    const val = e.target.value;
    const hidden = document.getElementById('payment_method');
    if (hidden) hidden.value = val;
  }));

  // ensure we have the latest cart from storage and badge updated
  loadCartFromStorage();
  updateCartBadge();
  // If we're on the shop (index) page, sync visible product prices into the products map
  if (document.querySelectorAll('.product').length) syncProductsFromShopDOM();
  updateStepUI();
});

// === FORMULARIO DE ENVÍO ===
const form = document.getElementById('shipping-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const datos = {
      nombre: document.getElementById('nombre').value,
      direccion: document.getElementById('direccion').value,
      ciudad: document.getElementById('ciudad').value,
      codigo_postal: document.getElementById('codigo_postal') ? document.getElementById('codigo_postal').value : '',
      email: document.getElementById('email').value,
      telefono: document.getElementById('telefono').value,
      carrito: cart,
      total: total,
    };

    localStorage.setItem('orderData', JSON.stringify(datos));

    alert(`Gracias ${datos.nombre}, revisá tu correo para confirmar tu pedido 🖤`);
    // remove namespaced cart key (not the legacy 'cart' key)
    try {
      localStorage.removeItem(CART_KEY);
    } catch (e) {
      console.warn('Could not remove cart from localStorage:', e);
    }
    cart = [];
    // if we're on cart page, re-render to show empty state
    if (document.getElementById('cart-items')) renderCart();
    window.location.href = "index.html";
  });
}

// Listen for cross-tab storage updates and refresh badge/cart when they happen
window.addEventListener('storage', (e) => {
  if (!e.key) return;
  if (e.key === CART_KEY || e.key === PRODUCTS_KEY) {
    try {
      loadCartFromStorage();
      updateCartBadge();
      // if on cart page, re-render
      if (document.getElementById('cart-items')) renderCart();
    } catch (err) {
      console.debug('Error handling storage event', err);
    }
  }
});

// Also listen to internal cart-updated event
window.addEventListener('cart-updated', () => {
  try { loadCartFromStorage(); updateCartBadge(); } catch (e) {}
});
