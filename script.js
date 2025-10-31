// === SISTEMA DE CARRITO ===
// Use a namespaced localStorage key to avoid collisions and make debugging easier
const CART_KEY = 'southside_cart_v1';

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

function calculateTotal() {
  total = cart.reduce((acc, item) => acc + item.price, 0);
  return total;
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // small debug log to help trace issues in devtools
    console.debug('Cart saved', cart);
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
}

function addToCart(product, price) {
  cart.push({ product, price });
  saveCart();
  calculateTotal();
  // If we're on the cart page, re-render
  if (document.getElementById('cart-items')) renderCart();
  alert(`${product} agregado al carrito ✅`);
}

// === MOSTRAR CARRITO (solo en cart.html) ===
function renderCart() {
  const list = document.getElementById('cart-items');
  const totalText = document.getElementById('total');
  if (!list || !totalText) return;
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
  totalText.textContent = `Total: $${total.toLocaleString('es-AR')}`;
  // also update summary (if present)
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
    localStorage.removeItem('cart');
    cart = [];
    window.location.href = "index.html";
  });
}
