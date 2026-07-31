export function App() {
  // â”€â”€â”€ AUTH STATE â”€â”€â”€
  const [authLoading, setAuthLoading] = useState(true);
  const [creds, setCreds]         = useState(USER_IDENTITIES);
  const [loggedIn, setLoggedIn]   = useState(false);
  // Ø­Ø°Ù Number() Ø¨Ø±Ø§ÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø§Ø² UUID (Ø±Ø´ØªÙ‡)
  const [meId, setMeId]           = useState(null);
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [changePinStep, setChangePinStep] = useState("old");
  const [changePinVal, setChangePinVal]   = useState({old:"",new1:"",new2:""});
  const [pinChangeMsg, setPinChangeMsg]   = useState("");

  // Load auth from localStorage and validate
  useEffect(() => {
    const initAuth = () => {
      try {
        // Check for cached session tokens
        const savedToken = localStorage.getItem("az_token");
        const savedUser = localStorage.getItem("az_user");
        const savedMeId = localStorage.getItem("meId");

        // If no tokens found, user is not authenticated
        if (!savedToken || !savedUser) {
          setLoggedIn(false);
          setMeId(null);
          setAuthLoading(false);
          return;
        }

        // Validate user exists in the system
        let parsedUser = null;
        try {
          parsedUser = JSON.parse(savedUser);
        } catch {
          console.error("Invalid user data in localStorage");
          localStorage.removeItem("az_token");
          localStorage.removeItem("az_user");
          setLoggedIn(false);
          setMeId(null);
          setAuthLoading(false);
          return;
        }

        // Verify user exists in USERS list
        const users = Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES : [];
        const matchedUser = users.find(u => u.username === parsedUser.username);
        
        if (matchedUser || parsedUser.id) {
          // User is authenticated - set state
          setLoggedIn(true);
          if (savedMeId) {
            setMeId(savedMeId);
          }
        } else {
          // Invalid user data
          localStorage.removeItem("az_token");
          localStorage.removeItem("az_user");
          setLoggedIn(false);
          setMeId(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoggedIn(false);
        setMeId(null);
      } finally {
        // Ensure loading is always set to false when done
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  // Ú©Ù†Ø³Ø±ÙˆÙˆØ¯ Ú©Ø±Ø¯Ù† Ø±Ù†Ø¯Ø± ØªØ§ Ø²Ù…Ø§Ù†ÛŒ Ú©Ù‡ Ø¨Ø±Ø±Ø³ÛŒ Ø§ÙˆÙ„ÛŒÙ‡ Session Ø±Ø§ Ø§Ù†Ø¬Ø§Ù… Ù†Ø¯ÛŒÙ… Ùˆ refresh Ù†Ú©Ø±Ø¯Ù‡ Ø¨Ø§Ø´ÛŒÙ…
  if (authLoading) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#131313",color:"#fff",fontFamily:"Tahoma, sans-serif"}}>
        <div style={{fontSize:"18px",marginTop:"16px"}}>Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ...</div>
      </div>
    );
  }

  // Ø®ÙˆØ§Ù†Ø¯Ù† Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ú©Ø§Ø±Ø¨Ø± Ø§Ø² API Ø¨Ù‡ Ø¬Ø§ÛŒ ØªÚ©ÛŒÙ‡ Ù…Ø·Ù„Ù‚ Ø¨Ø± Ø¢Ø±Ø§ÛŒÙ‡ Ø§Ø³ØªØ§ØªÛŒÚ©
  const savedUser = loadLS("az_user", null);
  const matchedUser = savedUser?.username
    ? Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES.find(u => u.username === savedUser.username) : null
    : null;
  const me = matchedUser || savedUser || (meId ? Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES.find(u => String(u.id) === String(meId)) : null : null) || (Array.isArray(USER_IDENTITIES) ? USER_IDENTITIES[0] : null);

  // RBAC Permission Check
  const hasPermission = (key) => {
    // Fallback: Ø§Ú¯Ø± Ù‡Ù†ÙˆØ² Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ Ù†Ù‚Ø´ Ùˆ Ø¯Ø³ØªØ±Ø³ÛŒ Ø§Ø² Ø¨Ú©â€ŒØ§Ù†Ø¯ Ø¯Ø±ÛŒØ§ÙØª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª (me.permissions ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯)
    if (!me?.permissions) {
      const isAdmin = [1, 2, 3].includes(me?.id);
      if (key === 'org_chart:view') return true; // Ù‡Ù…Ù‡ Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ù†Ø¯ Ú†Ø§Ø±Øª Ø±Ø§ Ø¨Ø¨ÛŒÙ†Ù†Ø¯
      if (key === 'org_chart:edit' || key === 'admin_panel:view' || key === 'chat:view' || key === 'payments:view' || key === 'crm:view') return isAdmin; // admin fallback
      return isAdmin;
    }
    // Ù…Ù†Ø·Ù‚ Ø§ØµÙ„ÛŒ RBAC Ù¾Ø³ Ø§Ø² Ø§ØªØµØ§Ù„ Ú©Ø§Ù…Ù„ Ø¨Ù‡ Ø¨Ú©â€ŒØ§Ù†Ø¯
    return me?.permissions?.includes(key) || me?.role === 'super_admin';
  };

  // Groups State (4 Default Groups)
  const [groups, setGroups] = useState([
    { id: 'g1', name: 'Ú¯Ø±ÙˆÙ‡ Ø¹Ù…ÙˆÙ…ÛŒ', members: [] },
    { id: 'g2', name: 'Ú¯Ø±ÙˆÙ‡ ÙØ±ÙˆØ´', members: [] },
    { id: 'g3', name: 'Ú¯Ø±ÙˆÙ‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ', members: [] },
    { id: 'g4', name: 'Ú¯Ø±ÙˆÙ‡ Ù…Ø¯ÛŒØ±ÛŒØª', members: [] }
  ]);

  // Contacts State (synced from OrgMembers)
  const [contacts, setContacts] = useState([]);

  // Sync OrgMembers to Contacts
  useEffect(() => {
    if (orgMembers && orgMembers.length > 0) {
      const activeContacts = orgMembers
        .filter(m => m.isActive !== false)
        .map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          avatar: m.avatar || '/default-avatar.png'
        }));
      setContacts(activeContacts);
    }
  }, [orgMembers]);

  const canSeePayment = (p) =>
    [1,2,3].includes(me.id) || // legacy admin check
    p.requesterId === me.id ||
    p.workflow.some(w => w.assignedTo === me.id);

  function saveCreds(newCreds) { setCreds(newCreds); }

  function handleLogout() {
    setLoggedIn(false);
    setMeId(null);
    try { localStorage.clear(); } catch{} // Ù¾Ø§Ú© Ú©Ø±Ø¯Ù† ØªÙ…Ø§Ù… Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ØŒ ØªÙˆÚ©Ù†â€ŒÙ‡Ø§ Ùˆ Ú©Ø´â€ŒÙ‡Ø§
    window.location.reload(); // Ø±ÛŒØ³Øª Ú©Ø§Ù…Ù„ stateÙ‡Ø§ÛŒ React Ø¯Ø± Ø­Ø§ÙØ¸Ù‡
  }


  // â”€â”€â”€ Get manager from org chart â”€â”€â”€
  function getManagerId(userId) {
    const member = orgMembers.find(m => m.id === userId && m.active);
    return member?.mgr || null;
  }

  function canApproveRequest(req) {
    // Admins can always approve (legacy: users 1,2,3 or has admin_panel:view permission)
    if ([1, 2, 3].includes(me.id) || hasPermission('admin_panel:view')) return true;
    // Requester cannot approve their own request
    if (req.fromId === me.id) return false;
    // Check if me is in the workflow steps assigned to me
    const myStep = req.workflow?.find(w =>
      w.assignedTo === me.id &&
      w.status === "pending" &&
      (w.step === 1 || req.workflow[w.step-2]?.status === "done")
    );
    return !!myStep;
  }

  // ØªØºÛŒÛŒØ± PIN: ØºÛŒØ±ÙØ¹Ø§Ù„ â€” ÙÙ‚Ø· Ø±Ø§Ù‡Ù†Ù…Ø§ÛŒ ØªÙ…Ø§Ø³ Ø¨Ø§ Ø§Ø¯Ù…ÛŒÙ† (Ø¨Ø¯ÙˆÙ† Ø°Ø®ÛŒØ±Ù‡ password Ø¯Ø± ÙØ±Ø§Ù†Øªâ€ŒØ§Ù†Ø¯)
  function handleChangePIN() {
    setPinChangeMsg("Ø¨Ø±Ø§ÛŒ ØªØºÛŒÛŒØ± Ø±Ù…Ø² Ø¹Ø¨ÙˆØ± Ø¨Ø§ Ù…Ø¯ÛŒØ± Ø³ÛŒØ³ØªÙ… ØªÙ…Ø§Ø³ Ø¨Ú¯ÛŒØ±ÛŒØ¯");
  }

  // state
  const [tab,setTab]                     = useState("notifs");
  const [channel,setChannel]             = useState("general");
  const [dm,setDm]                       = useState(null);
  const [msgs,setMsgs]                   = useState(()=>loadLS("msgs", INIT_MSGS));
  const [dmMsgs,setDmMsgs]               = useState(()=>loadLS("dmMsgs", {}));
  const [input,setInput]                 = useState("");
  const [pendingFile,setPendingFile]     = useState(null); // ÙØ§ÛŒÙ„ Ø¢Ù¾Ù„ÙˆØ¯ Ø´Ø¯Ù‡ Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø±Ø³Ø§Ù„
  const [reqs,setReqs]                   = useState(()=>loadLS("reqs", INIT_REQS));
  const [projs,setProjs]                 = useState(()=>loadLS("projs", INIT_PROJECTS));
  const [notifs,setNotifs]               = useState(()=>loadLS("notifs", INIT_NOTIFS));
  const [activeProj,setActiveProj]       = useState(null);
  const [activeTask,setActiveTask]       = useState(null);
  const [sidebar,setSidebar]             = useState(false);
  const [confirm,setConfirm]             = useState(null);
  const [showReqForm,setShowReqForm]     = useState(false);
  const [showProjForm,setShowProjForm]   = useState(false);
  const [showTaskForm,setShowTaskForm]   = useState(false);

  // â”€â”€â”€ My Tasks (ÙØ§Ø² Û± â€” Ø§Ø² Ø¨Ú©â€ŒØ§Ù†Ø¯) â”€â”€â”€
  const [apiTasks,setApiTasks]           = useState([]);
  const [apiTasksLoading,setApiTasksLoading] = useState(false);
  const [apiTasksErr,setApiTasksErr]     = useState("");
  const [openApiTask,setOpenApiTask]     = useState(null);   // Ø¬Ø²Ø¦ÛŒØ§Øª ØªØ³Ú© Ø¨Ø§Ø²Ø´Ø¯Ù‡
  const [apiTaskEv,setApiTaskEv]         = useState([]);     // Ø´ÙˆØ§Ù‡Ø¯ ØªØ³Ú© Ø¨Ø§Ø²Ø´Ø¯Ù‡
  const [apiDetailLoading,setApiDetailLoading] = useState(false);
  const [evFormOpen,setEvFormOpen]       = useState(false);  // ÙØ±Ù… Ø«Ø¨Øª Ø´Ø§Ù‡Ø¯
  const [evForm,setEvForm]               = useState({evidenceType:"TEXT",notes:"",contentUrl:""});
  const [evBusy,setEvBusy]               = useState(false);
  const [evErr,setEvErr]                 = useState("");
  const [blockerOpen,setBlockerOpen]     = useState(false);  // ÙØ±Ù… Ú¯Ø²Ø§Ø±Ø´ Ù…Ø§Ù†Ø¹
  const [blockerDesc,setBlockerDesc]     = useState("");
  const [statusBusy,setStatusBusy]       = useState("");     // id|status Ø¯Ø± Ø­Ø§Ù„ ØªØºÛŒÛŒØ±
  const [newReq,setNewReq]               = useState({type:"Ù…Ø±Ø®ØµÛŒ Ø§Ø³ØªØ­Ù‚Ø§Ù‚ÛŒ",note:""});
  const [newProj,setNewProj]             = useState({title:"",manager:2,members:[],endDate:"",priority:"medium"});
  const [newTask,setNewTask]             = useState({title:"",desc:"",assignedTo:1,due:"",priority:"medium"});

  // org chart state
  const [orgMembers,setOrgMembers]       = useState(()=>{
    const saved = loadLS("orgMembers", null);
    if (saved) {
      // Sync names and roles from USERS (single source of truth)
      return saved.map(om => {
        const u = USERS.find(x=>x.id===om.id);
        return u ? {...om, name:u.name, role:u.role, av:u.av} : om;
      });
    }
    return ORG_DATA.map(m=>({...m,active:true}));
  });
  const [orgOpen,setOrgOpen]             = useState(new Set([1,2,3,4]));
  const [orgMode,setOrgMode]             = useState("list");
  const [orgCur,setOrgCur]               = useState(null);
  const [orgForm,setOrgForm]             = useState({name:"",role:"",mgr:"1",av:""});

  // payment states
  const [payments, setPayments]         = useState(()=>loadLS("payments", SAMPLE_PAYMENTS));
  const [openPayment, setOpenPayment]   = useState(null);
  const [showPayForm, setShowPayForm]   = useState(false);
  const [payFilter, setPayFilter]       = useState("all");
  const [paySearch, setPaySearch]       = useState("");

  // crm states
  const [customers, setCustomers]       = useState(()=>loadLS("customers", INIT_CUSTOMERS));
  const [crmOrders, setCrmOrders]       = useState(()=>loadLS("crmOrders", INIT_CRM_ORDERS));
  const [activeCust, setActiveCust]     = useState(null);
  const [crmTab, setCrmTab]             = useState("customers");
  const [showCustForm, setShowCustForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [newCust, setNewCust]           = useState({name:"",type:"Ú©Ø§Ø±Ø®Ø§Ù†Ù‡",city:"",phone:"",contact:"",grade:"Ù…Ø¹Ù…ÙˆÙ„ÛŒ",av:""});
  const [newCrmOrder, setNewCrmOrder]   = useState({customerId:"",product:"",qty:"",unit:"ØªÙ†",amount:"",status:"Ø«Ø¨Øª",desc:""});
  const [crmSearch, setCrmSearch]       = useState("");
  const [msgSearch, setMsgSearch]         = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  // search & detail states
  const [searchQ, setSearchQ]           = useState("");
  const [openRequest, setOpenRequest]   = useState(null);
  const [openLetterDetail, setOpenLetterDetail] = useState(null);
  const [reqNote, setReqNote]           = useState("");

  // inbox state
  const [letters,setLetters]             = useState(()=>loadLS("letters", INIT_LETTERS));
  const [docs,setDocs]                   = useState(()=>loadLS("docs", INIT_DOCS));
  const [inboxSub,setInboxSub]           = useState("letters"); // letters | docs
  const [openLetter,setOpenLetter]       = useState(null);
  const [showCompose,setShowCompose]     = useState(false);
  const [letterTab,setLetterTab]         = useState("inbox"); // inbox | sent
  const [compose,setCompose]             = useState({to:[],subject:"",body:"",priority:"normal",attachments:[]});
  const [docFilter,setDocFilter]         = useState("Ù‡Ù…Ù‡");

  // â”€â”€â”€ Admin CRUD State â”€â”€â”€
  const [adminTab,setAdminTab]           = useState("users");
  const [adminUsers,setAdminUsers]       = useState([]);
  const [adminUsersLoading,setAdminUsersLoading] = useState(false);
  const [adminRoles,setAdminRoles]       = useState([]);
  const [adminRolesLoading,setAdminRolesLoading] = useState(false);
  const [adminPermissionsLoading,setAdminPermissionsLoading] = useState(false);
  const [adminGroups,setAdminGroups]     = useState([]);
  const [adminGroupsLoading,setAdminGroupsLoading] = useState(false);

  // Admin Modals
  const [adminUserModal,setAdminUserModal]   = useState(null);
  const [adminUserForm,setAdminUserForm]     = useState({full_name:"",username:"",password:"",role:"",system_role:"user",avatar:""});
  const [adminUserSaving,setAdminUserSaving] = useState(false);
  const [adminUserDeleting,setAdminUserDeleting] = useState(false);

  const [adminRoleModal,setAdminRoleModal]   = useState(null);
  const [adminRoleForm,setAdminRoleForm]     = useState({key:"",title:"",level:10});
  const [adminRoleSaving,setAdminRoleSaving] = useState(false);
  const [adminRoleDeleting,setAdminRoleDeleting] = useState(false);

  const [adminRolePermModal,setAdminRolePermModal] = useState(null);
  const [adminRolePermForm,setAdminRolePermForm]   = useState([]);
  const [adminRolePermSaving,setAdminRolePermSaving] = useState(false);

  const [adminAssignRoleModal,setAdminAssignRoleModal] = useState(null);
  const [adminAssignRoleSaving,setAdminAssignRoleSaving] = useState(false);

  const [adminGroupModal,setAdminGroupModal]   = useState(null);
  const [adminGroupForm,setAdminGroupForm]     = useState({name:"",description:""});
  const [adminGroupSaving,setAdminGroupSaving] = useState(false);
  const [adminGroupDeleting,setAdminGroupDeleting] = useState(false);

  const [adminGroupMembersModal,setAdminGroupMembersModal] = useState(null);

  const [confirmDeleteUser,setConfirmDeleteUser]   = useState(null);
  const [confirmDeleteRole,setConfirmDeleteRole]   = useState(null);
  const [confirmDeleteGroup,setConfirmDeleteGroup] = useState(null);

  const msgEnd = useRef(null);

  // â”€â”€â”€ Derived from state (after all useState) â”€â”€â”€
  const visiblePayments   = payments.filter(canSeePayment);

  // â”€â”€â”€ Persist to localStorage â”€â”€â”€
  useEffect(()=>{ saveLS("msgs",       msgs);       }, [msgs]);

  // â”€â”€â”€ Browser Notification Permission â”€â”€â”€
  useEffect(()=>{
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g  = ctx.createGain();
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.frequency.setValueAtTime(880, ctx.currentTime);
    o1.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    o2.frequency.setValueAtTime(660, ctx.currentTime);
    o2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.4);
    o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.4);
  } catch {}
}
