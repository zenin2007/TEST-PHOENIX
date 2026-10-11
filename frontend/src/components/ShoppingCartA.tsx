import React, { useState } from 'react';

interface ShoppingCartAProps {
  onOrderPlaced?: (order: any) => void;
}

export const ShoppingCartA: React.FC<ShoppingCartAProps> = ({ onOrderPlaced }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCart = () => {
    setModalOpen(true);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: 'Wireless Noise-Canceling Headphones',
          price: 349.99,
          customer_name: customerName,
          quantity: 1,
          status: 'Placed'
        })
      });

      if (response.ok) {
        const orderData = await response.json();
        setOrderConfirmed(orderData);
        setModalOpen(false);
        if (onOrderPlaced) onOrderPlaced(orderData);
      }
    } catch (err) {
      console.error('Order submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-blue)' }}>
            E-Commerce Baseline (Version A)
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            Audio Pro Storefront
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Canonical modal checkout workflow using standard element IDs.
          </p>
        </div>
      </div>

      {orderConfirmed && (
        <div id="order-confirmation" className="order-confirmation" style={{
          background: 'rgba(52, 199, 89, 0.08)',
          border: '1px solid rgba(52, 199, 89, 0.3)',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#1E7E34', fontSize: '1.05rem' }}>
              ✓ Order Confirmed: {orderConfirmed.product_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Recipient: <strong style={{ color: 'var(--text-primary)' }}>{orderConfirmed.customer_name}</strong> | Total: $349.99 (Order #{orderConfirmed.id})
            </div>
          </div>
          <span style={{
            background: '#34C759',
            color: '#FFFFFF',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            VERIFIED IN SQLITE
          </span>
        </div>
      )}

      {/* Product Catalog Card */}
      <section className="product-catalog-card" style={{
        background: '#FFFFFF',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: 'var(--shadow-floating)',
        display: 'flex',
        gap: '2.5rem',
        alignItems: 'center'
      }}>
        <div style={{
          width: '160px',
          height: '160px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3.5rem'
        }}>
          🎧
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Flagship Audio
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            Wireless Noise-Canceling Headphones
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
            Premium 40mm neodymium drivers, active noise cancellation, 30-hour battery life, and crystal-clear high fidelity sound.
          </p>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.75rem' }}>
            $349.99
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <button
              id="add-to-cart-btn"
              onClick={handleOpenCart}
              style={{
                background: 'var(--accent-blue)',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div id="cart-modal" role="dialog" aria-modal="true" style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '2rem',
            boxShadow: 'var(--shadow-floating)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Shopping Cart Checkout
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckout}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Customer Name
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ background: 'var(--bg-inset)', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>Item: Wireless Headphones</span>
                  <span>$349.99</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                  <span>Total Due</span>
                  <span>$349.99</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  id="checkout-btn"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'var(--accent-blue)',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Processing...' : 'Complete Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
