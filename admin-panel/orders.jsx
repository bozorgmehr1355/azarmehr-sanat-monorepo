/* ════════════════════════════════════════════════════════════════════════════
   ORDERS EXCLUSIVE MODULE
   Loaded after core runtime; all shared deps consumed via window.*
   ────────────────────────────────────────────────────────────────────────── */
const {
  useState, useEffect, useRef, useCallback, useMemo
} = React;

const {
  C, FF, SP, RD, FZ, IZ, BH,
  cardStyle, iStyle, SH,
  fa, cur, shortCur,
  api, ORDER_STATUS, j2g, g2j,
  Tag, Btn, Ic, Modal, Spinner, JalaliPicker, Empty, Fld,
  OrderDetail
} = window;

/* Premium summary cards with better hierarchy */
function OrderSummaryCards({ filtered }) {
  const totalRev  = filtered.reduce((s,o)=>s+(o.total_amount||0),0);
  const unpaid    = filtered.filter(o=>["pending_payment","contract_pending","registered","stock_check"].includes(o.order_status)).length;
  const delivered = filtered.filter(o=>o.order_status==="delivered").length;
  return (
    <div style={{ 
      display:"grid", 
      gridTemplateColumns:"repeat(3,1fr)", 
      gap:16, 
      marginBottom:20,
      marginTop:4
    }}>
      {/* Main metric - شاید کل */}
      <div style={{ 
        background:C.surface,
        border:`1px solid ${C.border}`, 
        borderRadius:8,
        padding:"16px 20px",
        position:"relative",
        transition:"all 0.15s ease"
      }}>
        <p style={{ fontSize:10, fontWeight:600, color:C.textDim, marginBottom:8, letterSpacing:"0.5px" }}>{fa(filtered.length)}</p>
        <p style={{ fontSize:28, fontWeight:700, color:C.text, lineHeight:1.1, marginBottom:4 }}>{fa(filtered.length)}</p>
        <p style={{ fontSize:11, color:C.textDim, marginTop:4 }}>سفارش فیلترشده شده</p>
      </div>

      {/* 금액 - total amount */}
      <div style={{ 
        background:C.surface,
        border:`1px solid ${C.border}`, 
        borderRadius:8,
        padding:"16px 20px",
        position:"relative"
      }}>
        <p style={{ fontSize:10, fontWeight:600, color:C.textDim, marginBottom:8, letterSpacing:"0.5px" }}>{shortCur(totalRev)}</p>
        <p style={{ fontSize:24, fontWeight:700, color:C.primary, lineHeight:1.1, marginBottom:4 }}>{shortCur(totalRev)}</p>
        <p style={{ fontSize:11, color:C.textDim, marginTop:4 }}>کل مبلغ</p>
      </div>

      {/* تحویل شده - delivered */}
      <div style={{ 
        background:C.surface,
        border:`1px solid ${C.border}`, 
        borderRadius:8,
        padding:"16px 20px",
        position:"relative"
      }}>
        <p style={{ fontSize:10, fontWeight:600, color:C.textDim, marginBottom:8, letterSpacing:"0.5px" }}>{fa(delivered)}</p>
        <p style={{ fontSize:28, fontWeight:700, color:C.success, lineHeight:1.1, marginBottom:4 }}>{fa(delivered)}</p>
        <p style={{ fontSize:11, color:C.textDim, marginTop:4 }}>حالا ارسال‌شده {fa(delivered)}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ ORDERS MODULE ══════════════════════════════ */
function OrdersModule({ me, showToast }) {
  const [orders, setOrders]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [newOrder, setNewOrder] = useState(false);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ordDateFrom, setOrdDateFrom]   = useState("");
  const [ordDateTo,   setOrdDateTo]     = useState("");
  const [customerDetail, setCustomerDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ords, custs] = await Promise.all([
        api("GET","crm_orders?order=created_at.desc"),
        api("GET","crm_customers?select=id,name,phone,credit_allowed")
      ]);
      setOrders(ords||[]); setCustomers(custs||[]);
    } catch(e) { showToast("خطا در بارگذاری","error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => {
      api("GET","crm_orders?order=created_at.desc").then(o => { if(o) setOrders(o); }).catch(()=>{});
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const custMap = Object.fromEntries((customers||[]).map(c=>[c.id,c]));

  const exportOrdersCSV = () => {
    var header = ["شماره","مشتری","تلفن","نوع","مبلغ","وضعیت","تاریخ ثبت"];
    var dataRows = filtered.map(function(o) {
      var c = custMap[o.customer_id];
      return [
        o.id,
        c ? c.name : "",
        c ? c.phone : "",
        o.order_type === "custom" ? "سفارشی" : "انبار",
        o.total_amount || 0,
        ORDER_STATUS[o.order_status] ? ORDER_STATUS[o.order_status].label : (o.order_status || ""),
        new Date(o.created_at).toLocaleDateString("fa-IR")
      ];
    });
    var rows = [header].concat(dataRows);
    var csv = "\uFEFF" + rows.map(function(r) {
      return r.map(function(v) { return '"' + String(v).split('"').join('""') + '"'; }).join(",");
    }).join("\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "سفارشات.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("فایل CSV دانلود شد");
  };

  const filtered = orders.filter(function(o) {
    var cust = custMap[o.customer_id];
    if (search && !cust?.name?.includes(search) && !String(o.id).includes(search)) return false;
    if (statusFilter !== "all" && o.order_status !== statusFilter) return false;
    if (ordDateFrom) {
      try { var p=ordDateFrom.split("-").map(Number); var g=j2g(p[0],p[1],p[2]); if(new Date(o.created_at)<new Date(g[0],g[1]-1,g[2])) return false; } catch(e){}
    }
    if (ordDateTo) {
      try { var p2=ordDateTo.split("-").map(Number); var g2=j2g(p2[0],p2[1],p2[2]); var e2=new Date(g2[0],g2[1]-1,g2[2]); e2.setDate(e2.getDate()+1); if(new Date(o.created_at)>=e2) return false; } catch(e){}
    }
    return true;
  });

  const selectedCust = selected ? custMap[selected.customer_id] : null;

  const renderCustomerDetail = (c) => {
    const customerOrders = orders.filter(function(o) { return o.customer_id === c.id; });
    const totalAmount = customerOrders.reduce(function(s,o) { return s + Number(o.total_amount||0); }, 0);
    return (
      <Modal title={c.name || "جزئیات مشتری"} onClose={() => setCustomerDetail(null)} maxWidth={640}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Fld label="شناسه"><span style={{ fontSize:13, color:C.text }}>{c.id}</span></Fld>
          <Fld label="تلفن"><span style={{ fontSize:13, color:C.text }}>{c.phone ? fa(c.phone) : "—"}</span></Fld>
          <Fld label="شرکت"><span style={{ fontSize:13, color:C.text }}>{c.company || "—"}</span></Fld>
          <Fld label="شهر"><span style={{ fontSize:13, color:C.text }}>{c.city || "—"}</span></Fld>
          <Fld label="استان"><span style={{ fontSize:13, color:C.text }}>{c.province || "—"}</span></Fld>
          <Fld label="وضعیت اعتبار"><span style={{ fontSize:13, color:c.credit_allowed?C.success:C.textMuted }}>{c.credit_allowed ? "✓ اعتباری" : "نقدی"}</span></Fld>
        </div>
        {customerOrders.length > 0 && (
          <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:12 }}>
            <p style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:10 }}>سفارشات ({fa(customerOrders.length)}) — مجموع: {shortCur(totalAmount)}</p>
            <div style={{ display:"grid", gap:6 }}>
              {customerOrders.slice(0, 10).map(o => (
                <div key={o.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:C.surfaceAlt, borderRadius:8, fontSize:12 }}>
                  <span style={{ color:C.text }}># {fa(o.id)}</span>
                  <Tag status={o.order_status} />
                  <span style={{ color:C.primary, fontWeight:600 }}>{shortCur(o.total_amount)}</span>
                  <span style={{ color:C.textMuted }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("fa-IR") : "—"}</span>
                </div>
              ))}
              {customerOrders.length > 10 && <p style={{ fontSize:11, color:C.textMuted, textAlign:"center" }}>+ {fa(customerOrders.length - 10)} سفارش دیگر</p>}
            </div>
          </div>
        )}
        <Btn label="بستن" icon="x" full outline onClick={() => setCustomerDetail(null)} style={{ marginTop:14 }} />
      </Modal>
    );
  };

  if (loading) return <Spinner />;

  if (selected) return (
    <>
      <OrderDetail
        order={selected} customer={selectedCust} me={me} showToast={showToast}
        onUpdate={load} onClose={() => setSelected(null)}
        onCustomerClick={(cust) => setCustomerDetail(cust)}
      />
      {customerDetail && renderCustomerDetail(customerDetail)}
    </>
  );

return (
    <div style={{ animation:"fadeUp 0.3s ease", background:C.surfaceLighter, borderRadius:12, padding:24 }}>
      {/* ─── هدر + دکمه‌ها ─── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontSize:18, color:C.text, fontWeight:700, marginBottom:4 }}>مدیریت سفارشات</h2>
          <p style={{ fontSize:13, color:C.textDim }}>📦 {fa(orders.length)} سفارش کل</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <Btn label="بارگذاری مجدد" icon="refresh" small outline onClick={load} />
          <Btn label="خروجی CSV" icon="download" small outline onClick={exportOrdersCSV} />
          <Btn label="ثبت سفارش جدید" icon="plus" onClick={() => setNewOrder(true)} />
        </div>
      </div>

      {/* ─── کارت‌های خلاصه ─── */}
      <OrderSummaryCards filtered={filtered} />

      {/* ─── فیلترها ─── */}
      <div style={{ 
        background:C.surface, 
        border:`1px solid ${C.border}`, 
        borderRadius:10, 
        padding:16,
        display:"flex", 
        gap:12, 
        marginBottom:16, 
        flexWrap:"wrap", 
        alignItems:"center",
        position:"relative"
      }}>
        <div style={{ position:"relative", flex:1, minWidth:240 }}>
          <Ic name="search" size={14} color={C.textDim} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)" }} />
          <input style={{ ...iStyle, paddingRight:36, borderRadius:8 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 جستجو مشتری یا شماره سفارش..." />
        </div>
        <div style={{ minWidth:160 }}>
          <select style={{ ...iStyle, cursor:"pointer", borderRadius:8, padding:"10px 14px" }} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="all">همه وضعیت‌ها</option>
            {Object.entries(ORDER_STATUS).map(([k,v])=>(
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth:148 }}>
          <JalaliPicker value={ordDateFrom} onChange={setOrdDateFrom} placeholder="از تاریخ" style={{ borderRadius:8 }} />
        </div>
        <div style={{ minWidth:148 }}>
          <JalaliPicker value={ordDateTo} onChange={setOrdDateTo} placeholder="تا تاریخ" style={{ borderRadius:8 }} />
        </div>
        {(ordDateFrom||ordDateTo) && (
          <button onClick={function(){setOrdDateFrom("");setOrdDateTo("");}} style={{ background:"#991B1B", border:"1px solid #991B1B", borderRadius:8, color:"#fff", padding:"8px 12px", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:FF }}>🗑 پاک کردن</button>
        )}
        <span style={{ fontSize:12, color:C.textDim, whiteSpace:"nowrap", background:C.surfaceAlt, padding:"8px 12px", borderRadius:6 }}>{fa(filtered.length)} سفارش</span>
      </div>

      {/* لیست — کارت موبایل / جدول دسکتاپ */}
      {filtered.length===0
        ? <Empty text="سفارشی یافت نشد" icon="📋" style={{ padding:40 }} />
        : (<>
          {/* دسکتاپ */}
          <div style={{
            ...cardStyle, 
            overflow:"hidden", 
            display:"block",
            borderRadius:12,
            boxShadow:"0 2px 12px rgba(0,0,0,0.08)"
          }} className="orders-desktop">
            <div style={{ 
              display:"grid", 
              gridTemplateColumns:"60px 2fr 120px 100px 90px 120px 140px 90px", 
              gap:0
            }}>
              {["#","مشتری","تاریخ","نوع","مبلغ","وضعیت",""].map((h,i)=>(
                <div key={i} style={{ 
                  padding:"14px 16px", 
                  fontSize:12, 
                  color:C.textDim, 
                  fontWeight:600, 
                  borderBottom:`1px solid ${C.border}`, 
                  background:C.surfaceAlt,
                  display:"flex",
                  alignItems:"center"
                }}>{h}</div>
              ))}
              {filtered.map((o,i)=>{
                const cust = custMap[o.customer_id];
                const rowBg = i%2===0?C.surface:C.surfaceAlt;
                const brd = i<filtered.length-1?`1px solid ${C.border}`:"none";
                return (
                  <React.Fragment key={o.id}>
                    <div style={{ 
                      padding:"14px 16px", 
                      fontSize:13, 
                      color:C.text, 
                      fontWeight:600, 
                      borderBottom:brd, 
                      background:rowBg, 
                      display:"flex", 
                      alignItems:"center"
                    }}>#{fa(o.id)}</div>
                    <div style={{ 
                      padding:"14px 16px", 
                      fontSize:14, 
                      fontWeight:600, 
                      color:C.text, 
                      borderBottom:brd, 
                      background:rowBg, 
                      display:"flex", 
                      alignItems:"center"
                    }}>{cust?.name||o.customer_name||"—"}</div>
                    <div style={{ 
                      padding:"14px 16px", 
                      fontSize:12, 
                      color:C.textMuted, 
                      borderBottom:brd, 
                      background:rowBg, 
                      display:"flex", 
                      alignItems:"center"
                    }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("fa-IR") : "—"}</div>
                    <div style={{ 
                      padding:"12px 16px", 
                      borderBottom:brd, 
                      background:rowBg, 
                      display:"flex", 
                      alignItems:"center",
                      justifyContent:"center"
                    }}>
                      <span style={{ 
                        fontSize:11, 
                        padding:"4px 10px", 
                        borderRadius:6, 
                        background:o.order_type==="custom"?C.accent1+"22":C.accent3+"22", 
                        color:o.order_type==="custom"?C.accent1:C.accent3,
                        fontWeight:600
                      }}>{o.order_type==="custom"?"سفارشی":"انبار"}</span>
                    </div>
                    <div style={{ 
                      padding:"14px 16px", 
                      fontSize:14, 
                      fontWeight:700, 
                      color:C.primary, 
                      borderBottom:brd, 
                      background:rowBg, 
                      display:"flex", 
                      alignItems:"center"
                    }}>{shortCur(o.total_amount)}</div>
                    <div style={{ 
                      padding:"12px 16px", 
                      borderBottom:brd, 
                      background:rowBg, 
                      display:"flex", 
                      alignItems:"center"
                    }}><Tag status={o.order_status} /></div>
                    <div style={{ 
                      padding:"10px 16px", 
                      borderBottom:brd, 
                      background:rowBg, 
                      display:"flex", 
                      alignItems:"center",
                      justifyContent:"center"
                    }}>
                      <Btn label="جزئیات" icon="eye" small outline onClick={() => setSelected(o)} />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          {/* موبایل — کارت */}
          <div style={{ flexDirection:"column", gap:12 }} className="orders-mobile">
            {filtered.map(o=>{
              const cust = custMap[o.customer_id];
              return (
                <div key={o.id} style={{ 
                  ...cardStyle, 
                  padding:"18px 20px",
                  borderRadius:12,
                  boxShadow:"0 2px 8px rgba(0,0,0,0.06)"
                }}>
                  <div style={{ 
                    display:"flex", 
                    justifyContent:"space-between", 
                    alignItems:"flex-start", 
                    marginBottom:14
                  }}>
                    <div>
                      <span style={{ fontSize:15, fontWeight:700, color:C.text }}>#{fa(o.id)}</span>
                      <p style={{ fontSize:12, color:C.textDim, marginTop:2 }}>{cust?.name||o.customer_name||"—"}</p>
                    </div>
                    <Tag status={o.order_status} />
                  </div>
                  <div style={{ 
                    display:"grid", 
                    gridTemplateColumns:"1fr 1fr", 
                    gap:"10px 16px", 
                    marginBottom:14
                  }}>
                    <div>
                      <p style={{ fontSize:10, color:C.textDim, marginBottom:4 }}>تاریخ</p>
                      <p style={{ fontSize:12, fontWeight:600, color:C.text }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("fa-IR") : "—"}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.textDim, marginBottom:4 }}>نوع</p>
                      <div>
                        <span style={{ 
                          padding:"4px 10px", 
                          borderRadius:6, 
                          background:o.order_type==="custom"?C.accent1+"20":C.accent3+"20", 
                          color:o.order_type==="custom"?C.accent1:C.accent3,
                          fontSize:11,
                          fontWeight:600
                        }}>{o.order_type==="custom"?"سفارشی":"انبار"}</span>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.textDim, marginBottom:4 }}>مبلغ</p>
                      <p style={{ fontSize:14, fontWeight:700, color:C.primary }}>{shortCur(o.total_amount)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:10, color:C.textDim, marginBottom:4 }}>کانال</p>
                      <p style={{ fontSize:12, color:C.text }}>{o.sales_channel==="retail"?"خرد":o.sales_channel==="wholesale"?"عمده":"—"}</p>
                    </div>
                  </div>
                  <Btn label="مشاهده جزئیات" icon="eye" small outline full onClick={() => setSelected(o)} />
                </div>
              );
            })}
          </div>
        </>)
      }

      {/* ─── مودال ثبت سفارش جدید ─── */}
      {newOrder && (
        <NewOrderModal
          customers={customers}
          showToast={showToast}
          onClose={() => setNewOrder(false)}
          onSaved={() => { setNewOrder(false); load(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════ NEW ORDER MODAL ════════════════════════════ */
function NewOrderModal({ customers, showToast, onClose, onSaved }) {
  const [products, setProducts] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    customer_id:"", order_type:"stock", sales_channel:"wholesale", note:"", delivery_address:""
  });
  const [items, setItems] = useState([{ product_id:"", product_name:"", qty:1, unit_price:0 }]);

  useEffect(function() {
    api("GET","products?order=name.asc").then(function(p){ setProducts(p||[]); }).catch(function(){});
  }, []);

  var prodMap = {};
  products.forEach(function(p){ prodMap[p.id] = p; });

  var totalAmount = items.reduce(function(s,it){
    return s + (Number(it.qty)||0) * (Number(it.unit_price)||0);
  }, 0);

  function addItem() {
    setItems(function(prev){ return prev.concat([{ product_id:"", product_name:"", qty:1, unit_price:0 }]); });
  }
  function removeItem(idx) {
    setItems(function(prev){ return prev.filter(function(_,i){ return i!==idx; }); });
  }
  function updateItem(idx, key, val) {
    setItems(function(prev){
      return prev.map(function(it,i){
        if (i !== idx) return it;
        var updated = Object.assign({}, it);
        updated[key] = val;
        if (key === "product_id") {
          var p = prodMap[val];
          if (p) { updated.product_name = p.name; updated.unit_price = p.base_price || 0; }
        }
        return updated;
      });
    });
  }

  var save = async function() {
    if (!form.customer_id) { showToast("مشتری را انتخاب کنید","error"); return; }
    var validItems = items.filter(function(it){ return it.product_id && Number(it.qty)>0; });
    if (!validItems.length) { showToast("حداقل یک محصول اضافه کنید","error"); return; }
    setSaving(true);
    try {
      var order = await api("POST","crm_orders",{
        customer_id: Number(form.customer_id),
        order_type: form.order_type,
        sales_channel: form.sales_channel,
        source_app: "admin-panel",
        order_status: "registered",
        total_amount: totalAmount,
        note: form.note || null,
        delivery_address: form.delivery_address || null,
        created_at: new Date().toISOString()
      });
      if (order && order.id) {
        for (var i=0; i<validItems.length; i++) {
          var it = validItems[i];
          await api("POST","crm_order_items",{
            order_id: order.id,
            product_id: Number(it.product_id),
            product_name: it.product_name,
            qty: Number(it.qty),
            unit_price: Number(it.unit_price),
            total: Number(it.qty)*Number(it.unit_price)
          });
        }

        // ── اعمال تخفیف پله‌ای روی کل سبد ──
        try {
          var repriceResult = await api("POST","reprice_order",{ p_order_id: order.id });
          if (repriceResult && repriceResult.data && repriceResult.data.total_qty > 0) {
            console.log("[Reprice] Basket repriced:", repriceResult.data);
          }
        } catch (repriceErr) {
          console.warn("[Reprice] Repricing failed (non-fatal):", repriceErr.message);
        }
      }
      showToast("سفارش ثبت شد");
      onSaved();
    } catch(e) { showToast("خطا در ثبت سفارش","error"); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="ثبت سفارش جدید" onClose={onClose} maxWidth={600}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Fld label="مشتری *">
          <select style={{ ...iStyle, cursor:"pointer" }} value={form.customer_id} onChange={function(e){setForm(function(f){return Object.assign({},f,{customer_id:e.target.value});});}}>
            <option value="">انتخاب کنید...</option>
            {customers.map(function(c){ return <option key={c.id} value={c.id}>{c.name}</option>; })}
          </select>
        </Fld>
        <Fld label="نوع سفارش">
          <select style={{ ...iStyle, cursor:"pointer" }} value={form.order_type} onChange={function(e){setForm(function(f){return Object.assign({},f,{order_type:e.target.value});});}}>
            <option value="stock">از انبار</option>
            <option value="custom">سفارشی / تولید</option>
          </select>
        </Fld>
        <Fld label="کانال فروش">
          <select style={{ ...iStyle, cursor:"pointer" }} value={form.sales_channel} onChange={function(e){setForm(function(f){return Object.assign({},f,{sales_channel:e.target.value});});}}>
            <option value="wholesale">عمده</option>
            <option value="retail">خرد</option>
          </select>
        </Fld>
        <Fld label="آدرس تحویل">
          <input style={iStyle} value={form.delivery_address||""} onChange={function(e){setForm(function(f){return Object.assign({},f,{delivery_address:e.target.value});});}} placeholder="آدرس تحویل سفارش..." />
        </Fld>
      </div>

      <div style={{ marginBottom:6, marginTop:4 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <p style={{ fontSize:12, fontWeight:700, color:C.textMuted }}>اقلام سفارش</p>
          <Btn label="افزودن قلم" icon="plus" small outline onClick={addItem} />
        </div>
        <div style={{ display:"grid", gap:8 }}>
          {items.map(function(it, idx) {
            return (
              <div key={idx} style={{ display:"grid", gridTemplateColumns:"2fr 80px 120px auto", gap:8, alignItems:"center", background:C.surfaceAlt, borderRadius:8, padding:"8px 10px" }}>
                <select style={{ ...iStyle, fontSize:12 }} value={it.product_id} onChange={function(e){ updateItem(idx,"product_id",e.target.value); }}>
                  <option value="">انتخاب محصول...</option>
                  {products.map(function(p){ return <option key={p.id} value={p.id}>{p.name}</option>; })}
                </select>
                <input type="number" style={{ ...iStyle, fontSize:12 }} value={it.qty} onChange={function(e){ updateItem(idx,"qty",e.target.value); }} placeholder="تعداد" min="1" />
                <input type="number" style={{ ...iStyle, fontSize:12 }} value={it.unit_price} onChange={function(e){ updateItem(idx,"unit_price",e.target.value); }} placeholder="قیمت واحد" />
                {items.length > 1 && (
                  <button onClick={function(){ removeItem(idx); }} style={{ background:"transparent", border:"none", cursor:"pointer", color:C.danger, fontSize:16, padding:"0 4px" }}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background:C.primaryDim, borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontSize:12, color:C.textMuted }}>مجموع سفارش</span>
        <span style={{ fontSize:16, fontWeight:700, color:C.primary }}>{shortCur(totalAmount)}</span>
      </div>

      <Fld label="توضیحات">
        <textarea style={{ ...iStyle, resize:"none" }} rows={2} value={form.note||""} onChange={function(e){setForm(function(f){return Object.assign({},f,{note:e.target.value});});}} placeholder="توضیحات اضافه..." />
      </Fld>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
        <Btn label="انصراف" onClick={onClose} outline />
        <Btn label={saving?"در حال ثبت...":"ثبت سفارش"} icon="check" onClick={save} disabled={saving} />
      </div>
    </Modal>
  );
}

/* ─── Expose to window for bootstrap ─── */
window.OrdersModule = OrdersModule;
window.OrderSummaryCards = OrderSummaryCards;
window.NewOrderModal = NewOrderModal;
window.__ORDERS_LOADED__ = true;