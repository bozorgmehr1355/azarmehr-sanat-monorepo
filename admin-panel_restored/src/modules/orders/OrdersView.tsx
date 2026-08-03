import React, { useState } from "react";

export const OrdersView: React.FC = () => {
  const [filter, setFilter] = useState("all");
  const sampleOrders = [
    { id: "ORD-1001", customerName: "\u0641\u0631\u0648\u0634\u06AF\u0627\u0647 \u0622\u0630\u0631\u062E\u0634", amount: "\u06DB\u06B5,\u06DB\u06B0\u06DB\u06B0,\u06DB\u06B0\u06DB\u06B0 \u062A\u0648\u0645\u0627\u0646", status: "completed", date: "\u06DB\u06B1\u06DB\u06B4\u06DB\u06B0\u06DB\u06B5/\u06DB\u06B0\u06DB\u06B5/\u06DB\u06B0\u06DB\u06B8", itemsCount: 12 },
    { id: "ORD-1002", customerName: "\u0634\u0631\u06A9\u062A \u0628\u0627\u0647\u0631 \u0635\u0646\u0639\u062A", amount: "\u06DB\u06B1\u06DB\u06B2\u06DB\u06B0,\u06DB\u06B0\u06DB\u06B0,\u06DB\u06B0\u06DB\u06B0 \u062A\u0648\u0645\u0627\u0646", status: "processing", date: "\u06DB\u06B1\u06DB\u06B4\u06DB\u06B0\u06DB\u06B5/\u06DB\u06B0\u06DB\u06B5/\u06DB\u06B0\u06DB\u06B8", itemsCount: 45 }
  ];

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#f0f6fc", marginBottom: "16px" }}>
        \uD83D\uDED2 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0633\u0641\u0627\u0631\u0634\u0627\u062A
      </h1>
      <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "12px", padding: "16px" }}>
        <table style={{ width: "100%", color: "#f0f6fc", textAlign: "right", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "#8b949e", borderBottom: "1px solid #30363d" }}>
              <th style={{ padding: "12px" }}>\u0634\u0645\u0627\u0631\u0647 \u0633\u0641\u0627\u0631\u0634</th>
              <th style={{ padding: "12px" }}>\u0645\u0634\u062A\u0631\u06CC</th>
              <th style={{ padding: "12px" }}>\u062A\u0639\u062F\u0627\u062F</th>
              <th style={{ padding: "12px" }}>\u0645\u0628\u0644\u063A \u06A9\u0644</th>
              <th style={{ padding: "12px" }}>\u062A\u0627\u0631\u06CC\u062E</th>
            </tr>
          </thead>
          <tbody>
            {sampleOrders.map(o => (
              <tr key={o.id} style={{ borderBottom: "1px solid #21262d" }}>
                <td style={{ padding: "12px", fontWeight: 600 }}>{o.id}</td>
                <td style={{ padding: "12px" }}>{o.customerName}</td>
                <td style={{ padding: "12px" }}>{o.itemsCount}</td>
                <td style={{ padding: "12px" }}>{o.amount}</td>
                <td style={{ padding: "12px", color: "#8b949e" }}>{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};