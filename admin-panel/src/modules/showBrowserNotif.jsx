export function showBrowserNotif(title, body, icon) {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body, icon: icon||'', dir:'rtl', lang:'fa' });
    }
  }

  // â”€â”€â”€ Supabase Realtime for messages â”€â”€â”€
  useEffect(()=>{
    const ws = supaListen('messages', (payload) => {
      // =========================================
      // Ù„Ø§Ú¯ Ø¯ÛŒØ¨Ø§Ú¯ â€” Ø¨Ø±Ø±Ø³ÛŒ Ø¯Ø±ÛŒØ§ÙØª Ø±ÙˆÛŒØ¯Ø§Ø¯ Realtime
      // =========================================
      console.log('>>> REALTIME PAYLOAD:', JSON.stringify(payload, null, 2));
      console.log('>>> eventType:', payload.eventType, '| me.id:', me.id, '| typeof me.id:', typeof me.id);

      // Ø­Ø°Ù
      if (payload.eventType === 'DELETE') {
        const oldId = payload.old?.id;
        if (oldId) {
          setMsgs(prev => { const r = {}; Object.keys(prev).forEach(k => { r[k] = prev[k].filter(m => m.id !== oldId); }); return r; });
          setDmMsgs(prev => { const r = {}; Object.keys(prev).forEach(k => { r[k] = prev[k].filter(m => m.id !== oldId); }); return r; });
        }
        return;
      }

      const record = payload.new || payload.old;
      if (!record) {
        console.warn('>>> No record in payload');
        return;
      }

      // Ø±Ø¯ Ù¾ÛŒØ§Ù…â€ŒÙ‡Ø§ÛŒ Ø®ÙˆØ¯ÛŒ â€” Ù¾ÛŒØ§Ù… Ø§Ø±Ø³Ø§Ù„â€ŒØ´Ø¯Ù‡ Ø§Ø² sendMsg ÛŒÚ© Ø¨Ø§Ø± Ø§Ø¶Ø§ÙÙ‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯
      // Ùˆ Realtime Ù‡Ù… Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¢Ù† Ø±Ø§ Ø¨Ø±Ù…ÛŒâ€ŒÚ¯Ø±Ø¯Ø§Ù†Ø¯ØŒ Ø§Ø² duplicate Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯
      if (String(record.from_id) === String(me.id)) return;

      if (record.type === 'channel' && record.channel) {
        const newMsg = {
          id: record.id,
          userId: record.from_id,
          text: record.text,
          time: record.created_at ? new Date(record.created_at).toLocaleString('fa-IR') : nowShamsi(),
          fromName: record.from_name,
          file_url: record.file_url || null,
          file_name: record.file_name || null,
          file_type: record.file_type || null,
          file_size: record.file_size || null,
        };
        setMsgs(prev => {
          const ch = record.channel;
          const existing = (prev[ch]||[]);
          if (existing.find(m=>m.id===record.id)) return prev;
          playNotifSound();
          showBrowserNotif(
            `Ù¾ÛŒØ§Ù… Ø¬Ø¯ÛŒØ¯ Ø¯Ø± #${ch}`,
            `${record.from_name}: ${record.text}`,
          );
          setNotifs(prev => [{
            id: Date.now(),
            type:'msg',
            title:`Ù¾ÛŒØ§Ù… Ø¬Ø¯ÛŒØ¯ Ø¯Ø± #${ch}`,
            body:`${record.from_name}: ${record.text}`,
            read:false,
            time:nowShamsi(),
          }, ...prev.slice(0,49)]);
          return {...prev, [ch]: [...existing, newMsg]};
        });
      }

      // Ù…Ù‚Ø§ÛŒØ³Ù‡ Ø¨Ø§ String() Ø¨Ø±Ø§ÛŒ Ø¬Ù„ÙˆÚ¯ÛŒØ±ÛŒ Ø§Ø² Ø¹Ø¯Ù… ØªØ·Ø§Ø¨Ù‚ number/UUID
      if (record.type === 'dm' && (String(record.from_id) === String(me.id) || String(record.to_id) === String(me.id))) {
        const newMsg = {
          id: record.id,
          userId: record.from_id,
          text: record.text,
          time: record.created_at ? new Date(record.created_at).toLocaleString('fa-IR') : nowShamsi(),
          file_url: record.file_url || null,
          file_name: record.file_name || null,
          file_type: record.file_type || null,
          file_size: record.file_size || null,
        };
        setDmMsgs(prev => {
          const key = String(record.from_id) === String(me.id) ? record.to_id : record.from_id;
          const existing = (prev[key]||[]);
          if (existing.find(m=>m.id===record.id)) return prev;
          playNotifSound();
          showBrowserNotif(
            `Ù¾ÛŒØ§Ù… Ø§Ø² ${record.from_name}`,
            record.text,
          );
          setNotifs(prev => [{
            id: Date.now(),
            type:'dm',
            title:`Ù¾ÛŒØ§Ù… Ø§Ø² ${record.from_name}`,
            body:record.text,
            read:false,
            time:nowShamsi(),
            refId:record.from_id,
          }, ...prev.slice(0,49)]);
          return {...prev, [key]: [...existing, newMsg]};
        });
      }
    });
    return () => ws.close();
  }, [me.id]);
  useEffect(()=>{ saveLS("dmMsgs",     dmMsgs);     }, [dmMsgs]);
  useEffect(()=>{ saveLS("reqs", reqs); }, [reqs]);

  // â”€â”€â”€ Load from Supabase on startup â”€â”€â”€
  useEffect(()=>{
    // Load requests
    supa('GET','requests','?order=created_at.desc&limit=100').then(data=>{
      if(data&&data.length>0){
        const mapped=data.map(r=>({
          id:r.id, type:r.type, from:r.from_name, fromId:r.from_id,
          detail:r.detail, status:r.status,
          workflow:typeof r.workflow==='string'?JSON.parse(r.workflow):r.workflow||[],
          time:r.created_at?new Date(r.created_at).toLocaleDateString('fa-IR'):nowShamsi(),
        }));
        setReqs(mapped);
      }
    }).catch(()=>{});

    // Load payments
    supa('GET','payments','?order=created_at.desc&limit=100').then(data=>{
      if(data&&data.length>0){
        const mapped=data.map(p=>({
          id:p.id, code:p.code, type:p.type,
          requesterId:p.requester_id, requesterName:p.requester_name,
          amount:p.amount, desc:p.description,
          beneficiary:p.beneficiary, bankAccount:p.bank_account,
          status:p.status,
          workflow:typeof p.workflow==='string'?JSON.parse(p.workflow):p.workflow||[],
          date:p.created_at?new Date(p.created_at).toLocaleDateString('fa-IR'):nowShamsi(),
        }));
        setPayments(mapped);
      }
    }).catch(()=>{});

    // Load CRM customers
    supa('GET','crm_customers','?order=created_at.desc').then(data=>{
      if(data&&data.length>0) setCustomers(data);
    }).catch(()=>{});

    // Load CRM orders
    supa('GET','crm_orders','?order=created_at.desc').then(data=>{
      if(data&&data.length>0) setCrmOrders(data);
    }).catch(()=>{});

  }, []);
  useEffect(()=>{ saveLS("projs",      projs);      }, [projs]);
  useEffect(()=>{ saveLS("notifs",     notifs);     }, [notifs]);
  useEffect(()=>{ saveLS("payments",   payments);   }, [payments]);
  useEffect(()=>{ saveLS("letters",    letters);    }, [letters]);
  useEffect(()=>{ saveLS("docs",       docs);       }, [docs]);
  useEffect(()=>{ saveLS("orgMembers", orgMembers); }, [orgMembers]);
  useEffect(()=>{ saveLS("customers", customers); }, [customers]);
  useEffect(()=>{ saveLS("crmOrders", crmOrders); }, [crmOrders]);
  useEffect(()=>{ try{ if(loggedIn&&meId){ localStorage.setItem("loggedIn","1"); localStorage.setItem("meId",String(meId)); } }catch{} }, [loggedIn,meId]);

  useEffect(()=>{msgEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs,dmMsgs,channel,dm]);

  const unread    = notifs.filter(n=>!n.read).length;
  const pending   = reqs.filter(r=>r.status==="pending").length;
  const myTasks   = me.id ? projs.flatMap(p=>p.tasks).filter(t=>t.assignedTo===me.id&&t.status!=="done") : [];
  const curMsgs   = dm?(dmMsgs[dm]||[]):(msgs[channel]||[]);
  const proj      = activeProj?projs.find(p=>p.id===activeProj)||null:null;
  const taskDet   = (activeTask&&activeTask.pid&&activeTask.tid)?(()=>{try{const p=projs.find(p=>p.id===activeTask.pid);const t=p?.tasks.find(t=>t.id===activeTask.tid);return t?{task:t,project:p}:null;}catch(e){return null;}})():null;
  const orgActive     = orgMembers.filter(m=>m.active);
  const orgInact      = orgMembers.filter(m=>!m.active);
  const activeUserIds = new Set(orgActive.map(m=>m.id));
  let orgRows = []; try { orgRows = buildOrgRows(orgMembers,orgOpen); } catch(e) { orgRows = []; }

  // â”€â”€â”€ handlers â”€â”€â”€
  function sendMsg() {
    if (!input.trim() && !pendingFile) return;
    const text = input.trim() || (pendingFile ? `ðŸ“Ž ${pendingFile.name}` : '');
    const m = {
      id: Date.now(),
      userId: me.id,
      text: text,
      time: nowShamsi(),
      file_url: pendingFile?.url || null,
      file_name: pendingFile?.name || null,
      file_type: pendingFile?.type || null,
      file_size: pendingFile?.size || null,
    };
    if (dm) setDmMsgs(p=>({...p,[dm]:[...(p[dm]||[]),m]}));
    else setMsgs(p=>({...p,[channel]:[...(p[channel]||[]),m]}));
    // Sync to Supabase realtime â€” Ø´Ø§Ù…Ù„ Ø§Ø·Ù„Ø§Ø¹Ø§Øª ÙØ§ÛŒÙ„
    supa('POST','messages',{
      type: dm ? 'dm' : 'channel',
      channel: dm ? null : channel,
      from_id: me.id,
      to_id: dm || null,
      from_name: me.name,
      from_avatar: me.avatar,
      text: text,
      file_url: pendingFile?.url || null,
      file_name: pendingFile?.name || null,
      file_type: pendingFile?.type || null,
      file_size: pendingFile?.size || null,
    }).catch(()=>{});
    setInput("");
    setPendingFile(null);
  }

  function approveReq(id,action) {
    const r = reqs.find(x=>x.id===id);
    if (!canApproveRequest(r)) return;
    setConfirm({
      type:action==="approved"?"success":"danger",
      title:action==="approved"?"ØªØ£ÛŒÛŒØ¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øª":"Ø±Ø¯ Ø¯Ø±Ø®ÙˆØ§Ø³Øª",
      message:`Ø¯Ø±Ø®ÙˆØ§Ø³Øª Â«${r?.type}Â» Ø§Ø² ${r?.from} ${action==="approved"?"ØªØ£ÛŒÛŒØ¯":"Ø±Ø¯"} Ø´ÙˆØ¯ØŸ`,
      confirmLabel:action==="approved"?"Ø¨Ù„Ù‡ØŒ ØªØ£ÛŒÛŒØ¯":"Ø¨Ù„Ù‡ØŒ Ø±Ø¯",
      onConfirm:()=>{
        // Sync to Supabase
        const req = reqs.find(x=>x.id===id);
        if(req) {
          const newWf = (req.workflow||[]).map(w=>w.assignedTo===me.id&&w.status==='pending'?{...w,status:action==='approved'?'done':'rejected',time:nowShamsi()}:w);
          const allDone=newWf.every(w=>w.status==='done');
          const anyRej=newWf.some(w=>w.status==='rejected');
          const newStatus=anyRej?'rejected':allDone?'approved':'pending';
          supa('PATCH','requests',{status:newStatus,workflow:JSON.stringify(newWf)},'?id=eq.'+id).catch(()=>{});
        }
        setReqs(p=>p.map(x=>x.id===id?{...x,status:action,
        workflow:x.workflow?.map(w=>w.assignedTo===me.id&&w.status==="pending"?{...w,status:action==="approved"?"done":"rejected",time:nowShamsi()}:w)
        }:x));
      },
    });
  }

  function updateTask(pid,tid,ns) {
    const p=projs.find(x=>x.id===pid); const t=p?.tasks.find(x=>x.id===tid);
    const lbl={pending:"Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø±",inprogress:"Ø¯Ø± Ø¬Ø±ÛŒØ§Ù†",done:"ØªÚ©Ù…ÛŒÙ„"};
    setConfirm({
      type:ns==="done"?"success":"warning",
      title:`ØªØºÛŒÛŒØ± Ø¨Ù‡ Â«${lbl[ns]}Â»`,
      message:`ÙˆØ¸ÛŒÙÙ‡ Â«${t?.title}Â» Ø¨Ù‡ Â«${lbl[ns]}Â» ØªØºÛŒÛŒØ± Ú©Ù†Ø¯ØŸ`,
      confirmLabel:"Ø¨Ù„Ù‡",
      onConfirm:()=>setProjs(ps=>ps.map(p=>p.id!==pid?p:{...p,tasks:p.tasks.map(t=>t.id!==tid?t:{...t,status:ns}),log:[{userId:me.id,text:`"${t?.title}" â†’ ${lbl[ns]}`,time:nowShamsi()},...p.log]})),
    });
  }

  function handlePaymentAction(paymentId, action, stepNum, note) {
    setPayments(ps => ps.map(p => {
      if (p.id !== paymentId) return p;
      const newWf = p.workflow.map(w =>
        w.step !== stepNum ? w : {...w, status:action==="approved"?"done":"rejected", note, time:nowShamsi()}
      );
      const allDone = newWf.every(w=>w.status==="done");
      const anyRej  = newWf.some(w=>w.status==="rejected");
      const cur     = newWf.filter(w=>w.status==="done").length + 1;
      return {...p, workflow:newWf, status:anyRej?"rejected":allDone?"paid":`step${cur}`};
    }));
  }

  // â”€â”€â”€ Admin CRUD Functions â”€â”€â”€

  // Admin Fetch Functions
  async function adminFetchUsers() {
    setAdminUsersLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ú©Ø§Ø±Ø¨Ø±Ø§Ù†');
      const data = await res.json();
      setAdminUsers(data.users || []);
    } catch (e) { console.error(e); alert(e.message); }
    finally { setAdminUsersLoading(false); }
  }

  async function adminFetchRoles() {
    setAdminRolesLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/roles`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ù†Ù‚Ø´â€ŒÙ‡Ø§');
      const data = await res.json();
      setAdminRoles(data.roles || []);
    } catch (e) { console.error(e); alert(e.message); }
    finally { setAdminRolesLoading(false); }
  }

  async function adminFetchGroups() {
    setAdminGroupsLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ú¯Ø±ÙˆÙ‡â€ŒÙ‡Ø§');
      const data = await res.json();
      setAdminGroups(data.groups || []);
    } catch (e) { console.error(e); alert(e.message); }
    finally { setAdminGroupsLoading(false); }
  }

  // --- Admin User CRUD ---
  function openUserModal(user) {
    if (user) {
      setAdminUserModal(user);
      setAdminUserForm({
        full_name: user.full_name || '',
        username: user.username || '',
        password: '',
        role: user.role || '',
        system_role: user.system_role || 'user',
        avatar: user.avatar || ''
      });
    } else {
      setAdminUserModal({ id: null });
      setAdminUserForm({ full_name: '', username: '', password: '', role: '', system_role: 'user', avatar: '' });
    }
  }

  async function saveAdminUser() {
    setAdminUserSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const isEdit = !!adminUserModal.id;
      const url = isEdit ? `${API_BASE}/api/users` : `${API_BASE}/api/users`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const body = { ...adminUserForm };
      if (isEdit) body.id = adminUserModal.id;
      if (!body.password) delete body.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡');
      }
      await adminFetchUsers();
      setAdminUserModal(null);
    } catch (e) { alert(e.message); }
    finally { setAdminUserSaving(false); }
  }

  async function deleteUser() {
    setAdminUserDeleting(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: confirmDeleteUser.id })
      });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù');
      await adminFetchUsers();
      setConfirmDeleteUser(null);
    } catch (e) { alert(e.message); }
    finally { setAdminUserDeleting(false); }
  }

  // --- Admin Role CRUD ---
  function openRoleModal(role) {
    if (role) {
      setAdminRoleModal(role);
      setAdminRoleForm({ key: role.key, title: role.title, level: role.level });
    } else {
      setAdminRoleModal({ id: null });
      setAdminRoleForm({ key: '', title: '', level: 10 });
    }
  }

  async function saveAdminRole() {
    setAdminRoleSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const isEdit = !!adminRoleModal.id;
      const url = isEdit ? `${API_BASE}/api/roles/${adminRoleModal.id}` : `${API_BASE}/api/roles`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(adminRoleForm)
      });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ù†Ù‚Ø´');
      await adminFetchRoles();
      setAdminRoleModal(null);
    } catch (e) { alert(e.message); }
    finally { setAdminRoleSaving(false); }
  }

  async function deleteRole() {
    setAdminRoleDeleting(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/roles/${confirmDeleteRole.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù');
      await adminFetchRoles();
      setConfirmDeleteRole(null);
    } catch (e) { alert(e.message); }
    finally { setAdminRoleDeleting(false); }
  }

  // --- Role Permissions ---
  async function openRolePermissions(role) {
    setAdminRolePermModal(role);
    setAdminPermissionsLoading(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/role-permissions/role/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAdminRolePermForm(data.permissions?.map(p => p.permission_key) || []);
    } catch (e) { console.error(e); }
    finally { setAdminPermissionsLoading(false); }
  }

  async function togglePermission(roleId, permKey, currentlyHas) {
    const token = localStorage.getItem('az_token');
    const url = `${API_BASE}/api/role-permissions${currentlyHas ? `/role/${roleId}/${permKey}` : ''}`;
    const method = currentlyHas ? 'DELETE' : 'POST';
    const body = currentlyHas ? null : { role_id: roleId, permission_key: permKey };
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± ØªØºÛŒÛŒØ± Ø¯Ø³ØªØ±Ø³ÛŒ');
    
    // Update matrix table state (adminRoles) for instant visual feedback
    setAdminRoles(prev => prev.map(role =>
      role.id === roleId
        ? { ...role, permissions: currentlyHas
            ? (role.permissions||[]).filter(p => p !== permKey)
            : [...(role.permissions||[]), permKey]
          }
        : role
    ));
    // Update modal state if open
    setAdminRolePermForm(f => currentlyHas ? f.filter(p => p !== permKey) : [...f, permKey]);
  }

  // --- Save Role Permissions (modal) ---
  async function saveRolePermissions() {
    if (!adminRolePermModal) return;
    setAdminRolePermSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const roleId = adminRolePermModal.id;
      const currentRole = adminRoles.find(r => r.id === roleId);
      const currentPerms = currentRole?.permissions || [];
      const desiredPerms = adminRolePermForm;

      const toAdd = desiredPerms.filter(p => !currentPerms.includes(p));
      const toRemove = currentPerms.filter(p => !desiredPerms.includes(p));

      for (const pk of toRemove) {
        const r = await fetch(`${API_BASE}/api/role-permissions/role/${roleId}/${pk}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!r.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù Ø¯Ø³ØªØ±Ø³ÛŒ');
      }
      for (const pk of toAdd) {
        const r = await fetch(`${API_BASE}/api/role-permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role_id: roleId, permission_key: pk })
        });
        if (!r.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø§ÙØ²ÙˆØ¯Ù† Ø¯Ø³ØªØ±Ø³ÛŒ');
      }

      // Update matrix state
      setAdminRoles(prev => prev.map(role =>
        role.id === roleId ? { ...role, permissions: desiredPerms } : role
      ));
      setAdminRolePermModal(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setAdminRolePermSaving(false);
    }
  }

  // --- Assign Roles to User ---
  async function openAssignRoleModal(user) {
    setAdminAssignRoleModal({
      id: user.id,
      name: user.full_name || user.name,
      assignedRoles: []
    });
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/users/${user.id}/roles`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAdminAssignRoleModal(f => ({ ...f, assignedRoles: data.roles?.map(r => r.role_id) || [] }));
    } catch (e) { console.error(e); }
  }

  async function saveUserRoles() {
    setAdminAssignRoleSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      // Remove all current roles
      await fetch(`${API_BASE}/api/users/${adminAssignRoleModal.id}/roles`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Add new roles
      for (const roleId of adminAssignRoleModal.assignedRoles) {
        await fetch(`${API_BASE}/api/users/${adminAssignRoleModal.id}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role_id: roleId })
        });
      }
      await adminFetchUsers();
      setAdminAssignRoleModal(null);
    } catch (e) { alert(e.message); }
    finally { setAdminAssignRoleSaving(false); }
  }

  // --- Group CRUD ---
  function openGroupModal(group) {
    if (group) {
      setAdminGroupModal(group);
      setAdminGroupForm({ name: group.name, description: group.description || '' });
    } else {
      setAdminGroupModal({ id: null });
      setAdminGroupForm({ name: '', description: '' });
    }
  }

  async function saveAdminGroup() {
    setAdminGroupSaving(true);
    try {
      const token = localStorage.getItem('az_token');
      const isEdit = !!adminGroupModal.id;
      const url = isEdit ? `${API_BASE}/api/groups/${adminGroupModal.id}` : `${API_BASE}/api/groups`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(adminGroupForm)
      });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ú¯Ø±ÙˆÙ‡');
      await adminFetchGroups();
      setAdminGroupModal(null);
      setAdminGroupForm({ name: '', description: '' });
    } catch (e) { alert(e.message); }
    finally { setAdminGroupSaving(false); }
  }

  async function deleteGroup() {
    setAdminGroupDeleting(true);
    try {
      const token = localStorage.getItem('az_token');
      const res = await fetch(`${API_BASE}/api/groups/${confirmDeleteGroup.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù');
      await adminFetchGroups();
      setConfirmDeleteGroup(null);
    } catch (e) { alert(e.message); }
    finally { setAdminGroupDeleting(false); }
  }

  async function openGroupMembers(group) {
    setAdminGroupMembersModal({
      id: group.id,
      name: group.name,
      members: group.members || [],
      available: adminUsers.filter(u => !group.members?.some(m => m.id === u.id)) || []
    });
  }

  async function addGroupMember(userId) {
    setAdminGroupMembersModal(f => {
      const user = adminUsers.find(u => u.id === userId);
      if (!user || f.members.some(m => m.id === userId)) return f;
      return { ...f, members: [...f.members, user], available: f.available.filter(u => u.id !== userId) };
    });
  }

  async function removeGroupMember(userId) {
    setAdminGroupMembersModal(f => {
      const user = f.members.find(m => m.id === userId);
      return { ...f, members: f.members.filter(m => m.id !== userId), available: [...f.available, user] };
    });
  }

  // Handle admin tab change
  function handleAdminTabChange(tab) {
    setAdminTab(tab);
    if (tab === 'users') adminFetchUsers();
    else if (tab === 'roles') adminFetchRoles();
    else if (tab === 'permissions') adminFetchRoles();
    else if (tab === 'groups') adminFetchGroups();
  }

  function addNotif(uid,type,pid,tid,title,desc) {
    setNotifs(ns=>[{id:Date.now(),type,projectId:pid,taskId:tid,title,desc,time:nowShamsi(),read:false},...ns]);
  }

  function submitReq() {
    // Sync to Supabase
    supa('POST','requests',{type:newReq.type,from_id:me.id,from_name:me.name,detail:newReq.note,status:'pending',workflow:JSON.stringify([])}).catch(()=>{});
    // Save to Supabase
    supa('POST','requests',{
      type:newReq.type, from_id:me.id, from_name:me.name,
      detail:newReq.note, status:'pending', workflow:JSON.stringify(wf||[])
    }).catch(()=>{});
    setReqs(p=>[{id:Date.now(),type:newReq.type,from:me.name,fromId:me.id,detail:newReq.note,status:"pending",time:nowShamsi(),workflow:wf},...p]);
    setShowReqForm(false); setNewReq({type:"Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ",note:""});
  }

  function submitProj() {
    if (!newProj.title.trim()) return;
    const p={id:Date.now(),title:newProj.title,manager:Number(newProj.manager),startDate:"Ø§Ù…Ø±ÙˆØ²",endDate:newProj.endDate||"Ù†Ø§Ù…Ø´Ø®Øµ",status:"pending",priority:newProj.priority,members:newProj.members.map(Number),tasks:[],log:[{userId:me.id,text:"Ù¾Ø±ÙˆÚ˜Ù‡ Ø§ÛŒØ¬Ø§Ø¯ Ø´Ø¯",time:nowShamsi()}]};
    setProjs(ps=>[p,...ps]);
    setShowProjForm(false); setNewProj({title:"",manager:2,members:[],endDate:"",priority:"medium"});
  }

  function submitTask() {
    if (!newTask.title.trim()||!showTaskForm) return;
    const pid=showTaskForm; const p=projs.find(x=>x.id===pid);
    const t={id:Date.now(),title:newTask.title,desc:newTask.desc,assignedTo:Number(newTask.assignedTo),due:newTask.due||"Ù†Ø§Ù…Ø´Ø®Øµ",status:"pending",priority:newTask.priority};
    setProjs(ps=>ps.map(x=>x.id!==pid?x:{...x,tasks:[...x.tasks,t],log:[{userId:me.id,text:`ÙˆØ¸ÛŒÙÙ‡ "${newTask.title}" Ø¨Ù‡ ${USERS.find(u=>u.id===Number(newTask.assignedTo))?.lastName} Ø³Ù¾Ø±Ø¯Ù‡ Ø´Ø¯`,time:nowShamsi()},...x.log]}));
    addNotif(Number(newTask.assignedTo),"task",pid,t.id,`ÙˆØ¸ÛŒÙÙ‡ Ø¬Ø¯ÛŒØ¯: ${newTask.title}`,`Ù¾Ø±ÙˆÚ˜Ù‡: ${p?.title}`);
    setShowTaskForm(false); setNewTask({title:"",desc:"",assignedTo:1,due:"",priority:"medium"});
  }

  // â”€â”€â”€ My Tasks: Ø¯Ø±ÛŒØ§ÙØª Ùˆ Ø§Ù‚Ø¯Ø§Ù… Ø±ÙˆÛŒ ØªØ³Ú©â€ŒÙ‡Ø§ÛŒ Ø¨Ú©â€ŒØ§Ù†Ø¯ (ÙØ§Ø² Û±) â”€â”€â”€
  async function loadMyApiTasks(){
    const uid=me?.id||meId; const token=localStorage.getItem("az_token");
    if(!uid||!token||!loggedIn) return;
    setApiTasksLoading(true); setApiTasksErr("");
    try{
      const res=await fetch(`${API_BASE}/api/tasks?assigneeId=${encodeURIComponent(uid)}`,{headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      const data=await res.json();
      setApiTasks(Array.isArray(data)?data:[]);
    }catch(e){ setApiTasksErr(e.message||"Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª ØªØ³Ú©â€ŒÙ‡Ø§"); }
    finally{ setApiTasksLoading(false); }
  }
  useEffect(()=>{ loadMyApiTasks(); },[loggedIn,meId,me?.id]);

  async function openApiTaskDetail(id){
    const token=localStorage.getItem("az_token"); if(!token) return;
    setOpenApiTask({id}); setApiTaskEv([]); setApiDetailLoading(true);
    try{
      const res=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${token}`}});
      if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      const d=await res.json();
      setOpenApiTask(d.task||d); setApiTaskEv(Array.isArray(d.evidences)?d.evidences:[]);
    }catch(e){ alert(e.message||"Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª Ø¬Ø²Ø¦ÛŒØ§Øª ØªØ³Ú©"); setOpenApiTask(null); }
    finally{ setApiDetailLoading(false); }
  }
  async function setApiTaskStatus(id,newStatus){
    if(statusBusy) return;
    const token=localStorage.getItem("az_token"); if(!token) return;
    setStatusBusy(`${id}|${newStatus}`);
    try{
      const res=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({newStatus,actorId:me?.id||meId})});
      if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.error||`HTTP ${res.status}`); }
      if(openApiTask?.id===id) openApiTaskDetail(id);
      loadMyApiTasks();
    }catch(e){ alert(e.message||"Ø®Ø·Ø§ Ø¯Ø± ØªØºÛŒÛŒØ± ÙˆØ¶Ø¹ÛŒØª"); }
    finally{ setStatusBusy(""); }
  }
  async function submitEvidence(){
    if(evBusy||!openApiTask?.id) return;
    if(!evForm.notes.trim()&&!evForm.contentUrl.trim()){ setEvErr("ØªÙˆØ¶ÛŒØ­Ø§Øª ÛŒØ§ Ù„ÛŒÙ†Ú© Ø´Ø§Ù‡Ø¯ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯"); return; }
    const token=localStorage.getItem("az_token"); if(!token) return;
    const id=openApiTask.id; setEvBusy(true); setEvErr("");
    try{
      const body={evidenceType:evForm.evidenceType,notes:evForm.notes.trim()||undefined,contentUrl:evForm.contentUrl.trim()||undefined,submittedBy:me?.id||meId};
      const r1=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/evidence`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
      if(!r1.ok){ const e=await r1.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r1.status}`); }
      // Ø§Ù†ØªÙ‚Ø§Ù„ Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ù‡ PENDING_REVIEW (Ø¨Ú©â€ŒØ§Ù†Ø¯ ÙÙ‚Ø· Ø¨Ø§ ÙˆØ¬ÙˆØ¯ Ø´Ø§Ù‡Ø¯ Ù…ÛŒâ€ŒÙ¾Ø°ÛŒØ±Ø¯)
      const r2=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({newStatus:"PENDING_REVIEW",actorId:me?.id||meId})});
      if(!r2.ok){ const e=await r2.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r2.status}`); }
      setEvFormOpen(false); setEvForm({evidenceType:"TEXT",notes:"",contentUrl:""});
      openApiTaskDetail(id); loadMyApiTasks();
    }catch(e){ setEvErr(e.message||"Ø®Ø·Ø§ Ø¯Ø± Ø«Ø¨Øª Ø´Ø§Ù‡Ø¯"); }
    finally{ setEvBusy(false); }
  }
  async function submitBlocker(){
    if(evBusy||!openApiTask?.id) return;
    if(!blockerDesc.trim()){ setEvErr("Ø´Ø±Ø­ Ù…Ø§Ù†Ø¹ Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯"); return; }
    const token=localStorage.getItem("az_token"); if(!token) return;
    const id=openApiTask.id; setEvBusy(true); setEvErr("");
    try{
      const r1=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/evidence`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({evidenceType:"BLOCKER",notes:blockerDesc.trim(),submittedBy:me?.id||meId})});
      if(!r1.ok){ const e=await r1.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r1.status}`); }
      const r2=await fetch(`${API_BASE}/api/tasks/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({newStatus:"BLOCKED",actorId:me?.id||meId})});
      if(!r2.ok){ const e=await r2.json().catch(()=>({})); throw new Error(e.error||`HTTP ${r2.status}`); }
      setBlockerOpen(false); setBlockerDesc("");
      openApiTaskDetail(id); loadMyApiTasks();
    }catch(e){ setEvErr(e.message||"Ø®Ø·Ø§ Ø¯Ø± Ø«Ø¨Øª Ù…Ø§Ù†Ø¹"); }
    finally{ setEvBusy(false); }
  }

  // org handlers
  function orgToggle(id){ setOrgOpen(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;}); }
  function orgEdit(m){ setOrgCur(m);setOrgForm({name:m.name,role:m.role,mgr:String(m.mgr??""),av:m.av});setOrgMode("edit"); }
  function orgSave(){ setOrgMembers(p=>p.map(m=>m.id!==orgCur.id?m:{...m,name:orgForm.name,role:orgForm.role,mgr:orgForm.mgr===""?null:Number(orgForm.mgr),av:orgForm.av||orgForm.name[0]||"ØŸ"}));setOrgMode("list"); }
  function orgDeact(){ setOrgMembers(p=>p.map(m=>{if(m.id===orgCur.id)return{...m,active:false};if(m.mgr===orgCur.id)return{...m,mgr:orgCur.mgr};return m;}));setOrgMode("list"); }
  function orgReact(id){ setOrgMembers(p=>p.map(m=>m.id===id?{...m,active:true}:m)); }
  function orgAdd(){ if(!orgForm.name.trim())return;const nid=Math.max(...orgMembers.map(m=>m.id))+1;setOrgMembers(p=>[...p,{id:nid,name:orgForm.name,role:orgForm.role,mgr:Number(orgForm.mgr)||1,av:orgForm.av||orgForm.name[0]||"ØŸ",active:true}]);setOrgOpen(p=>new Set([...p,Number(orgForm.mgr)||1]));setOrgMode("list"); }

  // â”€â”€â”€ styles â”€â”€â”€
  const card = {background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:8};
  const btn  = v=>({padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,WebkitTapHighlightColor:"transparent",fontFamily:"inherit",background:v==="p"?C.teal:v==="s"?C.success:v==="d"?C.danger+"33":C.surfaceAlt,color:v==="g"?C.textMuted:v==="d"?C.danger:"#fff"});
  const fi   = {width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:16,outline:"none",direction:"rtl",textAlign:"right",boxSizing:"border-box",marginBottom:12,WebkitAppearance:"none",fontFamily:"inherit",lineHeight:1.8,WebkitUserSelect:"text",userSelect:"text"};
  const lbl  = t=><div style={{fontSize:12,color:C.textMuted,marginBottom:5}}>{t}</div>;

  let topTitle="Ø¢Ø°Ø±Ù…Ù‡Ø± ØµÙ†Ø¹Øª", onBack=null;
  if (taskDet){topTitle=taskDet.task.title;onBack=()=>setActiveTask(null);}
  else if (proj){topTitle=proj.title;onBack=()=>setActiveProj(null);}

  const TABS=[
    {id:"notifs",  Icon:Icons.Bell,   badge:unread,         label:"Ø§Ø¹Ù„Ø§Ù†â€ŒÙ‡Ø§"},
    {id:"chat",    Icon:Icons.Chat,   badge:0,              label:"Ú†Øª"},
    {id:"projects",Icon:Icons.Folder, badge:0,              label:"Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÙ‡Ø§"},
    {id:"tasks",   Icon:Icons.Check,  badge:apiTasks.filter(t=>t.status!=="APPROVED"&&t.status!=="REJECTED").length, label:"ÙˆØ¸Ø§ÛŒÙ"},
    {id:"crm",      Icon:Icons.CRM,    badge:0, label:"CRM"},
    {id:"payments", Icon:Icons.Pay,    badge:visiblePayments.filter(p=>p.workflow.some(w=>w.assignedTo===me.id&&w.status==="pending"&&(w.step===1||p.workflow[w.step-2]?.status==="done"))).length, label:"Ù¾Ø±Ø¯Ø§Ø®Øª"},
  ];

  if (!loggedIn) {
    return <LoginScreen onLogin={(id, token, userObj)=>{ setMeId(id); setLoggedIn(true); try{ localStorage.setItem("loggedIn","1"); localStorage.setItem("meId",String(id)); if (token) localStorage.setItem("az_token",token); if (userObj) localStorage.setItem("az_user",JSON.stringify(userObj)); }catch{} }}/>;
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",background:C.bg,color:C.text,fontFamily:"'Vazirmatn','Segoe UI',sans-serif",direction:"rtl",overflow:"hidden",paddingTop:"env(safe-area-inset-top)"}}>

      {/* Topbar */}
      <div style={{height:58,display:"flex",alignItems:"center",padding:"0 14px",background:C.surface,flexShrink:0,borderBottom:`1px solid ${C.border}`}}>

        {!onBack&&<>
          {/* Ù‡Ù…Ø¨Ø±Ú¯Ø± â€” Ú†Ø³Ø¨ÛŒØ¯Ù‡ Ø¨Ù‡ Ù„Ø¨Ù‡ Ø±Ø§Ø³Øª */}
          <button onClick={()=>setSidebar(p=>!p)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="5" x2="16" y2="5"/><line x1="2" y1="11" x2="16" y2="11"/><line x1="2" y1="17" x2="16" y2="17"/></svg>
          </button>

          {/* Ø¢ÙˆØ§ØªØ§Ø± â€” ÙØ§ØµÙ„Ù‡ Ø§Ø² Ù‡Ù…Ø¨Ø±Ú¯Ø± Ø¨Ø§ margin */}
          <div style={{marginLeft:6}}>
            <Av user={{...me,online:true}} size={36}/>
          </div>

          {/* Ù†Ø§Ù… Ùˆ Ø³Ù…Øª */}
          <div style={{textAlign:"right",margin:"0 8px"}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3}}>{me.lastName||me.name.split(" ").pop()}</div>
            <div style={{fontSize:11,color:C.teal,lineHeight:1.3}}>{me.role}</div>
          </div>

          <div style={{flex:1}}/>

          <span style={{fontSize:15,fontWeight:700,color:C.text,marginLeft:12,fontFamily:"Arial,sans-serif",whiteSpace:"nowrap"}}>AMS-Group</span>
          <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMy4xLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHZpZXdCb3g9IjAgMCAxNTk3LjA5IDEyNTYuNzMiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDE1OTcuMDkgMTI1Ni43MzsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6I0QxRDNENDt9DQoJLnN0MXtmaWxsOiNGREI5MTM7fQ0KPC9zdHlsZT4NCjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0zMi4xMiw4MDAuNTVjNS41MSwzNy43OCwyMy42MSw3MS43OSw1Mi4wMiwxMDEuNDJjMjQuNjMsMjUuNjgsNTcuMDIsNDguMDMsOTUuNyw2Ni41OA0KCWMxMjQuOTUsNTkuOTUsMzE1LjUzLDgwLjI3LDUyMS45OCw0NS4xYzE2MS4wMi0yNy40MSwzMDMuMTQtODMuNzIsNDA2LjE5LTE1My45M2MxNS40NS0xMC41Myw0Ljk0LTM3LjA4LTEyLjQzLTMxLjQ2DQoJYy02Ny41MSwyMS44NC0xNDIuMzYsNDAuMzEtMjIxLjcxLDUzLjgzYy0zMDIuMDEsNTEuNDUtNTYyLjMzLDEzLjIzLTYwOC40Mi04NC45MmMtMC40Mi0wLjkxLTAuODItMS44MS0xLjItMi43Mg0KCWMtMi41NS01Ljk1LTQuMzEtMTIuMTMtNS4yMy0xOC41M2MtMTYuNjUtMTEzLjY0LDIzMS42My0yNTAuMzcsNTU0LjU3LTMwNS4zNmMxMTAuMzktMTguOCwyMTUuMjEtMjUuNjIsMzA2LjA4LTIxLjg4DQoJYy0xMTEuNzQtNDMuMjgtMjQ1Ljc3LTY4LjUyLTM4OS44OC02OC41MmMtMTA0LjI1LDAtMjAzLjIyLDEzLjIxLTI5Mi4zLDM2LjkxQzE4My4wNSw0OTkuNzEsMTAuNzksNjU0Ljk0LDMyLjEyLDgwMC41NSIvPg0KPHBhdGggY2xhc3M9InN0MCIgZD0iTTQ3MS4wMiwxMTM3LjJjMTExLjcyLDQzLjI4LDI0NS43LDY4LjQ4LDM4OS43Nyw2OC40OGMxMDQuNDIsMCwyMDMuNTYtMTMuMjMsMjkyLjc0LTM3LjAyDQoJYzI1NC4yMS04Mi43LDQyNi4yMi0yMzcuODUsNDA0Ljg4LTM4My4zOGMtNS41MS0zNy43NS0yMy42MS03MS43OS01Mi4wMi0xMDEuMzhjLTI0LjYxLTI1LjY4LTU3LTQ4LjA1LTk1LjY2LTY2LjYyDQoJYy0xMjQuOTctNTkuOTUtMzE1LjUxLTgwLjI4LTUyMi00NS4xYy0xNjAuOTksMjcuNDMtMzAzLjE0LDgzLjcyLTQwNi4xNywxNTMuOTVjLTE1LjQ1LDEwLjUxLTQuOTYsMzcuMDYsMTIuNDEsMzEuNDQNCgljNjcuNTMtMjEuODQsMTQyLjM4LTQwLjI5LDIyMS43My01My44MWMzMDItNTEuNDUsNTYyLjMzLTEzLjIxLDYwOC40NCw4NC45YzAuNCwwLjkxLDAuNzgsMS44MSwxLjE4LDIuNzINCgljMi41Myw1Ljk3LDQuMywxMi4xNiw1LjIzLDE4LjUzYzE2LjY1LDExMy42NC0yMzEuNjMsMjUwLjM3LTU1NC41NywzMDUuMzhDNjY2LjYzLDExMzQuMSw1NjEuODMsMTE0MC45MSw0NzEuMDIsMTEzNy4yIi8+DQo8cGF0aCBjbGFzcz0ic3QxIiBkPSJNOTU4LjUyLDE4MC4zMWMwLDc4LjEtNjMuMzMsMTQxLjQzLTE0MS40MywxNDEuNDNzLTE0MS40My02My4zMy0xNDEuNDMtMTQxLjQzUzczOC45OSwzOC44OCw4MTcuMDksMzguODgNCglDODk1LjE5LDM4Ljg4LDk1OC41MiwxMDIuMjEsOTU4LjUyLDE4MC4zMSIvPg0KPC9zdmc+DQo=" alt="" style={{height:35,objectFit:"contain",flexShrink:0,marginLeft:14}}/>
        </>}

        {onBack&&<>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.teal,cursor:"pointer",padding:"0 14px",height:"100%",display:"flex",alignItems:"center",WebkitTapHighlightColor:"transparent"}}>
            <Icons.Back/>
          </button>
          {taskDet&&<Av user={USERS.find(u=>u.id===taskDet.task.assignedTo)} size={34}/>}
          {proj&&!taskDet&&<Av user={USERS.find(u=>u.id===proj.manager)} size={34}/>}
          <div style={{flex:1,overflow:"hidden",marginRight:8}}>
            <div style={{fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{topTitle}</div>
            {proj&&!taskDet&&<div style={{fontSize:11,color:C.textDim}}>{proj.tasks.filter(t=>t.status==="done").length}/{proj.tasks.length} ØªÚ©Ù…ÛŒÙ„</div>}
          </div>
          {taskDet&&<Badge status={taskDet.task.status}/>}
        </>}

      </div>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative"}}>

        {/* Drawer Overlay */}
        <div onClick={()=>setSidebar(false)} style={{display:sidebar?"block":"none",position:"absolute",inset:0,background:"#000A",zIndex:10}}/>

        {/* Drawer */}
        <div style={{position:"absolute",top:0,right:0,bottom:0,width:280,background:C.surface,overflowY:"auto",WebkitOverflowScrolling:"touch",zIndex:20,transform:sidebar?"translateX(0)":"translateX(100%)",transition:"transform 0.25s ease",zIndex:11,display:"flex",flexDirection:"column"}}>

          {/* Profile */}
          <div style={{background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)",padding:"36px 20px 20px",flexShrink:0}}>
            <img src={LOGO_ICON} alt="" style={{height:50,objectFit:"contain",marginBottom:12,filter:"brightness(1.2)"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:"rgba(253,185,19,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",border:"2px solid rgba(253,185,19,0.4)",flexShrink:0}}>
                {me.av}
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{me.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:1}}>{me.role}</div>
              </div>
            </div>
          </div>

          {/* Section: Channels */}
          <DrawerSection title="Ú©Ø§Ù†Ø§Ù„â€ŒÙ‡Ø§">
            {CHANNELS.map(ch=>(
              <DrawerItem key={ch.id}
                icon={<div style={{width:34,height:34,borderRadius:"50%",background:C.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.textDim}}>#</div>}
                label={ch.name}
                active={tab==="chat"&&!dm&&channel===ch.id}
                onClick={()=>{setTab("chat");setDm(null);setChannel(ch.id);setSidebar(false);}}
              />
            ))}
          </DrawerSection>

          {/* Section: Direct Messages - collapsed by default */}
          <DrawerCollapsible title="Ù¾ÛŒØ§Ù… Ù…Ø³ØªÙ‚ÛŒÙ…" defaultOpen={true} count={USERS.length-1}>
            {USERS.filter(u=>u.id!==me.id&&activeUserIds.has(u.id)).map(u=>(
              <DrawerItem key={u.id}
                icon={<Av user={u} size={34}/>}
                label={u.name.split(' ').pop()}
                sub={u.role}
                active={tab==="chat"&&dm===u.id}
                online={u.online}
                onClick={()=>{setTab("chat");setDm(u.id);setSidebar(false);}}
              />
            ))}
          </DrawerCollapsible>

          {/* Section: Tools */}
          <DrawerSection title="Ø§Ø¨Ø²Ø§Ø±Ù‡Ø§">
            <DrawerItem icon="ðŸ“‹" label="Ø¯Ø±Ø®ÙˆØ§Ø³Øªâ€ŒÙ‡Ø§" badge={pending} onClick={()=>{setTab("requests");setSidebar(false);}}/>
            <DrawerItem icon="ðŸ“¬" label="Ú©Ø§Ø±ØªØ§Ø¨Ù„" badge={letters.filter(l=>l.status==="inbox"&&!l.read).length} onClick={()=>{setTab("inbox");setSidebar(false);}}/>
            {hasPermission('org_chart:view') && (
              <DrawerItem icon="ðŸ¢" label="Ú†Ø§Ø±Øª Ø³Ø§Ø²Ù…Ø§Ù†ÛŒ" onClick={()=>{setTab("org");setSidebar(false);}}/>
            )}
            {hasPermission('admin_panel:view') && (
              <DrawerItem icon="ðŸ“Š" label="Ù¾Ù†Ù„ Ù…Ø¯ÛŒØ±ÛŒØª" onClick={()=>{setTab("admin");setSidebar(false);}}/>
            )}
            {hasPermission('payments:view') && (
              <DrawerItem icon="ðŸ’³" label="ØªÙ†Ø®ÙˆØ§Ù‡â€ŒÛŒØ§Ø±" sub="Ù…Ø¯ÛŒØ±ÛŒØª ØªÙ†Ø®ÙˆØ§Ù‡â€ŒÙ‡Ø§ Ùˆ Ù‡Ø²ÛŒÙ†Ù‡â€ŒÙ‡Ø§" active={tab === "tankhah"} onClick={()=>{setTab("tankhah");setSidebar(false);}}/>
            )}
          </DrawerSection>

          {/* Section: Account */}
          <DrawerSection title="Ø­Ø³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø±ÛŒ">
            <DrawerItem icon="ðŸ”‘" label="ØªØºÛŒÛŒØ± Ø±Ù…Ø² Ø¹Ø¨ÙˆØ±" onClick={()=>{setSidebar(false);setShowChangePIN(true);}}/>
            <DrawerItem icon="ðŸšª" label="Ø®Ø±ÙˆØ¬" danger onClick={handleLogout}/>
          </DrawerSection>

          <div style={{height:"env(safe-area-inset-bottom)",minHeight:16}}/>
        </div>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",width:"100%"}}>

          {/* â”€â”€â”€ TASK DETAIL â”€â”€â”€ */}
          {taskDet?(
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:16}}>
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}><Badge status={taskDet.task.priority}/><Badge status={taskDet.task.status}/><span style={{fontSize:11,color:C.textDim,alignSelf:"center"}}>Ù¾Ø±ÙˆÚ˜Ù‡: {taskDet.project.title}</span></div>
              <div style={{...card,display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <Av user={USERS.find(u=>u.id===taskDet.task.assignedTo)} size={42}/>
                <div><div style={{fontSize:11,color:C.textDim}}>Ù…Ø³Ø¦ÙˆÙ„ Ø§Ø¬Ø±Ø§</div><div style={{fontSize:15,fontWeight:700}}>{USERS.find(u=>u.id===taskDet.task.assignedTo)?.name}</div><div style={{fontSize:12,color:C.textMuted}}>{USERS.find(u=>u.id===taskDet.task.assignedTo)?.role}</div></div>
              </div>
              <div style={{...card,marginBottom:16}}>
                <div style={{fontSize:12,color:C.teal,fontWeight:700,marginBottom:8,borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>Ø´Ø±Ø­ ÙˆØ¸ÛŒÙÙ‡</div>
                <div style={{fontSize:14,lineHeight:1.9}}>{taskDet.task.desc||"ØªÙˆØ¶ÛŒØ­Ø§ØªÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡."}</div>
              </div>
              {taskDet.task.status!=="done"?(
                <div style={{display:"flex",gap:10}}>
                  {taskDet.task.status==="pending"&&<button style={{...btn("g"),flex:1,padding:"13px",border:`1px solid ${C.border}`}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"inprogress")}>Ø´Ø±ÙˆØ¹</button>}
                  {taskDet.task.status==="inprogress"&&<><button style={{...btn("g"),flex:1,padding:"13px",border:`1px solid ${C.warning+"55"}`,color:C.warning}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"pending")}>Ø¨Ø§Ø²Ú¯Ø´Øª</button><button style={{...btn("s"),flex:2,padding:"13px"}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"done")}>ØªÚ©Ù…ÛŒÙ„</button></>}
                </div>
              ):(
                <div style={{textAlign:"center"}}>
                  <div style={{color:C.success,fontSize:14,fontWeight:600,marginBottom:10}}>ØªÚ©Ù…ÛŒÙ„ Ø´Ø¯Ù‡</div>
                  <button style={{...btn("g"),fontSize:12,color:C.warning,border:`1px solid ${C.warning+"44"}`}} onClick={()=>updateTask(taskDet.project.id,taskDet.task.id,"inprogress")}>Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ù‡ Â«Ø¯Ø± Ø¬Ø±ÛŒØ§Ù†Â»</button>
                </div>
              )}
            </div>

          /* â”€â”€â”€ PROJECT DETAIL â”€â”€â”€ */
          ):proj?(
            <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:14}}>
              <div style={{...card,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><Av user={USERS.find(u=>u.id===proj.manager)} size={30}/><div><div style={{fontSize:11,color:C.textDim}}>Ù…Ø¯ÛŒØ±</div><div style={{fontSize:13,fontWeight:600}}>{USERS.find(u=>u.id===proj.manager)?.name}</div></div></div>
                  <Badge status={proj.status}/>
                </div>
                <div style={{display:"flex",gap:14,fontSize:12,color:C.textMuted,marginBottom:12}}><span>Ø´Ø±ÙˆØ¹: {proj.startDate}</span><span>Ù¾Ø§ÛŒØ§Ù†: {proj.endDate}</span></div>
                <Progress tasks={proj.tasks}/>
                <div style={{display:"flex",gap:4,marginTop:10,flexWrap:"wrap"}}>{proj.members.map(uid=>{const u=USERS.find(x=>x.id===uid);return u?<div key={uid} style={{display:"flex",alignItems:"center",gap:4,background:C.bg,borderRadius:20,padding:"3px 8px 3px 4px",fontSize:11,color:C.textMuted}}><Av user={u} size={18}/>{u.lastName}</div>:null;})}</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontWeight:700,fontSize:14}}>ÙˆØ¸Ø§ÛŒÙ</span>
                <button style={btn("p")} onClick={()=>setShowTaskForm(proj.id)}>Ø§ÙØ²ÙˆØ¯Ù†</button>
              </div>
              {["pending","inprogress","done"].map(st=>{
                const grp=proj.tasks.filter(t=>t.status===st);
                if(!grp.length) return null;
                const lbs={pending:"Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø±",inprogress:"Ø¯Ø± Ø¬Ø±ÛŒØ§Ù†",done:"ØªÚ©Ù…ÛŒÙ„"};
                return <div key={st} style={{marginBottom:16}}><div style={{fontSize:10,color:C.textDim,fontWeight:700,marginBottom:6}}>{lbs[st]}</div>{grp.map(t=>{const a=USERS.find(u=>u.id===t.assignedTo);return(<div key={t.id} style={{...card,opacity:t.status==="done"?0.55:1,cursor:"pointer",marginBottom:8}} onClick={()=>setActiveTask({pid:proj.id,tid:t.id})}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,fontWeight:600,flex:1,marginLeft:8}}>{t.title}</span><Badge status={t.priority}/></div>{t.desc&&<div style={{fontSize:12,color:C.textDim,marginBottom:6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{t.desc}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:6}}><Av user={a} size={20}/><span style={{fontSize:11,color:C.textMuted}}>{a?.lastName}</span><span style={{fontSize:11,color:C.textDim}}>Â· {t.due}</span></div><span style={{fontSize:11,color:C.teal}}>Ø¬Ø²Ø¦ÛŒØ§Øª</span></div></div>);})}</div>;
              })}
              <div style={{marginTop:8}}>
                <div style={{fontSize:12,color:C.textDim,fontWeight:700,marginBottom:10}}>ØªØ§Ø±ÛŒØ®Ú†Ù‡</div>
                {proj.log.map((l,i)=>{const u=USERS.find(x=>x.id===l.userId);return(<div key={i} style={{display:"flex",gap:8,marginBottom:10}}><Av user={u} size={28}/><div style={{background:C.surfaceAlt,borderRadius:10,padding:"7px 12px",flex:1}}><div style={{fontSize:11,color:C.teal,marginBottom:2}}>{u?.lastName} Â· {l.time}</div><div style={{fontSize:13}}>{l.text}</div></div></div>);})}
              </div>
            </div>

          ):(
          <>
            {/* Tab Bar */}
            <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
              {TABS.filter(t=>t.id==='notifs'||(t.id==='chat'&&hasPermission('chat:view'))||(t.id==='payments'&&hasPermission('payments:view'))||(t.id==='crm'&&hasPermission('crm:view'))||['projects','tasks'].includes(t.id)).map(t=>(
                <div key={t.id} onClick={()=>setTab(t.id)}
                  style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"10px 4px 8px",cursor:"pointer",color:tab===t.id?C.teal:C.textDim,position:"relative",WebkitTapHighlightColor:"transparent",minHeight:52}}>
                  <t.Icon/>
                  <span style={{fontSize:9,marginTop:3,fontWeight:tab===t.id?700:400}}>{t.label}</span>
                  {t.badge>0&&<div style={{position:"absolute",top:7,right:"50%",transform:"translateX(10px)",background:C.teal,borderRadius:"50%",width:8,height:8}}/>}
                </div>
              ))}
            </div>

            {/* NOTIFICATIONS */}
            {tab==="notifs"&&(
              <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px 8px"}}>
                  <span style={{fontWeight:700,fontSize:15}}>Ø§Ø¹Ù„Ø§Ù†â€ŒÙ‡Ø§</span>
                  {unread>0&&<button style={{...btn("g"),fontSize:11,padding:"5px 10px"}} onClick={()=>setNotifs(ns=>ns.map(n=>({...n,read:true})))}>Ù‡Ù…Ù‡ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ø´Ø¯</button>}
                </div>
                {(()=>{
                  // Group consecutive messages from same sender
                  const grouped = [];
                  notifs.forEach(n=>{
                    const last = grouped[grouped.length-1];
                    if(last && last.type===n.type && last.type==="dm" && last.refId===n.refId && !n.read===!last.read){
                      last.count=(last.count||1)+1;
                      last.time=n.time;
                    } else if(last && last.type===n.type && last.type==="msg" && last.channel===n.channel && !n.read===!last.read){
                      last.count=(last.count||1)+1;
                      last.time=n.time;
                    } else {
                      grouped.push({...n,count:1});
                    }
                  });
                  return grouped;
                })().map(n=>(
                  <div key={n.id} style={{display:"flex",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:n.read?"transparent":C.tealDim}}
                    onClick={()=>{
  setNotifs(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x));
  if(n.type==="task"&&n.projectId&&n.taskId){
    setActiveProj(n.projectId);setActiveTask({pid:n.projectId,tid:n.taskId});setTab("projects");
  } else if(n.type==="dm"&&n.refId){
    if(hasPermission('chat:view')){setTab("chat");setDm(n.refId);}
  } else if(n.type==="msg"&&n.channel){
    if(hasPermission('chat:view')){setTab("chat");setDm(null);setChannel(n.channel);}
  } else if(n.type==="request"){
    setTab("requests");
  } else if(n.type==="payment"){
    if(hasPermission('payments:view')){setTab("payments");}
  }
}
