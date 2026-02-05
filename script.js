/* ===============================================
   MODA IMPETO - Interactive Scripts
   =============================================== */

// Product Database
const PRODUCTS = {
    1: { id: 1, name: 'IMPETO Leather Jacket', price: 128000, image: 'assets/products/product_jacket_1770300090044.png', category: 'Outerwear' },
    2: { id: 2, name: 'IMPETO Signature Hoodie', price: 48000, image: 'assets/products/product_hoodie_1770300104061.png', category: 'Tops' },
    3: { id: 3, name: 'IMPETO Essential Tee', price: 18000, image: 'assets/products/product_tshirt_1770300121576.png', category: 'Tops' },
    4: { id: 4, name: 'IMPETO Cargo Pants', price: 58000, image: 'assets/products/product_pants_1770300139239.png', category: 'Bottoms' }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initNavigation();
    initScrollAnimations();
    initSmoothScroll();
    initCart();
});

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
function initCart() {
    updateCartCount();

    // Add to cart buttons
    const addToCartBtns = document.querySelectorAll('.add-to-cart');
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            addToCart(productId);

            // Animation effect
            const originalText = btn.textContent;
            btn.textContent = 'ADDED';
            btn.classList.add('added');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('added');
            }, 1000);
        });
    });

    // If on cart page, render it
    if (document.getElementById('cartItems')) {
        renderCart();
    }
}

function addToCart(productId) {
    let cart = JSON.parse(localStorage.getItem('moda_impeto_cart')) || {};

    if (cart[productId]) {
        cart[productId].quantity += 1;
    } else {
        cart[productId] = {
            id: productId,
            quantity: 1
        };
    }

    localStorage.setItem('moda_impeto_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cartCountElement = document.getElementById('cartCount');
    if (!cartCountElement) return;

    let cart = JSON.parse(localStorage.getItem('moda_impeto_cart')) || {};
    let total = 0;

    Object.values(cart).forEach(item => {
        total += item.quantity;
    });

    cartCountElement.textContent = total;
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    const subtotalElement = document.getElementById('cartSubtotal');
    let cart = JSON.parse(localStorage.getItem('moda_impeto_cart')) || {};

    if (Object.keys(cart).length === 0) {
        cartItemsContainer.innerHTML = '<div class="cart-empty"><p>Your cart is empty.</p><a href="index.html" class="btn btn--outline">Continue Shopping</a></div>';
        subtotalElement.textContent = '¥0';
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
                <div class="cart-item">
                    <div class="cart-item__image">
                        <img src="${product.image}" alt="${product.name}">
                    </div>
                    <div class="cart-item__details">
                        <h3 class="cart-item__name">${product.name}</h3>
                        <p class="cart-item__category">${product.category}</p>
                        <p class="cart-item__price">¥${product.price.toLocaleString()}</p>
                    </div>
                    <div class="cart-item__quantity">
                        <button class="quantity-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                    </div>
                    <div class="cart-item__total">
                        ¥${itemTotal.toLocaleString()}
                    </div>
                    <button class="cart-item__remove" onclick="removeFromCart(${item.id})">
                        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
                    </button>
                </div>
            `;
        }
    });

    cartItemsContainer.innerHTML = html;
    subtotalElement.textContent = `¥${subtotal.toLocaleString()}`;
}

window.changeQuantity = function (productId, delta) {
    let cart = JSON.parse(localStorage.getItem('moda_impeto_cart')) || {};
    if (cart[productId]) {
        cart[productId].quantity += delta;
        if (cart[productId].quantity <= 0) {
            delete cart[productId];
        }
        localStorage.setItem('moda_impeto_cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
    }
};

window.removeFromCart = function (productId) {
    let cart = JSON.parse(localStorage.getItem('moda_impeto_cart')) || {};
    if (cart[productId]) {
        delete cart[productId];
        localStorage.setItem('moda_impeto_cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
    }
};

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
