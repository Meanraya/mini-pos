"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ProductsPage() {
  // State จัดการรายการสินค้าและสถานะการโหลด
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // State ฟอร์มสำหรับเพิ่ม/แก้ไขสินค้า
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    price: "",
    stock: "",
    unit: "ชิ้น",
  });

  // State ระบุว่ากำลังแก้ไขสินค้าชิ้นไหนอยู่ (ถ้าเป็น null แปลว่าโหมดเพิ่มสินค้าใหม่)
  const [editingId, setEditingId] = useState(null);

  // ดึงรายการสินค้าทั้งหมดจาก Supabase
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

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

  // จัดการการเปลี่ยนค่าใน Input ของฟอร์ม
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // จัดการ Submit ฟอร์ม (ทั้งเพิ่มใหม่และอัปเดต)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      sku: formData.sku.trim(),
      name: formData.name.trim(),
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock, 10) || 0,
      unit: formData.unit.trim(),
    };

    try {
      if (editingId) {
        // กรณีแก้ไขสินค้าเดิม
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        alert("อัปเดตข้อมูลสินค้าสำเร็จ!");
      } else {
        // กรณีเพิ่มสินค้าใหม่
        const { error } = await supabase.from("products").insert([payload]);

        if (error) throw error;
        alert("เพิ่มสินค้าใหม่สำเร็จ!");
      }

      // รีเซ็ตฟอร์มและดึงข้อมูลใหม่
      handleCancelEdit();
      fetchProducts();
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  // เลือกสินค้าเพื่อเข้าสู่โหมดแก้ไข
  const handleEditClick = (product) => {
    setEditingId(product.id);
    setFormData({
      sku: product.sku || "",
      name: product.name || "",
      price: product.price || "",
      stock: product.stock || "",
      unit: product.unit || "ชิ้น",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ยกเลิกโหมดแก้ไข ล้างฟอร์มกลับเป็นค่าเริ่มต้น
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      sku: "",
      name: "",
      price: "",
      stock: "",
      unit: "ชิ้น",
    });
  };

  // ลบสินค้า
  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ "${name}"?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      alert("ลบสินค้าเรียบร้อยแล้ว");
      fetchProducts();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบ: " + error.message);
    }
  };

  return (
    <div>
      <h1>📦 จัดการสินค้า</h1>

      {/* ฟอร์มเพิ่ม / แก้ไขสินค้า */}
      <div className="card">
        <h2>{editingId ? "✏️ แก้ไขข้อมูลสินค้า" : "➕ เพิ่มสินค้าใหม่"}</h2>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label>รหัสสินค้า (SKU)</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="เช่น A001"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>ชื่อสินค้า</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="เช่น นมสดรสจืด"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>ราคา (บาท)</label>
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>จำนวนคงเหลือ</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>หน่วยนับ</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="เช่น ขวด, กล่อง, ชิ้น"
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? "บันทึกการแก้ไข" : "เพิ่มสินค้า"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ตารางแสดงรายการสินค้า */}
      <div className="card">
        <h2>📋 รายการสินค้าทั้งหมด ({products.length})</h2>

        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "1rem" }}>
            กำลังโหลดข้อมูลสินค้า...
          </p>
        ) : products.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "1rem" }}>
            ยังไม่มีสินค้าในระบบ เริ่มต้นเพิ่มสินค้าด้านบนได้เลย
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>ชื่อสินค้า</th>
                  <th>ราคา</th>
                  <th>คงเหลือ</th>
                  <th>หน่วย</th>
                  <th style={{ textAlign: "center" }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.sku}</strong>
                    </td>
                    <td>{product.name}</td>
                    <td>{Number(product.price).toLocaleString()} ฿</td>
                    <td>
                      <span
                        style={{
                          color: product.stock <= 5 ? "#ef4444" : "#1e293b",
                          fontWeight: product.stock <= 5 ? "bold" : "normal",
                        }}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.unit}</td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "0.5rem",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.85rem" }}
                          onClick={() => handleEditClick(product)}
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.85rem" }}
                          onClick={() => handleDelete(product.id, product.name)}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
