// === CARRITO ===
const CART_KEY = 'southside_cart_v1';
let cart = [];
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

// Parseo robusto de precios desde data-price
function parsePriceString(str) {
  if (!str) return 0;
  return Number(String(str).replace(/[^0-9]/g, ""));
}

// Agregar al carrito
function addToCart(productId) {
  const card = document.querySelector(`.product[data-id="${productId}"]`);
  if (!card) return alert('Producto no encontrado.');

  const name = card.querySelector('h3').textContent.trim();
  const price = parsePriceString(card.dataset.price);
  const sizeSelect = card.querySelector('.size-selector');
  const size = sizeSelect ? sizeSelect.value : '';

  if (!size) {
    alert('Seleccioná un talle antes de continuar.');
    return;
  }

  loadCartFromStorage();
  cart.push({ id: productId, product: name, price, size });
  saveCart();
  alert(`${name} (${size}) agregado al carrito 🛒`);
}

// Render carrito
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
      </div>`;
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

// === PASOS DEL CHECKOUT ===
function setupCheckoutSteps() {
  const step0 = document.querySelector('.checkout-step[data-step="0"]');
  const step1 = document.querySelector('.checkout-step[data-step="1"]');
  const step2 = document.querySelector('.checkout-step[data-step="2"]');

  // Si no estamos en cart.html, salimos
  if (!step0 || !step1 || !step2) {
    console.log("No hay pasos de checkout en esta página.");
    return;
  }

  const continueBtn    = document.getElementById("continue-btn");
  const backToCart     = document.getElementById("back-to-cart");
  const toPayment      = document.getElementById("to-payment");
  const backToDelivery = document.getElementById("back-to-delivery");

  // Carrito → Entrega
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      console.log("Click en Continuar a entrega");
      step0.style.display = "none";
      step1.style.display = "block";
    });
  }

  // Entrega → Carrito
  if (backToCart) {
    backToCart.addEventListener("click", () => {
      console.log("Click en Volver al carrito");
      step1.style.display = "none";
      step0.style.display = "block";
    });
  }

  // Entrega → Pago
  if (toPayment) {
    toPayment.addEventListener("click", () => {
      console.log("Click en Continuar a pago");
      step1.style.display = "none";
      step2.style.display = "block";
    });
  }

  // Pago → Entrega
  if (backToDelivery) {
    backToDelivery.addEventListener("click", () => {
      console.log("Click en Volver a entrega");
      step2.style.display = "none";
      step1.style.display = "block";
    });
  }
}

// === MERCADO PAGO ===
async function pagarConMercadoPago() {
  loadCartFromStorage();
  if (!cart.length) return alert("Tu carrito está vacío 🛒");

  const items = cart.map(p => ({
    title: `${p.product} (${p.size})`,
    quantity: 1,
    unit_price: p.price
  }));

  try {
    const resp = await fetch("https://southsidewear.store/crear-preferencia.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });

    const data = await resp.json();

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      console.log("Error:", data);
      alert("No se pudo generar el pago. Revisá precios o el PHP.");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("No se pudo conectar con el servidor.");
  }
}

// === INICIO GENERAL ===
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  updateCartBadge();
  renderCart();
  setupCheckoutSteps();
});
