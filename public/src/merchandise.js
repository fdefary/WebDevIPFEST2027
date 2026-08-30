import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { DB } from "./index.js"; 

// 1. Inisialisasi Global
let cart = [];
const storage = getStorage();

// 2. Satu DOMContentLoaded untuk semua listener
document.addEventListener('DOMContentLoaded', () => {
    
    // Listener untuk klik produk (Tambah ke keranjang)
    const productContainer = document.querySelector('.merch-product');
    if (productContainer) {
        productContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-add-cart');
            if (btn) {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const price = parseInt(btn.getAttribute('data-price'));
                handleInitialAdd(id, name, price);
            }
        });
    }

    // Listener untuk submit form checkout
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('btn-confirm-order');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Order...";

            try {
                const idFile = document.getElementById('checkout-id-card').files[0];
                const payFile = document.getElementById('checkout-payment-proof').files[0];
                const timestamp = Date.now();

                // Fungsi Upload (Menggunakan folder 'Merch' sesuai storage Anda)
                const uploadToMerch = async (file, subfolder) => {
                    const storageRef = ref(storage, `Merch/${subfolder}/${timestamp}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    return await getDownloadURL(snapshot.ref);
                };

                const [idUrl, payUrl] = await Promise.all([
                    uploadToMerch(idFile, 'identities'),
                    uploadToMerch(payFile, 'payments')
                ]);

                const orderData = {
                    customer_info: {
                        fullName: document.getElementById('checkout-fullname').value,
                        whatsapp: document.getElementById('checkout-whatsapp').value,
                        email: document.getElementById('checkout-email').value,
                        address: document.getElementById('checkout-address').value
                    },
                    items: cart,
                    totalAmount: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                    files: {
                        identityCardUrl: idUrl,
                        paymentProofUrl: payUrl
                    },
                    status: "pending",
                    createdAt: serverTimestamp()
                };

                const docRef = await addDoc(collection(DB, "Merch"), orderData);

                alert(`Order Successful! \nOrder ID: ${docRef.id}`);
                
                // Reset State
                cart = [];
                updateCartUI();
                resetAllProductButtons(); // Fungsi tambahan untuk mereset tampilan tombol di grid
                checkoutForm.reset();
                
                const modalElement = document.getElementById('checkoutModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();

            } catch (error) {
                console.error("Firebase Error:", error);
                alert("Failed to place order. Please check your connection.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }
});

// --- Fungsi Pendukung (Letakkan di Luar DOMContentLoaded) ---

function handleInitialAdd(id, name, price) {
    const product = { id, name, price, quantity: 1 };
    cart.push(product);
    renderQuantityControls(id, name, price);
    updateCartUI();
}

window.updateQty = function(id, name, price, delta) {
    const index = cart.findIndex(item => item.id === id);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
            renderInitialButton(id, name, price);
        } else {
            renderQuantityControls(id, name, price);
        }
    }
    updateCartUI();
};

function renderQuantityControls(id, name, price) {
    const container = document.querySelector(`#${id} .d-flex.justify-content-between`);
    const item = cart.find(i => i.id === id);
    if (!container) return;

    container.innerHTML = `
        <span class="price-tag">Rp ${price.toLocaleString('id-ID')}</span>
        <div class="d-flex align-items-center bg-white border rounded-pill px-2 shadow-sm" style="border-color: #E768A8 !important;">
            <button class="btn btn-sm p-0" onclick="updateQty('${id}', '${name}', ${price}, -1)">
                <i class="bi bi-dash-circle-fill" style="color: #E768A8;"></i>
            </button>
            <span class="mx-3 fw-bold text-dark" style="font-size: 0.9rem;">${item.quantity}</span>
            <button class="btn btn-sm p-0" onclick="updateQty('${id}', '${name}', ${price}, 1)">
                <i class="bi bi-plus-circle-fill" style="color: #E768A8;"></i>
            </button>
        </div>
    `;
}

function renderInitialButton(id, name, price) {
    const container = document.querySelector(`#${id} .d-flex.justify-content-between`);
    if (!container) return;

    container.innerHTML = `
        <span class="price-tag">Rp ${price.toLocaleString('id-ID')}</span>
        <button class="btn btn-add-cart p-0 text-dark" 
                data-id="${id}" data-name="${name}" data-price="${price}">
            <i class="bi bi-cart-plus"></i>
        </button>
    `;
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    const floatingBtn = document.getElementById('floating-cart-btn');
    
    if (badge) badge.innerText = totalItems;
    if (floatingBtn) floatingBtn.style.display = totalItems > 0 ? 'block' : 'none';
}

window.openCheckoutModal = function() {
    const summaryContainer = document.getElementById('checkout-summary');
    let totalHarga = 0;
    if (cart.length === 0) return;

    let html = '<p class="fw-bold mb-1 border-bottom">Order Summary:</p>';
    cart.forEach(item => {
        const subtotal = item.price * item.quantity;
        totalHarga += subtotal;
        html += `<div class="d-flex justify-content-between small text-dark">
                    <span>${item.name} (x${item.quantity})</span>
                    <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
                 </div>`;
    });
    html += `<div class="d-flex justify-content-between fw-bold mt-2 border-top pt-1 text-dark">
                <span>Total</span>
                <span>Rp ${totalHarga.toLocaleString('id-ID')}</span>
             </div>`;
             
    summaryContainer.innerHTML = html;
    const myModal = new bootstrap.Modal(document.getElementById('checkoutModal'));
    myModal.show();
};

function resetAllProductButtons() {
    // Cari semua kontainer produk (col) di dalam grid
    const productCards = document.querySelectorAll('.merch-product .col');
    
    productCards.forEach(card => {
        const id = card.id;
        // Cari elemen judul dan harga di dalam card tersebut
        const nameElement = card.querySelector('.card-title');
        const priceTag = card.querySelector('.price-tag');

        if (id && nameElement && priceTag) {
            const name = nameElement.innerText;
            // Ambil angka saja dari teks harga (misal: "Rp 150.000" jadi 150000)
            const price = parseInt(priceTag.innerText.replace(/[^0-9]/g, ''));
            
            // Render ulang tombol ke bentuk semula (ikon keranjang)
            renderInitialButton(id, name, price);
        }
    });
}

window.updateQty = updateQty;
window.renderInitialButton = renderInitialButton;
window.handleInitialAdd = handleInitialAdd;
window.openCheckoutModal = openCheckoutModal;