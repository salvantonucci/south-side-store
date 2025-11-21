// === CARRITO ===
const CART_KEY = 'southside_cart_v1';
let cart = [];
let total = 0;

// Datos del envío (Fijo en memoria global)
window.checkoutShippingData = {
  nombre: "",
  direccion: "",
  ciudad: "",
  codigo_postal: "",
  email: "",
  telefono: ""
};

// Captura en tiempo real de los campos del paso 1
function bindLiveShippingCapture() {
  const fields = ["nombre", "direccion", "ciudad", "codigo_postal", "email", "telefono"];

  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener("input", () => {
      window.checkoutShippingData[id] = el.value.trim();
      console.log("Actualizado:", window.checkoutShippingData);
    });
  });
}

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

// Parseo robusto desde dataset price
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

  if (!step0 || !step1 || !step2) return;

  const continueBtn    = document.getElementById("continue-btn");
  const backToCart     = document.getElementById("back-to-cart");
  const toPayment      = document.getElementById("to-payment");
  const backToDelivery = document.getElementById("back-to-delivery");

  // Paso 0 → Paso 1
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {

      // Validación REAL del carrito
      loadCartFromStorage();
      const cartItemsDOM = document.querySelectorAll("#cart-items li");

      if (!cart.length || cartItemsDOM.length === 0) {
        alert("Tu carrito está vacío 🛒 Agregá un producto antes de continuar.");
        return;
      }

      step0.style.display = "none";
      step1.style.display = "block";
    });
  }

  // Paso 1 → Paso 0
  if (backToCart) {
    backToCart.addEventListener("click", () => {
      step1.style.display = "none";
      step0.style.display = "block";
    });
  }

  // Paso 1 → Paso 2
  if (toPayment) {
    toPayment.addEventListener("click", () => {

      // Validación mínima de campos obligatorios
      const fields = ["nombre", "direccion", "ciudad", "codigo_postal", "email", "telefono"];
      for (let id of fields) {
        if (!window.checkoutShippingData[id] || window.checkoutShippingData[id].trim() === "") {
          alert("Completá todos los datos de envío antes de continuar.");
          return;
        }
      }

      step1.style.display = "none";
      step2.style.display = "block";
    });
  }

  // Paso 2 → Paso 1
  if (backToDelivery) {
    backToDelivery.addEventListener("click", () => {
      step2.style.display = "none";
      step1.style.display = "block";
    });
  }
}

async function pagarConMercadoPago() {
  loadCartFromStorage();
  if (!cart.length) {
    alert("Tu carrito está vacío 🛒");
    return;
  }

  // Armar items
  const items = cart.map(p => ({
    title: `${p.product} (${p.size})`,
    quantity: 1,
    unit_price: p.price
  }));

  // Datos de envío desde memoria
  const shipping = window.checkoutShippingData || {};
  const required = ["nombre", "direccion", "ciudad", "codigo_postal", "email", "telefono"];

  for (const field of required) {
    if (!shipping[field] || shipping[field].trim() === "") {
      alert("Completá todos los datos de envío antes de pagar.");
      return;
    }
  }

  // Generar ID de orden local
  const orderId = `SS-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  try {
    // 1) Guardar pedido pendiente en el servidor
    await fetch("https://southsidewear.store/guardar-pedido-pendiente.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, items, shipping })
    });

    // 2) Crear preferencia en Mercado Pago con ese orderId
    const resp = await fetch("https://southsidewear.store/crear-preferencia.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, items, shipping })
    });

    const data = await resp.json();

    if (data.init_point) {
      window.location.href = data.init_point;
    } else {
      console.log("Error al crear preferencia:", data);
      alert("No se pudo iniciar el pago.");
    }

  } catch (err) {
    console.error("Error:", err);
    alert("Error de conexión con el servidor.");
  }
}

// === INICIO ===
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  updateCartBadge();
  renderCart();
  setupCheckoutSteps();
  bindLiveShippingCapture(); // CAPTURA EN TIEMPO REAL
});
