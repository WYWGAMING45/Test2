// ========== CONFIGURATION ==========
// Replace with your deployed Google Apps Script Web App URL
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbw6GpN-w9l1Qm0mh0xfnHw2k9Y-7VQKqZb5Yp6GExZ3Yj3e6z5y/exec';

// Product data (same as before)
const productData = [
    { id: 100, title: 'Nasi Lemak', description: 'Coconut rice with sambal, anchovies, peanuts and boiled egg', category: 'Main', productCode: 'FOOD-001', price: 12.99, image: 'https://images.unsplash.com/photo-1634034379073-f689b460a3fc?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=150&w=150', hidden: false },
    { id: 101, title: 'Char Kway Teow', description: 'Stir-fried rice noodles with prawns, eggs, and bean sprouts', category: 'Main', productCode: 'FOOD-002', price: 14.99, image: 'https://images.unsplash.com/photo-1626082927389-6cd097cee6a6?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=150&w=150', hidden: false },
    { id: 102, title: 'Roti Canai', description: 'Flaky flatbread served with curry dipping sauce', category: 'Side', productCode: 'FOOD-003', price: 5.99, image: 'https://images.unsplash.com/photo-1628432136678-43ff9be34064?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=150&w=150', hidden: false },
    { id: 103, title: 'Teh Tarik', description: 'Sweet pulled milk tea, Malaysia\'s national drink', category: 'Beverage', productCode: 'DRINK-004', price: 3.99, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&h=150&w=150', hidden: false }
];

const categories = [
    { id: 1, name: 'All', color: '#94a3b8' },
    { id: 2, name: 'Main', color: '#10b981' },
    { id: 3, name: 'Side', color: '#f97316' },
    { id: 4, name: 'Beverage', color: '#0ea5e9' }
];

// Payment QR codes (static for demo)
const paymentInfo = {
    maeQr: 'https://via.placeholder.com/250x250.png?text=MAE+QR',
    tngQr: 'https://via.placeholder.com/250x250.png?text=TNG+QR',
    instructions: 'After payment, please take a screenshot of the receipt and send it to us via WhatsApp or email for verification.'
};

// Contact info (used in order summary & email)
const contactInfo = {
    email: 'orders@restaurant.com',
    phone: '+60 12-345 6789'
};

// ----- Shopping Cart State -----
let cart = [];

// ----- DOM Elements -----
const cartIcon = document.querySelector('.cart-icon');
const cartSidebar = document.getElementById('cartModal');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalSpan = document.getElementById('cartTotal');
const cartCountSpan = document.querySelector('.cart-count');
const closeCartBtn = document.getElementById('closeCart');
const checkoutBtn = document.getElementById('checkoutBtn');
const summaryModal = document.getElementById('summaryModal');
const summaryItemsBody = document.getElementById('summaryItems');
const summaryTotalSpan = document.getElementById('summaryTotal');
const closeSummaryBtn = document.getElementById('closeSummary');
const screenshotBtn = document.getElementById('screenshotBtn');
const submitOrderBtn = document.getElementById('submitOrderBtn');
const summaryStepDiv = document.getElementById('summaryStep');
const paymentStepDiv = document.getElementById('paymentStep');
const backToSummaryBtn = document.getElementById('backToSummaryBtn');
const newOrderBtn = document.getElementById('newOrderBtn');
const paymentOptions = document.querySelectorAll('.payment-option');
const maeQrContainer = document.getElementById('maeQrContainer');
const tngQrContainer = document.getElementById('tngQrContainer');
const maeQrImage = document.getElementById('maeQrImage');
const tngQrImage = document.getElementById('tngQrImage');
const paymentInstructionsText = document.getElementById('paymentInstructionsText');
const categoryFilterDiv = document.getElementById('categoryFilter');
const productGrid = document.getElementById('productGrid');

// ----- Event Listeners -----
cartIcon.addEventListener('click', () => cartSidebar.classList.add('open'));
closeCartBtn.addEventListener('click', () => cartSidebar.classList.remove('open'));

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    cartSidebar.classList.remove('open');
    showOrderSummary();
});

closeSummaryBtn.addEventListener('click', () => {
    summaryModal.style.display = 'none';
    showSummaryStep();
});

screenshotBtn.addEventListener('click', () => {
    html2canvas(document.querySelector('.summary-step')).then(canvas => {
        const link = document.createElement('a');
        link.download = 'order-summary.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

// Submit Order & proceed to Payment
submitOrderBtn.addEventListener('click', () => {
    submitOrderToGAS();
});

backToSummaryBtn.addEventListener('click', () => {
    showSummaryStep();
    // Re-enable submit button if needed
    submitOrderBtn.disabled = false;
});

newOrderBtn.addEventListener('click', startNewOrder);

paymentOptions.forEach(option => {
    option.addEventListener('click', () => {
        paymentOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        const method = option.dataset.method;
        maeQrContainer.style.display = 'none';
        tngQrContainer.style.display = 'none';

        if (method === 'mae') {
            maeQrContainer.style.display = 'block';
            document.querySelector('.qr-code', maeQrContainer).style.display = 'block';
            maeQrImage.src = paymentInfo.maeQr;
        } else if (method === 'tng') {
            tngQrContainer.style.display = 'block';
            document.querySelector('.qr-code', tngQrContainer).style.display = 'block';
            tngQrImage.src = paymentInfo.tngQr;
        }
    });
});

// ----- Initialise UI -----
renderCategoryFilter();
renderProductGrid('All');
setActiveCategoryButton('All');

// ----- Functions -----
function renderCategoryFilter() {
    categoryFilterDiv.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = cat.name;
        btn.dataset.category = cat.name;
        btn.style.backgroundColor = cat.color;
        btn.addEventListener('click', () => {
            renderProductGrid(cat.name);
            setActiveCategoryButton(cat.name);
        });
        categoryFilterDiv.appendChild(btn);
    });
}

function setActiveCategoryButton(categoryName) {
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.category-btn[data-category="${categoryName}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

function renderProductGrid(category = 'All') {
    productGrid.innerHTML = '';
    const filtered = category === 'All'
        ? productData.filter(p => !p.hidden)
        : productData.filter(p => p.category === category && !p.hidden);

    filtered.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.title}" class="product-image-preview">
            <div class="product-info">
                <div class="product-title-preview">${product.title}</div>
                <div class="product-description">${product.description}</div>
                <div class="product-category" style="background: ${getCategoryColor(product.category)}">${product.category}</div>
                <div class="product-code">Code: ${product.productCode}</div>
                <div class="product-footer">
                    <div class="product-price-preview">RM ${product.price.toFixed(2)}</div>
                    <button class="add-to-cart" data-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });

    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.dataset.id);
            addToCart(productId);
        });
    });
}

function getCategoryColor(name) {
    const found = categories.find(c => c.name === name);
    return found ? found.color : '#94a3b8';
}

// Cart actions
function addToCart(productId) {
    const product = productData.find(p => p.id === productId);
    if (!product) return;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            productCode: product.productCode,
            quantity: 1
        });
    }
    updateCartUI();
    cartSidebar.classList.add('open');
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountSpan.textContent = totalItems;

    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Your cart is empty</p></div>';
        cartTotalSpan.textContent = 'RM 0.00';
        checkoutBtn.disabled = true;
        return;
    }

    checkoutBtn.disabled = false;
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="cart-item-image">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-price">RM ${item.price.toFixed(2)}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn minus" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn plus" data-id="${item.id}">+</button>
                </div>
            </div>
            <div class="remove-item" data-id="${item.id}">
                <i class="fas fa-trash"></i>
            </div>
        `;
        cartItemsContainer.appendChild(itemDiv);
    });

    // Attach listeners
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(parseInt(btn.dataset.id), -1));
    });
    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(parseInt(btn.dataset.id), 1));
    });
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
    });

    cartTotalSpan.textContent = `RM ${total.toFixed(2)}`;
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }
    updateCartUI();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCartUI();
}

// Order Summary & Submission
function showOrderSummary() {
    summaryItemsBody.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.productCode}</td>
            <td>${item.title}</td>
            <td>RM ${item.price.toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>RM ${itemTotal.toFixed(2)}</td>
        `;
        summaryItemsBody.appendChild(row);
    });

    summaryTotalSpan.textContent = `RM ${total.toFixed(2)}`;

    // Contact info in summary
    const contactDiv = document.querySelector('#summaryStep .summary-instructions');
    contactDiv.innerHTML = `
        <p>Please send payment proof to:</p>
        ${contactInfo.email ? `<p><i class="fas fa-envelope"></i> ${contactInfo.email}</p>` : ''}
        ${contactInfo.phone ? `<p><i class="fab fa-whatsapp"></i> ${contactInfo.phone}</p>` : ''}
    `;

    summaryModal.style.display = 'flex';
    showSummaryStep();
    submitOrderBtn.disabled = false; // enable again when viewing summary
}

function showSummaryStep() {
    summaryStepDiv.style.display = 'block';
    paymentStepDiv.style.display = 'none';
}

function showPaymentStep() {
    summaryStepDiv.style.display = 'none';
    paymentStepDiv.style.display = 'block';
    // Reset payment UI
    paymentOptions.forEach(opt => opt.classList.remove('active'));
    maeQrContainer.style.display = 'none';
    tngQrContainer.style.display = 'none';
    document.querySelectorAll('.qr-code').forEach(el => el.style.display = 'none');
    paymentInstructionsText.textContent = paymentInfo.instructions;
}

async function submitOrderToGAS() {
    if (cart.length === 0) return;

    // Disable submit button to prevent double submission
    submitOrderBtn.disabled = true;

    const orderData = {
        items: cart.map(item => ({
            productCode: item.productCode,
            title: item.title,
            price: item.price,
            quantity: item.quantity
        })),
        total: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
        timestamp: new Date().toISOString(),
        contact: contactInfo
    };

    try {
        const response = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            // Use plain text to avoid CORS preflight
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success') {
            // Order accepted: clear cart, move to payment step
            cart = [];
            updateCartUI();
            showPaymentStep();
            // Optionally show a success message
            alert('Order submitted successfully! The kitchen has been notified.');
        } else {
            throw new Error(result.message || 'Submission failed.');
        }
    } catch (error) {
        console.error('Order submission error:', error);
        alert('Failed to submit order. Please try again. If the problem persists, contact staff.');
        submitOrderBtn.disabled = false; // re-enable button
    }
}

function startNewOrder() {
    cart = [];
    updateCartUI();
    summaryModal.style.display = 'none';
    showSummaryStep();
}