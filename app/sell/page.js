"use client";

import { useState, useEffect, useMemo } from "react";
// ใช้ ../../lib/supabaseClient เพื่อถอย 2 ชั้นจาก app/sell กลับไปยัง root
import { supabase } from "../../lib/supabaseClient";

export default function SellPage() {
  // ข้อมูลสินค้าจากฐานข้อมูล
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // รายการสินค้าในตะกร้าปัจจุบัน [{ id, sku, name, price, unit, stock, qty }]
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ดึงรายการสินค้าทั้งหมดจาก Supabase
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการโหลดสินค้า: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // คำนวณยอดรวมและจำนวนชิ้นทั้งหมดในตะกร้า
  const grandTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  // ฟิลเตอร์สินค้าตามการค้นหา (SKU หรือ ชื่อสินค้า)
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term)
    );
  });

  // เพิ่มสินค้าลงตะกร้า
  const addToCart = (product) => {
    if (product.stock <= 0) {
      alert(`สินค้า "${product.name}" หมดแล้ว`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);

      if (existing) {
        // ตรวจสอบสต็อกว่าพอให้เพิ่มจำนวนไหม
        if (existing.qty + 1 > product.stock) {
          alert(`สินค้า "${product.name}" มีคงเหลือในคลังเพียง ${product.stock} ${product.unit}`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      // ถ้ายังไม่มีในตะกร้า ให้เพิ่มเข้าไป 1 ชิ้น
      return [
        ...prevCart,
        {
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: parseFloat(product.price) || 0,
          unit: product.unit,
          stock: product.stock,
          qty: 1,
        },
      ];
    });
  };

  // ปรับจำนวนสินค้าในตะกร้า (+ / -)
  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQty > product.stock) {
      alert(`ไม่สามารถเพิ่มจำนวนได้ สินค้ามีเพียง ${product.stock} ${product.unit}`);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, qty: newQty } : item
      )
    );
  };

  // ลบสินค้าออกจากตะกร้า
  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // ล้างตะกร้าทั้งหมด
  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("ต้องการล้างรายการสินค้าในตะกร้าทั้งหมดหรือไม่?")) {
      setCart([]);
    }
  };

  // ยืนยันการชำระเงินและบันทึกข้อมูล
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("กรุณาเลือกสินค้าลงตะกร้าอย่างน้อย 1 รายการ");
      return;
    }

    if (!window.confirm(`ยืนยันการชำระเงินยอดรวม ฿${grandTotal.toLocaleString()} หรือไม่?`)) {
      return;
    }

    try {
      setSubmitting(true);
      const currentTime = new Date().toISOString();

      // 1. เตรียมข้อมูลบันทึกลงตาราง sales ทีละรายการ
      const salesPayload = cart.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        total_price: item.price * item.qty,
        sold_at: currentTime,
      }));

      // บันทึกรายการลงตาราง sales แบบหลายรายการพร้อมกัน
      const { error: salesError } = await supabase
        .from("sales")
        .insert(salesPayload);

      if (salesError) throw salesError;

      // 2. ตัดสต็อกสินค้าในตาราง products ทีละรายการ
      for (const item of cart) {
        const remainingStock = item.stock - item.qty;
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: remainingStock })
          .eq("id", item.id);

        if (stockError) throw stockError;
      }

      alert(`✅ บันทึกการขายสำเร็จ!\nยอดรวมทั้งสิ้น ฿${grandTotal.toLocaleString()}`);

      // ล้างตะกร้าและโหลดสต็อกล่าสุด
      setCart([]);
      await fetchProducts();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกการขาย: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* 🌟 1. ป้ายสรุปยอดเงินรวมทั้งหมดไว้บนสุด ขนาดใหญ่พิเศษ ชัดเจนทั้งผู้ขายและผู้ซื้อ */}
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem 2rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div>
          <div style={{ fontSize: "0.95rem", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>
            ยอดชำระสุทธิ (TOTAL AMOUNT)
          </div>
          <div style={{ fontSize: "clamp(2.5rem, 5vw, 3.8rem)", fontWeight: "800", color: "#38bdf8", lineHeight: 1.1 }}>
            ฿{grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontSize: "1.1rem", color: "#e2e8f0" }}>
            จำนวนในตะกร้า: <strong>{totalItemsCount}</strong> ชิ้น ({cart.length} รายการ)
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              style={{
                backgroundColor: "transparent",
                color: "#f87171",
                border: "1px solid #ef4444",
                borderRadius: "6px",
                padding: "0.3rem 0.8rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                alignSelf: "flex-end",
              }}
            >
              🗑️ ล้างตะกร้า
            </button>
          )}
        </div>
      </div>

      {/* 🌟 2. หน้าจอ Split 2 ฝั่ง: ซ้ายเลือกสินค้า - ขวาตะกร้าคิดเงิน */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* ฝั่งซ้าย: แคตตาล็อกสินค้า */}
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>📦 เลือกสินค้า</h2>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              {products.length} รายการในคลัง
            </span>
          </div>

          {/* ค้นหาสินค้า */}
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="🔍 ค้นหาด้วยชื่อสินค้า หรือ SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              กำลังโหลดข้อมูลสินค้า...
            </p>
          ) : filteredProducts.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
              ไม่พบสินค้าที่ค้นหา
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "0.75rem",
                maxHeight: "520px",
                overflowY: "auto",
                paddingRight: "0.25rem",
              }}
            >
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: isOutOfStock ? "#f1f5f9" : "#ffffff",
                      cursor: isOutOfStock ? "not-allowed" : "pointer",
                      opacity: isOutOfStock ? 0.6 : 1,
                      transition: "transform 0.1s, border-color 0.1s",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>
                        {p.sku}
                      </span>
                      <strong style={{ fontSize: "0.95rem", color: "#0f172a", display: "block" }}>
                        {p.name}
                      </strong>
                    </div>

                    <div style={{ marginTop: "0.75rem" }}>
                      <div style={{ fontWeight: "700", color: "#2563eb", fontSize: "1rem" }}>
                        ฿{Number(p.price).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: isOutOfStock ? "#ef4444" : "#64748b",
                          fontWeight: isOutOfStock ? "bold" : "normal",
                        }}
                      >
                        {isOutOfStock ? "สินค้าหมด" : `เหลือ ${p.stock} ${p.unit}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ฝั่งขวา: ตะกร้าสินค้าและการคิดเงิน */}
        <div className="card" style={{ margin: 0, display: "flex", flexDirection: "column", minHeight: "520px" }}>
          <h2>🛒 ตะกร้าสินค้า</h2>

          {cart.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "#94a3b8",
                padding: "3rem 1rem",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🛍️</div>
              <p>ยังไม่มีสินค้าในตะกร้า</p>
              <span style={{ fontSize: "0.85rem" }}>คลิกเลือกสินค้าจากฝั่งซ้ายเพื่อเพิ่มรายการ</span>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* รายการสินค้าในตะกร้า */}
              <div
                style={{
                  maxHeight: "360px",
                  overflowY: "auto",
                  borderBottom: "1px solid #e2e8f0",
                  marginBottom: "1rem",
                }}
              >
                {cart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0",
                      borderBottom: "1px dashed #e2e8f0",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{item.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        @฿{item.price.toLocaleString()} / {item.unit}
                      </div>
                    </div>

                    {/* ปุ่มเพิ่ม/ลดจำนวน */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.qty - 1)}
                        style={{
                          width: "28px",
                          height: "28px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          backgroundColor: "#f8fafc",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.qty}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        style={{
                          width: "44px",
                          textAlign: "center",
                          padding: "0.2rem",
                          fontSize: "0.9rem",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.qty + 1)}
                        style={{
                          width: "28px",
                          height: "28px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          backgroundColor: "#f8fafc",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* ยอดรวมของสินค้านั้นๆ */}
                    <div style={{ minWidth: "75px", textAlign: "right", fontWeight: "600" }}>
                      ฿{(item.price * item.qty).toLocaleString()}
                    </div>

                    {/* ลบรายการ */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "0.2rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* สรุปยอดเงินย่อย */}
              <div style={{ marginTop: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span>จำนวนรวม:</span>
                  <strong>{totalItemsCount} ชิ้น</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "1rem",
                    paddingTop: "0.5rem",
                    borderTop: "2px solid #e2e8f0",
                  }}
                >
                  <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>ยอดชำระ:</span>
                  <span style={{ fontSize: "1.6rem", fontWeight: "800", color: "#2563eb" }}>
                    ฿{grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* ปุ่มยืนยันคิดเงิน */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting || cart.length === 0}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "0.9rem",
                    fontSize: "1.15rem",
                    fontWeight: "700",
                    borderRadius: "8px",
                    backgroundColor: submitting ? "#94a3b8" : "#16a34a",
                  }}
                >
                  {submitting ? "⏳ กำลังบันทึกการขาย..." : "💳 ชำระเงิน / บันทึกการขาย"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
