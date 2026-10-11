import React, { useState } from 'react';

interface ShoppingCartBProps {
  onOrderPlaced?: (order: any) => void;
}

export const ShoppingCartB: React.FC<ShoppingCartBProps> = ({ onOrderPlaced }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: 'Studio Wireless Headphones (Refreshed Edition)',
          price: 349.99,
          customer_name: recipientName,
          quantity: 1,
          status: 'Placed'
        })
      });

      if (response.ok) {
        const orderData = await response.json();
        setOrderConfirmed(orderData);
        setDrawerOpen(false);
        if (onOrderPlaced) onOrderPlaced(orderData);
      }
    } catch (err) {
      console.error('Order placement error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8E8E93' }}>
            Storefront Redesign (Version B)
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            Next-Gen Sound Experience
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Completely redesigned drawer panel, modified element IDs, and renamed checkout triggers.
          </p>
        </div>
      </div>

      {orderConfirmed && (
        <div id="order-receipt" className="order-receipt" style={{
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
              ✓ Purchase Complete: {orderConfirmed.product_name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Delivering to: <strong style={{ color: 'var(--text-primary)' }}>{orderConfirmed.customer_name}</strong> | Total: $349.99 (Receipt #{orderConfirmed.id})
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

      {/* Redesigned Hero Showcase Card */}
      <section className="product-hero-card" style={{
        background: 'linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%)',
        color: '#FFFFFF',
        borderRadius: '20px',
        padding: '2.5rem',
        boxShadow: 'var(--shadow-floating)',
        display: 'flex',
        gap: '3rem',
        alignItems: 'center'
      }}>
        <div style={{
          width: '180px',
          height: '180px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '4.5rem'
        }}>
          🎧
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0A84FF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Next-Gen Spatial Audio
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.25rem' }}>
            Studio Wireless Noise-Canceling Headphones
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
            Ultra-low latency, custom acoustic architecture, spatial tracking, and adaptive active cancellation for audiophiles.
          </p>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.85rem' }}>
            $349.99
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            {/* Drastically renamed button and ID */}
            <button
              id="purchase-audio-item"
              onClick={handleOpenDrawer}
              style={{
                background: '#0071E3',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.85rem 2rem',
                borderRadius: '999px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 113, 227, 0.35)'
              }}
            >
              Purchase Wireless Headset
            </button>
          </div>
        </div>
      </section>

      {/* Slideout Shopping Bag Drawer */}
      {drawerOpen && (
        <aside style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div id="shopping-bag-drawer" className="shopping-bag-drawer" style={{
            background: '#FFFFFF',
            width: '100%',
            maxWidth: '440px',
            height: '100%',
            padding: '2.5rem 2rem',
            boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-blue)' }}>
                  Bag & Checkout
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  Review Order
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Recipient Name for Delivery
                </label>
                <input
                  id="shipping-recipient-name"
                  type="text"
                  placeholder="e.g. Jordan Miller"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ background: '#F5F5F7', padding: '1.25rem', borderRadius: '12px', marginBottom: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <span>Studio Wireless Headphones</span>
                  <span>$349.99</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  <span>Express Shipping</span>
                  <span style={{ color: '#34C759', fontWeight: 600 }}>Free</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  <span>Order Total</span>
                  <span>$349.99</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  id="place-order-btn"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: '#0071E3',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.95rem 1.5rem',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order & Pay'}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Back to Store
                </button>
              </div>
            </form>
          </div>
        </aside>
      )}
    </div>
  );
};
