"use client";

import { useState, useEffect } from "react";
// นำเข้า supabase ตามข้อกำหนดโครงสร้างโปรเจกต์
import { supabase } from "../lib/supabaseClient";

export default function HistoryPage() {
  // State สำหรับเก็บรายการประวัติการขายและสถานะการโหลด
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟังก์ชันดึงข้อมูลประวัติการขายจาก Supabase
  const fetchSalesHistory = async () => {
    try {
      setLoading(true);
      // 1. ดึงข้อมูลจากตาราง sales เรียงลำดับจากล่าสุดไปเก่าสุด
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("sold_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการโหลดประวัติการขาย: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  // 3. คำนวณยอดขายรวมทั้งหมด (Sum ของ total_price)
  const totalRevenue = sales.reduce(
    (sum, item) => sum + (parseFloat(item.total_price) || 0),
    0
  );

  // ฟังก์ชันช่วยจัดรูปแบบวันเวลาให้อ่านง่ายในรูปแบบภาษาไทย
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1>📜 ประวัติการขาย</h1>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchSalesHistory}
          disabled={loading}
          style={{ fontSize: "0.875rem" }}
        >
          🔄 รีเฟรชข้อมูล
        </button>
      </div>

      {/* 3. การ์ดแสดงสรุปยอดขายรวมทั้งหมด */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#eff6ff",
          borderColor: "#bfdbfe",
        }}
      >
        <div>
          <span style={{ fontSize: "0.95rem", color: "#1e40af", fontWeight: 500 }}>
            ยอดขายรวมทั้งหมด
          </span>
          <h2
            style={{
              fontSize: "2rem",
              color: "#1d4ed8",
              margin: "0.25rem 0 0 0",
              fontWeight: 700,
            }}
          >
            {totalRevenue.toLocaleString("th-TH", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span style={{ fontSize: "1.2rem" }}>บาท</span>
          </h2>
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <span
            style={{
              backgroundColor: "#dbeafe",
              color: "#1e40af",
              padding: "0.4rem 0.8rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            รวมทั้งหมด {sales.length} รายการ
          </span>
        </div>
      </div>

      {/* 2. ตารางแสดงรายการประวัติการขาย */}
      <div className="card">
        <h2>📋 รายการที่ขายแล้ว</h2>

        {loading ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "1.5rem" }}>
            กำลังโหลดข้อมูลประวัติการขาย...
          </p>
        ) : sales.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "1.5rem" }}>
            ยังไม่มีประวัติการขายในระบบ
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>วันเวลาที่ขาย</th>
                  <th>ชื่อสินค้า</th>
                  <th style={{ textAlign: "center" }}>จำนวน</th>
                  <th style={{ textAlign: "right" }}>ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      {formatDateTime(sale.sold_at)}
                    </td>
                    <td>
                      <strong>{sale.product_name}</strong>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {Number(sale.quantity).toLocaleString()}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: "#0f172a",
                      }}
                    >
                      {Number(sale.total_price).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ฿
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
