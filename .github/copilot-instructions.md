# South Side Store - AI Agent Instructions

## Project Overview
This is a simple e-commerce store for a clothing brand called "South Side". The project uses vanilla JavaScript, HTML, and CSS with Firebase integration for data storage.

## Architecture and Data Flow
- Frontend: Single page application with sections for shop display and cart management
- Backend: Firebase Firestore for order storage
- State Management: Cart data persisted in localStorage, synced with UI

### Key Components
1. **Shopping Cart System** (`script.js`)
   - Cart state managed in memory and localStorage
   - Core functions: `addToCart()`, `updateCart()`
   - Checkout process integrates with Firebase

2. **Firebase Integration** (`firebase/config.js`)
   - Orders stored in 'ventas' collection
   - Each order contains: date, items array, total amount

## Development Patterns

### State Management
```javascript
// Cart state initialization pattern
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let total = cart.reduce((acc, item) => acc + item.price, 0);
```

### UI Updates
Cart updates follow the pattern:
1. Modify cart array
2. Update localStorage
3. Call `updateCart()` to sync UI

### Firebase Operations
Sales are recorded using this structure:
```javascript
await db.collection('ventas').add({
  fecha: new Date(),
  items: cart,
  total
});
```

## CSS Conventions
- Mobile-first responsive design
- Custom properties for brand colors
- Consistent spacing using pixels
- BEM-like class naming (e.g., `product`, `product__img`)

## External Dependencies
- Firebase (Firestore)
- AOS (Animate on Scroll)
- MercadoPago SDK
- Google Fonts (Unbounded)

## Common Operations
- Adding new products: Update the shop section in `index.html`
- Modifying styles: Check `style.css` for component-specific styles
- Cart operations: Extend cart functionality in `script.js`

## Testing
Currently no automated tests. Manual testing focused on:
- Cart operations
- Firebase order submission
- Responsive design across devices

## TODO Patterns
Areas that commonly need attention:
- Form validation for checkout
- Error handling in Firebase operations
- Loading states for async operations