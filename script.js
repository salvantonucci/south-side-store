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

// === agregar al carrito desde index ===
function addToCart(productId) {
  const card = document.querySelector(`.product[data-id="${productId}"]`);
  if (!card) return alert('Producto no encontrado.');

  const name = card.querySelector('h3').textContent.trim();
  const price = parsePriceString(card.dataset.price || card.querySelector('p').textContent);

  loadCartFromStorage();
  cart.push({ id: productId, product: name, price });
  saveCart();
  updateCartBadge();
  alert(`${name} agregado al carrito 🛒`);
}

// === mostrar carrito en cart.html ===
function renderCart() {
  loadCartFromStorage();
  const list = document.getElementById('cart-items');
  if (!list) return;
  list.innerHTML = '';

  cart.forEach((item, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${item.product}</span>
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
    goToStep(2);
  });

  const backToCart = document.getElementById('back-to-cart');
  if (backToCart) backToCart.addEventListener('click', () => goToStep(0));

  const backToDelivery = document.getElementById('back-to-delivery');
  if (backToDelivery) backToDelivery.addEventListener('click', () => goToStep(1));
});

// === MERCADO PAGO: función que llama el botón ===
async function pagarConMercadoPago() {
  if (!cart.length) {
    alert("Tu carrito está vacío 🛒");
    return;
  }

  // 1. armar items para MP
  const items = cart.map(p => ({
    title: p.product,
    quantity: 1,
    unit_price: p.price
  }));

  try {
    // 2. pedirle al PHP que cree la preferencia
    const resp = await fetch("https://tudominio.com/crear-preferencia.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });

    const data = await resp.json();

    // 3. si vino bien, redirigimos
    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      console.log("Respuesta Mercado Pago:", data);
      alert("No se pudo generar el pago. Revisa el token o el archivo PHP.");
    }
  } catch (err) {
    console.error(err);
    alert("No se pudo conectar con tu servidor (crear-preferencia.php).");
  }
}
