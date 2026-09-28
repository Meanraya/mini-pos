"use client";

import { useState, useEffect } from "react";
// นำเข้า supabase ตามข้อกำหนด (หมายเหตุ: หาก Next.js ฟ้องหาไฟล์ไม่พบบนเครื่องจริงเนื่องจากโฟลเดอร์ sell อยู่ลึก 2 ชั้น ให้ปรับเป็น '../../lib/supabaseClient')
import { supabase } from "../lib/supabaseClient";

export default function SellPage() {
  // State รายการสินค้าและสถานะการโหลด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับการขาย
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // ดึงรายการสินค้าทั้งหมดจาก Supabase เพื่อนำมาแสดงใน Dropdown
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
      alert("เกิดข้อผิดพลาดในการโหลดรายการสินค้า: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ค้นหาข้อมูลของสินค้าที่กำลังเลือกอยู่
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // คำนวณยอดรวมอัตโนมัติ (ราคา x จำนวน)
  const currentQuantity = parseInt(quantity, 10) || 0;
  const unitPrice = selectedProduct ? parseFloat(selectedProduct.price) : 0;
  const totalPrice = unitPrice * currentQuantity;

  // จัดการเมื่อกดปุ่ม "ขาย"
  const handleSell = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert("กรุณาเลือกสินค้าที่ต้องการขาย");
      return;
    }

    if (currentQuantity <= 0) {
      alert("จำนวนสินค้าที่ขายต้องมากกว่า 0");
      return;
    }

    // 1. ตรวจสอบว่าสต็อกคงเหลือเพียงพอหรือไม่
    if (selectedProduct.stock < currentQuantity) {
      alert(
        `สินค้าไม่เพียงพอ! "${selectedProduct.name}" คงเหลือเพียง ${selectedProduct.stock} ${selectedProduct.unit}`
      );
      return;
    }

    try {
      setSubmitting(true);

      // 2. บันทึกรายการลงตาราง sales
      const salePayload = {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: currentQuantity,
        total_price: totalPrice,
        sold_at: new Date().toISOString(),
      };

      const { error: saleError } = await supabase
        .from("sales")
        .insert([salePayload]);

      if (saleError) throw saleError;

      // 3. อัปเดต stock ในตาราง products ให้ลดลงตามจำนวนที่ขาย
      const updatedStock = selectedProduct.stock - currentQuantity;
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock: updatedStock })
        .eq("id", selectedProduct.id);

      if (stockError) throw stockError;

      // 4. แสดงข้อความสำเร็จและรีเซ็ตฟอร์ม
      alert(
        `ขายสำเร็จ!\nสินค้า: ${selectedProduct.name}\nจำนวน: ${currentQuantity} ${selectedProduct.unit}\nยอดรวม: ${totalPrice.toLocaleString()} บาท`
      );

      setSelectedProductId("");
      setQuantity(1);

      // โหลดข้อมูลสินค้าใหม่เพื่ออัปเดตสต็อกล่าสุดใน Dropdown
      await fetchProducts();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกการขาย: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1>💳 ขายสินค้า (POS)</h1>

      <div className="card">
        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "1rem" }}>
            กำลังโหลดข้อมูลสินค้า...
          </p>
        ) : (
          <form onSubmit={handleSell}>
            {/* 1. Dropdown เลือกสินค้า */}
            <div className="form-group">
              <label htmlFor="product-select">เลือกสินค้าที่ต้องการขาย</label>
              <select
                id="product-select"
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setQuantity(1); // รีเซ็ตจำนวนเป็น 1 เมื่อเปลี่ยนสินค้า
                }}
                required
              >
                <option value="">-- กรุณาเลือกสินค้า --</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    [{product.sku}] {product.name} - ราคา {Number(product.price).toLocaleString()} ฿ (เหลือ {product.stock} {product.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. ช่องกรอกจำนวน */}
            <div className="form-group">
              <label htmlFor="quantity-input">
                จำนวนที่ขาย {selectedProduct ? `(${selectedProduct.unit})` : ""}
              </label>
              <input
                id="quantity-input"
                type="number"
                min="1"
                max={selectedProduct ? selectedProduct.stock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="ระบุจำนวน"
                disabled={!selectedProduct || selectedProduct.stock <= 0}
                required
              />
              {selectedProduct && (
                <small
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    color: selectedProduct.stock > 0 ? "#64748b" : "#ef4444",
                    fontWeight: selectedProduct.stock <= 0 ? "bold" : "normal",
                  }}
                >
                  คงเหลือในคลัง: {selectedProduct.stock} {selectedProduct.unit}
                  {selectedProduct.stock <= 0 && " (สินค้าหมด ไม่สามารถขายได้)"}
                </small>
              )}
            </div>

            {/* 3. สรุปรายการและยอดรวมอัตโนมัติ */}
            <div
              style={{
                backgroundColor: "#f1f5f9",
                borderRadius: "6px",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                  fontSize: "0.95rem",
                }}
              >
                <span>ราคาต่อหน่วย:</span>
                <strong>
                  {selectedProduct
                    ? `${Number(selectedProduct.price).toLocaleString()} ฿`
                    : "-"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                  fontSize: "0.95rem",
                }}
              >
                <span>จำนวนที่ขาย:</span>
                <strong>
                  {currentQuantity} {selectedProduct?.unit || ""}
                </strong>
              </div>
              <hr style={{ border: "0", borderTop: "1px solid #cbd5e1", margin: "0.5rem 0" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "1.2rem",
                  color: "#0f172a",
                }}
              >
                <span>ยอดรวมทั้งหมด:</span>
                <span style={{ fontWeight: "700", color: "#2563eb" }}>
                  {totalPrice.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ฿
                </span>
              </div>
            </div>

            {/* 4. ปุ่มกดยืนยันการขาย */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", fontSize: "1.05rem", padding: "0.75rem" }}
              disabled={
                submitting ||
                !selectedProduct ||
                selectedProduct.stock <= 0 ||
                currentQuantity <= 0
              }
            >
              {submitting ? "กำลังบันทึกรายการ..." : "🛒 ยืนยันการขาย"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
