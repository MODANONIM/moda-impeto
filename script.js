/* ===============================================
   MODA IMPETO - Interactive Scripts
   =============================================== */

// Product Database (will be loaded from API)
let PRODUCTS = {};
const API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await fetchProducts();
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
    initCart();

    // If on product page, initialize it
    if (document.getElementById('productDetail')) {
        initProduct();
    }

    // If on checkout page, render it
    if (document.getElementById('checkoutItems')) {
        const token = localStorage.getItem('moda_impeto_user_token');
        if (!token) {
            window.location.href = 'account_login.html?redirect=checkout.html';
            return;
        }
        renderCheckoutSummary();

        // Prefill email
        const user = JSON.parse(localStorage.getItem('moda_impeto_user'));
        if (user && user.email) {
            const emailInput = document.getElementById('email');
            if (emailInput) emailInput.value = user.email;
        }
    }

    // If on order history page, initialize it
    if (document.getElementById('orderHistoryList')) {
        initOrderHistory();
    }
}

async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        // Convert array to object keyed by ID for compatibility
        PRODUCTS = products.reduce((acc, p) => {
            acc[p.id] = p;
            if (p._id) acc[p._id] = p; // Also index by MongoDB _id for cart compatibility
            return acc;
        }, {});

        // Render products if on index page
        if (document.getElementById('products')) {
            renderProducts(products);
        }
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

function renderProducts(products) {
    const grid = document.querySelector('.products__grid');
    if (grid) {
        grid.innerHTML = products.map(p => `
        <article class="product-card fade-in ${p.isSoldOut ? 'sold-out' : ''}">
          <a href="product.html?id=${p.id}" class="product-card__link">
            <div class="product-card__image">
              <img src="${p.image}" alt="${p.name}" loading="lazy">
              ${p.isSoldOut ? '<div class="sold-out-badge">SOLD OUT</div>' : ''}
            </div>
            <div class="product-card__info">
              <span class="product-card__category">${p.category}</span>
              <h3 class="product-card__name">${p.name}</h3>
              <p class="product-card__price">¥${p.price.toLocaleString()}</p>
            </div>
          </a>
          <div class="product-card__overlay">
            ${p.isSoldOut
                ? '<button class="btn btn--disabled" disabled>SOLD OUT</button>'
                : `<button class="btn btn--primary add-to-cart" data-id="${p.id}" onclick="event.preventDefault(); addToCart(${p.id}); showFeedback(this)">ADD TO CART</button>`
            }
          </div>
        </article>
        `).join('');

        // Re-initialize animations
        initScrollAnimations();
    }
}

/* ===============================================
   Navigation
   =============================================== */
function initNavigation() {
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.querySelector('.nav__links');

    // Scroll effect
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Mobile toggle
    navToggle?.addEventListener('click', () => {
        navLinks?.classList.toggle('active');
        navToggle.classList.toggle('active');
    });


}

/* ===============================================
   Cart Logic
   =============================================== */
function getCartKey() {
    const user = JSON.parse(localStorage.getItem('moda_impeto_user'));
    return user ? `moda_impeto_cart_${user._id || user.id}` : 'moda_impeto_cart_guest';
}

function initCart() {
    updateCartCount();

    // Note: .add-to-cart buttons use inline onclick handlers in renderProducts()
    // No need to add event listeners here to avoid double-adding items

    // If on cart page, render it
    if (document.getElementById('cartItems')) {
        renderCart();
    }
}

function mergeGuestCart(userId) {
    const guestKey = 'moda_impeto_cart_guest';
    const userKey = `moda_impeto_cart_${userId}`;

    const guestCart = JSON.parse(localStorage.getItem(guestKey));
    if (!guestCart || Object.keys(guestCart).length === 0) return;

    let userCart = JSON.parse(localStorage.getItem(userKey)) || {};

    Object.values(guestCart).forEach(item => {
        if (userCart[item.id]) {
            userCart[item.id].quantity += item.quantity;
        } else {
            userCart[item.id] = item;
        }
    });

    localStorage.setItem(userKey, JSON.stringify(userCart));
    localStorage.removeItem(guestKey);
}

function addToCart(productId) {
    if (PRODUCTS[productId] && PRODUCTS[productId].isSoldOut) {
        alert('この商品は売り切れです。');
        return;
    }
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (cart[productId]) {
        cart[productId].quantity += 1;
    } else {
        cart[productId] = {
            id: productId,
            quantity: 1,
            size: document.getElementById('selectedSize')?.value || 'M' // Default size
        };
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateCartCount();

    // Show feedback is handled by inline onclick or listener
}

function updateCartCount() {
    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || {};
    const count = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);

    // Update all cart count badges - match actual HTML selectors
    document.querySelectorAll('#cartCount, .nav__cart-count, .cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;

    const cartKey = getCartKey();
    const cart = JSON.parse(localStorage.getItem(cartKey)) || {};
    const items = Object.values(cart);

    if (items.length === 0) {
        cartContainer.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><a href="index.html" class="btn btn--outline">Continue Shopping</a></div>';
        updateCartTotals(0);
        return;
    }

    let subtotal = 0;
    cartContainer.innerHTML = items.map(item => {
        const product = PRODUCTS[item.id];
        if (!product) return ''; // Skip if product not found

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        return `
        <div class="cart-item fade-in visible">
            <div class="cart-item__image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="cart-item__details">
                <h3 class="cart-item__name">${product.name}</h3>
                <p class="cart-item__price">¥${product.price.toLocaleString()}</p>
                <p class="cart-item__size">Size: ${item.size || 'M'}</p>
                <div class="cart-item__actions">
                    <div class="quantity-controls">
                        <button onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeFromCart('${item.id}')">Remove</button>
                </div>
            </div>
        </div>
        `;
    }).join('');

    updateCartTotals(subtotal);
}

function updateQuantity(productId, change) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (cart[productId]) {
        cart[productId].quantity += change;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
        localStorage.setItem(cartKey, JSON.stringify(cart));
        renderCart(); // Re-render cart page
        updateCartCount(); // Update header badge
    }
}

function removeFromCart(productId) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (cart[productId]) {
        delete cart[productId];
        localStorage.setItem(cartKey, JSON.stringify(cart));
        renderCart();
        updateCartCount();
    }
}

function updateCartTotals(subtotal) {
    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');

    if (subtotalEl) subtotalEl.textContent = `¥${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `¥${subtotal.toLocaleString()}`;
}


function renderCheckoutSummary() {
    const container = document.getElementById('checkoutItems');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const totalEl = document.getElementById('checkoutTotal');
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};

    if (Object.keys(cart).length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    let html = '';
    let subtotal = 0;

    Object.values(cart).forEach(item => {
        const product = PRODUCTS[item.id];
        if (product) {
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            html += `
                <div class="summary-item">
                    <div class="summary-item__image">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="summary-item__details">
                        <p class="summary-item__name">${product.name} x ${item.quantity}</p>
                        <p class="summary-item__price">¥${itemTotal.toLocaleString()}</p>
                    </div>
                </div>
            `;
        }
    });

    if (container) container.innerHTML = html;
    if (subtotalEl) subtotalEl.textContent = `¥${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `¥${subtotal.toLocaleString()}`;
}

/* ===============================================
   Payment Method Logic
   =============================================== */
window.togglePaymentMethod = function () {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const stripeSection = document.getElementById('stripe-section');
    const paypalSection = document.getElementById('paypal-section');
    const submitBtn = document.getElementById('placeOrderBtn');

    if (method === 'stripe') {
        stripeSection.style.display = 'block';
        paypalSection.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        stripeSection.style.display = 'none';
        paypalSection.style.display = 'block';
        submitBtn.style.display = 'none';

        // Render PayPal buttons if not already rendered
        if (!document.getElementById('paypal-button-container').children.length) {
            initPayPal();
        }
    }
};

/* ===============================================
   PayPal Logic
   =============================================== */
function initPayPal() {
    if (typeof paypal === 'undefined') {
        console.log('PayPal SDK loading...');
        setTimeout(initPayPal, 500);
        return;
    }

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'black',
            shape: 'rect',
            label: 'paypal'
        },
        createOrder: function (data, actions) {
            // Validate form first
            const email = document.getElementById('email').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const address = document.getElementById('address').value;
            const city = document.getElementById('city').value;
            const state = document.getElementById('state').value;
            const zipCode = document.getElementById('zipCode').value;

            if (!email || !firstName || !lastName || !address || !city || !state || !zipCode) {
                alert('配送先情報をすべて入力してください。');
                return Promise.reject(new Error('Missing required fields'));
            }

            // Calculate total
            const cartKey = getCartKey();
            let cart = JSON.parse(localStorage.getItem(cartKey)) || {};
            let subtotal = 0;
            Object.values(cart).forEach(item => {
                const product = PRODUCTS[item.id];
                if (product) subtotal += product.price * item.quantity;
            });

            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: subtotal.toString(),
                        currency_code: 'JPY'
                    }
                }]
            });
        },
        onApprove: function (data, actions) {
            return actions.order.capture().then(async function (details) {
                // Successful capture!
                console.log('PayPal Transaction completed by ' + details.payer.name.given_name);

                // Save order to our backend
                const orderData = collectOrderData('paypal', details.id);
                await saveOrderToBackend(orderData);
            });
        },
        onError: function (err) {
            console.error('PayPal Error:', err);
            alert('PayPal決済中にエラーが発生しました。');
        }
    }).render('#paypal-button-container');
}

/* ===============================================
   Shared Order Logic
   =============================================== */
function collectOrderData(paymentMethod, paymentId) {
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};
    let subtotal = 0;
    const items = Object.values(cart).map(item => {
        const product = PRODUCTS[item.id];
        subtotal += product.price * item.quantity;
        return {
            productId: item.id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            image: product.image,
            size: item.size
        };
    });

    const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const user = JSON.parse(localStorage.getItem('moda_impeto_user'));

    return {
        orderId: orderId,
        userId: user ? user.id : undefined,
        customer: {
            email: document.getElementById('email').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            address: document.getElementById('address').value,
            apartment: document.getElementById('apartment').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zipCode: document.getElementById('zipCode').value,
            country: 'USA',
            phone: document.getElementById('phone').value
        },
        items: items,
        totalAmount: subtotal,
        paymentMethod: paymentMethod,
        paymentIntentId: paymentId,
        paymentStatus: 'paid',
        status: 'Processing' // Or Pending
    };
}

async function saveOrderToBackend(orderData) {
    const overlay = document.getElementById('successOverlay');
    const orderNumberEl = document.getElementById('orderNumber');

    try {
        const token = localStorage.getItem('moda_impeto_user_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const orderRes = await fetch('/api/orders', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(orderData)
        });

        if (!orderRes.ok) throw new Error('Order save failed');

        const newOrder = await orderRes.json();

        // Show Success
        if (orderNumberEl) {
            orderNumberEl.textContent = `#${newOrder.orderId}`;
        }

        // Save Order ID to LocalStorage (for guest tracking)
        let myOrders = JSON.parse(localStorage.getItem('moda_impeto_my_orders')) || [];
        if (!myOrders.includes(newOrder.orderId)) {
            myOrders.push(newOrder.orderId);
            localStorage.setItem('moda_impeto_my_orders', JSON.stringify(myOrders));
        }

        // Clear Cart
        const cartKey = getCartKey();
        localStorage.removeItem(cartKey);
        updateCartCount();

        // Show success overlay
        overlay.classList.add('active');

    } catch (err) {
        console.error('Failed to save order:', err);
        alert('注文の保存に失敗しました。サポートにお問い合わせください。');
    }
}

/* ===============================================
   Checkout Logic with Stripe
   =============================================== */
let stripe;
let elements;
let cardElement;

async function initCheckout() {
    const checkoutForm = document.getElementById('checkoutForm');

    // Initialize Payment Method Toggle
    togglePaymentMethod();

    try {
        // Fetch Stripe public key from server
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        const stripePublicKey = config.stripePublicKey;
        const paypalClientId = config.paypalClientId;

        // Load PayPal SDK dynamically
        if (paypalClientId) {
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=JPY`;
            script.async = true;
            document.head.appendChild(script);
        } else {
            console.warn('PayPal Client ID not configured');
        }

        if (!stripePublicKey) {
            console.error('Stripe public key not found');
            return;
        }

        // Initialize Stripe
        if (typeof Stripe !== 'undefined') {
            stripe = Stripe(stripePublicKey, { locale: 'en' });
            elements = stripe.elements();

            // Create card element with custom styling
            const style = {
                base: {
                    color: '#ffffff',
                    fontFamily: '"Bodoni Moda", serif',
                    fontSize: '16px',
                    '::placeholder': {
                        color: '#888888'
                    }
                },
                invalid: {
                    color: '#ff4444',
                    iconColor: '#ff4444'
                }
            };

            cardElement = elements.create('card', { style: style });
            cardElement.mount('#card-element');

            // Handle card element errors
            cardElement.on('change', (event) => {
                const displayError = document.getElementById('card-errors');
                if (event.error) {
                    displayError.textContent = event.error.message;
                } else {
                    displayError.textContent = '';
                }
            });
        }

        // Handle form submission (Stripe only)
        checkoutForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            processOrder();
        });
    } catch (err) {
        console.error('Error initializing Stripe:', err);
        const cardContainer = document.getElementById('card-element');
        if (cardContainer) {
            cardContainer.innerHTML = '<p class="error-text">Payment system unavailable. Please refresh the page.</p>';
        }
    }
}

async function processOrder() {
    const btn = document.getElementById('placeOrderBtn');
    const cardErrors = document.getElementById('card-errors');

    // Disable button and show loading state
    btn.textContent = 'PROCESSING...';
    btn.disabled = true;
    btn.classList.add('processing');

    // Calculate subtotal
    const cartKey = getCartKey();
    let cart = JSON.parse(localStorage.getItem(cartKey)) || {};
    let subtotal = 0;
    Object.values(cart).forEach(item => {
        const product = PRODUCTS[item.id];
        if (product) subtotal += product.price * item.quantity;
    });

    if (subtotal === 0) {
        alert('カートが空です');
        resetSubmitBtn();
        return;
    }

    try {
        // Step 1: Create PaymentIntent on server
        // Use a temp order ID for metadata
        const tempOrderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const intentRes = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: subtotal,
                currency: 'jpy',
                metadata: { orderId: tempOrderId }
            })
        });

        if (!intentRes.ok) {
            const errorData = await intentRes.json();
            throw new Error(errorData.error || 'Payment setup failed');
        }

        const { clientSecret } = await intentRes.json();

        const user = JSON.parse(localStorage.getItem('moda_impeto_user'));

        const customerData = {
            email: document.getElementById('email').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            phone: document.getElementById('phone').value
        };

        // Step 2: Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: `${customerData.firstName} ${customerData.lastName}`,
                    email: customerData.email,
                    phone: customerData.phone
                }
            }
        });

        if (error) {
            cardErrors.textContent = error.message;
            resetSubmitBtn();
            return;
        }

        if (paymentIntent.status === 'succeeded') {
            // Step 3: Save order to database
            // Note: collectOrderData generates a new ID, we should probably stick to one or update it
            // For now, let's just use the one collectOrderData generates, 
            // the metadata one in Stripe was just for tracking.

            const orderData = collectOrderData('stripe', paymentIntent.id);
            // Overwrite orderId if we want to match Stripe metadata, but it's okay if they differ slightly for now
            // orderData.orderId = tempOrderId; 

            await saveOrderToBackend(orderData);
        }

    } catch (err) {
        alert('決済に失敗しました。もう一度お試しください。');
        console.error(err);
        resetSubmitBtn();
    }
}

function resetSubmitBtn() {
    const btn = document.getElementById('placeOrderBtn');
    btn.textContent = 'PLACE ORDER';
    btn.disabled = false;
    btn.classList.remove('processing');
}

/* ===============================================
   Product Detail Logic
   =============================================== */
// Product Detail Page Logic
async function initProduct() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        // Not on product page, just return or handle accordingly
        return;
    }

    try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (!res.ok) throw new Error('Product not found');
        const product = await res.json();
        const container = document.getElementById('productDetail');

        if (container) {
            // Check if sizes exist
            const hasSizes = product.sizes && product.sizes.length > 0;
            let sizeHtml = '';

            if (hasSizes) {
                sizeHtml = `
                    <div class="size-selector">
                        <p class="size-label">Select Size:</p>
                        <div class="size-options">
                            ${product.sizes.map(size => `<button class="size-btn" data-size="${size}" onclick="selectSize(this, '${size}')">${size}</button>`).join('')}
                        </div>
                        <input type="hidden" id="selectedSize" value="">
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="product-detail fade-in visible">
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.name}" class="product-detail-image">
                    </div>
                    <div class="product-info">
                        <p class="product-category text-accent">${product.category}</p>
                        <h1 class="product-name">${product.name}</h1>
                        <p class="product-price">¥${product.price.toLocaleString()}</p>
                        
                        ${sizeHtml}

                        <div class="product-description">
                            <p>${product.description}</p>
                        </div>
                        
                        ${product.isSoldOut
                    ? '<button class="btn btn--disabled" disabled style="width: 100%; cursor: not-allowed; opacity: 0.6;">SOLD OUT</button>'
                    : `<button class="btn btn--primary add-to-cart-btn" onclick="addToCart('${product._id}' || ${product.id})">ADD TO CART</button>`
                }
                        
                        <div class="product-meta">
                            <p>Free Express Shipping Worldwide</p>
                            <p>Complimentary Gift Packaging</p>
                        </div>
                    </div>
                </div>
            `;

            // Re-initialize PRODUCTS cache for addToCart
            if (typeof PRODUCTS !== 'undefined') {
                PRODUCTS[product._id] = product;
                PRODUCTS[product.id] = product; // Fallback
            }
        }
    } catch (err) {
        console.error(err);
        const container = document.getElementById('productDetail');
        if (container) container.innerHTML = '<p>Product not found.</p>';
    }
}

// Global scope size selector
window.selectSize = function (btn, size) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('selectedSize').value = size;
};

// Override addToCart to handle size
window.addToCart = function (productId) {
    // Ensure PRODUCTS is available or fetch it? 
    // Assuming PRODCUTS is populated by loadProducts or initProduct
    const product = (typeof PRODUCTS !== 'undefined') ? PRODUCTS[productId] : null;

    if (!product) {
        console.error('Product not found in cache');
        return;
    }

    if (product.isSoldOut) {
        alert('この商品は売り切れです。');
        return;
    }

    let size = null;
    if (product.sizes && product.sizes.length > 0) {
        const sizeInput = document.getElementById('selectedSize');
        // If we are on product detail page
        if (sizeInput) {
            size = sizeInput.value;
            if (!size) {
                alert('サイズを選択してください。');
                return;
            }
        } else {
            // From listing page - if product has sizes, redirect to detail page
            window.location.href = `product.html?id=${productId}`;
            return;
        }
    }

    let cart = JSON.parse(localStorage.getItem(getCartKey())) || {};

    // Create unique key for product + size
    const cartKey = size ? `${productId}_${size}` : productId;

    if (cart[cartKey]) {
        cart[cartKey].quantity += 1;
    } else {
        cart[cartKey] = {
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            size: size
        };
    }

    localStorage.setItem(getCartKey(), JSON.stringify(cart));
    updateCartCount();

    // Show feedback
    const btn = document.querySelector(`.add-to-cart[data-id="${productId}"]`) || document.querySelector('.add-to-cart-btn');
    if (btn) showFeedback(btn);
};

function showFeedback(btn) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Added to Cart';
    btn.classList.add('added');
    btn.style.background = 'linear-gradient(135deg, #32cd32 0%, #228b22 100%)';
    btn.style.borderColor = '#32cd32';

    // Cart icon bounce animation
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.classList.add('cart-bounce');
        setTimeout(() => cartCount.classList.remove('cart-bounce'), 600);
    }

    // Show toast notification
    showToast('Added to Cart!');

    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('added');
        btn.style.background = '';
        btn.style.borderColor = '';
    }, 2000);
}

function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.cart-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24" style="fill: #32cd32; margin-right: 10px;">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>${message}</span>
        <a href="cart.html" style="margin-left: 15px; color: #fff; text-decoration: underline;">View Cart</a>
    `;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/* ===============================================
   Scroll Animations
   =============================================== */
function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => observer.observe(el));
}
/* ===============================================
   Order History Logic
   =============================================== */
async function initOrderHistory() {
    const listContainer = document.getElementById('orderHistoryList');
    const myOrders = JSON.parse(localStorage.getItem('moda_impeto_my_orders')) || [];

    if (myOrders.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-history">
                <p>No order history found.</p>
                <a href="index.html" class="btn btn--outline" style="margin-top: 20px; display: inline-block;">Start Shopping</a>
            </div>
        `;
        return;
    }

    try {
        const res = await fetch('/api/my-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds: myOrders })
        });

        if (!res.ok) throw new Error('Failed to fetch orders');

        const orders = await res.json();

        if (orders.length === 0) {
            listContainer.innerHTML = '<p class="empty-history">No matching orders found.</p>';
            return;
        }

        listContainer.innerHTML = orders.map(order => {
            const date = new Date(order.createdAt).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const canCancel = ['Pending', 'Processing'].includes(order.status) &&
                (new Date() - new Date(order.createdAt)) < 24 * 60 * 60 * 1000;

            const statusClass = `status-${order.status.toLowerCase()}`;

            const itemsHtml = order.items.map(item => `
                <div class="order-item">
                    <img src="${item.image}" alt="${item.name}" class="item-image">
                    <div class="item-details">
                        <div class="item-name">${item.name}</div>
                        <div class="item-meta">
                            Size: ${item.size || 'Free'} | Qty: ${item.quantity} | ¥${item.price.toLocaleString()}
                        </div>
                    </div>
                </div>
            `).join('');

            return `
                <div class="order-card fade-in">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Order #${order.orderId}</div>
                            <div class="order-date">${date}</div>
                        </div>
                        <div class="order-status ${statusClass}">${order.status}</div>
                    </div>
                    <div class="order-items">
                        ${itemsHtml}
                    </div>
                    <div class="order-footer">
                        <div class="order-total">Total: ¥${order.totalAmount.toLocaleString()}</div>
                        ${canCancel ? `<button class="cancel-btn" onclick="cancelOrder('${order.orderId}')">Cancel Order</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Initialize animations if needed
        const faders = document.querySelectorAll('.fade-in');
        faders.forEach(f => f.classList.add('visible'));

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<p class="empty-history">Failed to load order history.</p>';
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
        return;
    }

    try {
        const res = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST'
        });

        const data = await res.json();

        if (res.ok) {
            alert('Order cancelled successfully.');
            initOrderHistory(); // Reload list
        } else {
            alert('Error: ' + data.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to connect to server.');
    }
}
/* ===============================================
   Smooth Scroll
   =============================================== */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href === '#' || !href.startsWith('#')) return;

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();
                const navHeight = document.getElementById('nav').offsetHeight;
                const targetPosition = target.offsetTop - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                document.querySelector('.nav__links')?.classList.remove('active');
                document.getElementById('navToggle')?.classList.remove('active');
            }
        });
    });
}
