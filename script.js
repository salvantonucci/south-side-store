// === CARRITO ===
const CART_KEY = 'southside_cart_v1';
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

function loadCartFromStorage() {
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const link = document.querySelector('a[href="cart.html"]');
  if (!link) return;
  let badge = document.getElementById('cart-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'cart-badge';
    badge.style.cssText =
      'margin-left:6px;background:#ffffff;color:#111;font-weight:700;padding:3px 7px;border-radius:50%';
    link.appendChild(badge);
  }
  badge.textContent = cart.length;
}

function parsePriceString(str) {
  const cleaned = String(str).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
}

// === agregar al carrito ===
function addToCart(productId, buttonEl) {
  const card = document.querySelector(`.product[data-id="${productId}"]`);
  if (!card) return alert('Producto no encontrado.');

  const name = card.querySelector('h3').textContent.trim();
  const price = parsePriceString(card.dataset.price || card.querySelector('p').textContent);
  const sizeSelect = card.querySelector('.size-selector');
  const size = sizeSelect ? sizeSelect.value : '';

  if (!size) {
    alert('Por favor seleccioná un talle antes de agregar al carrito 🧢');
    return;
  }

  loadCartFromStorage();
  cart.push({ id: productId, product: name, price, size });
  saveCart();
  updateCartBadge();
  alert(`${name} (${size}) agregado al carrito 🛒`);
}

// === mostrar carrito ===
function renderCart() {
  loadCartFromStorage();
  const list = document.getElementById('cart-items');
  if (!list) return;
  list.innerHTML = '';

  cart.forEach((item, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${item.product} <small>(${item.size})</small></span>
      <div>
        <span>$${item.price.toLocaleString('es-AR')}</span>
        <button class="remove-btn" onclick="removeFromCart(${i})">✕</button>
      </div>
    `;
    list.appendChild(li);
  });

  calculateTotal();
  const totalText = document.getElementById('summary-total-text');
  if (totalText) totalText.textContent = `$${total.toLocaleString('es-AR')}`;
}

function calculateTotal() {
  total = cart.reduce((sum, p) => sum + p.price, 0);
  return total;
}

function removeFromCart(i) {
  cart.splice(i, 1);
  saveCart();
  renderCart();
}

// === pasos del checkout ===
let currentStep = 0;
function goToStep(n) {
  document.querySelectorAll('.checkout-step').forEach((s, i) => {
    s.style.display = i === n ? '' : 'none';
  });
  document.querySelectorAll('.step-indicator').forEach((el, i) => {
    el.classList.toggle('active', i === n);
    el.classList.toggle('done', i < n);
  });
  currentStep = n;
}

// === onload ===
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderCart();

  const toDelivery = document.getElementById('to-delivery');
  if (toDelivery) toDelivery.addEventListener('click', () => {
    if (!cart.length) return alert('Tu carrito está vacío 🛒');
    goToStep(1);
  });

  const toPayment = document.getElementById('to-payment');
  if (toPayment) toPayment.addEventListener('click', () => {
    const required = ['nombre', 'direccion', 'ciudad', 'codigo_postal', 'email', 'telefono'];
    for (let id of required) {
      const el = document.getElementById(id);
      if (!el.checkValidity()) {
        el.reportValidity();
        return;
      }
    }

    // === Completar campos ocultos antes de pagar ===
    const hiddenCart = document.getElementById("hidden_cart");
    const hiddenTotal = document.getElementById("hidden_total");
    const hiddenSizes = document.getElementById("hidden_sizes");

    if (hiddenCart) hiddenCart.value = JSON.stringify(cart, null, 2);
    if (hiddenTotal) hiddenTotal.value = `$${total.toLocaleString('es-AR')}`;

    if (hiddenSizes) {
      const talles = cart.map(item => `${item.product} — Talle: ${item.size}`).join(', ');
      hiddenSizes.value = talles || 'Sin talle especificado';
    }

    goToStep(2);
  });

  const backToCart = document.getElementById('back-to-cart');
  if (backToCart) backToCart.addEventListener('click', () => goToStep(0));

  const backToDelivery = document.getElementById('back-to-delivery');
  if (backToDelivery) backToDelivery.addEventListener('click', () => goToStep(1));
});

// === MERCADO PAGO ===
async function pagarConMercadoPago() {
  if (!cart.length) {
    alert("Tu carrito está vacío 🛒");
    return;
  }

  const items = cart.map(p => ({
    title: `${p.product} (${p.size})`,
    quantity: 1,
    unit_price: p.price
  }));

  try {
    const resp = await fetch(`${window.location.origin}/crear-preferencia.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });

    const data = await resp.json();

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      console.log("Respuesta Mercado Pago:", data);
      alert("No se pudo generar el pago. Revisa el token o el archivo PHP.");
    }
  } catch (err) {
    console.error(err);
    alert("No se pudo conectar con tu servidor.");
  }
}
