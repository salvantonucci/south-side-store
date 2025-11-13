// === CARRITO ===
const CART_KEY = 'southside_cart_v1';
let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
let total = 0;

function loadCartFromStorage() {
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { cart = []; }
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
  return parseInt(String(str).replace(/[^0-9]/g, ''), 10) || 0;
}

function addToCart(productId, buttonEl) {
  const card = document.querySelector(`.product[data-id="${productId}"]`);
  if (!card) return alert('Producto no encontrado.');

  const name = card.querySelector('h3').textContent.trim();
  const price = parsePriceString(card.dataset.price || card.querySelector('p').textContent);

  const sizeSelect = card.querySelector('.size-selector');
  const size = sizeSelect ? sizeSelect.value : '';

  if (!size) {
    alert('Seleccioná un talle antes de agregar 🧢');
    return;
  }

  loadCartFromStorage();
  cart.push({ id: productId, product: name, price, size });
  saveCart();
  updateCartBadge();
  alert(`${name} (${size}) agregado al carrito 🛒`);
}

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

// === CHECKOUT STEPS ===
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

document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderCart();

  const toDelivery = document.getElementById('to-delivery');
  if (toDelivery)
    toDelivery.addEventListener('click', () => {
      if (!cart.length) return alert('Tu carrito está vacío 🛒');
      goToStep(1);
    });

  const toPayment = document.getElementById('to-payment');
  if (toPayment)
    toPayment.addEventListener('click', () => {
      const required = ['nombre', 'direccion', 'ciudad', 'codigo_postal', 'email', 'telefono'];
      for (let id of required) {
        const el = document.getElementById(id);
        if (!el.checkValidity()) {
          el.reportValidity();
          return;
        }
      }

      const hiddenCart = document.getElementById("hidden_cart");
      const hiddenTotal = document.getElementById("hidden_total");

      if (hiddenCart) hiddenCart.value = JSON.stringify(cart, null, 2);
      if (hiddenTotal) hiddenTotal.value = `$${total.toLocaleString('es-AR')}`;

      goToStep(2);
    });

  const backToCart = document.getElementById('back-to-cart');
  if (backToCart) backToCart.addEventListener('click', () => goToStep(0));

  const backToDelivery = document.getElementById('back-to-delivery');
  if (backToDelivery) backToDelivery.addEventListener('click', () => goToStep(1));
});

// === MERCADO PAGO ===
async function pagarConMercadoPago() {
  if (!cart.length) return alert("Tu carrito está vacío 🛒");

  const items = cart.map(p => ({
    title: `${p.product} (${p.size})`,
    quantity: 1,
    unit_price: p.price
  }));

  try {
    const resp = await fetch("http://localhost/southside/crear-preferencia.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    });

    const data = await resp.json();

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      console.log("Error:", data);
      alert("No se pudo generar el pago. Verificá el token o el PHP.");
    }
  } catch (err) {
    console.error(err);
    alert("Error al conectar con el servidor.");
  }
}
