/**
 * VeloRent secure API backend.
 * Create the spreadsheet tabs with setupVeloRentSheets(), then configure the first
 * admin credentials in Script Properties and run bootstrapSuperAdmin().
 */
const SHEETS = {
  Vehicles:["id","type","brand","model","reg","rate","status"],
  Bookings:["id","name","phone","vid","vehicle","reg","from","to","days","rate","total","paid","status","created"],
  Payments:["id","bookingId","customer","amount","method","paymentDate","note","createdBy"],
  Settings:["key","value"],
  Users:["id","name","username","salt","passwordHash","role","active","createdAt","lastLogin"]
};
const ROLES=["SUPER_ADMIN","ADMIN","MANAGER","ACCOUNTANT","STAFF","VIEWER"];
const SESSION_SECONDS=21600;

function setupVeloRentSheets(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw new Error("Open this script from your Google Sheet: Extensions > Apps Script.");
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID",ss.getId());
  Object.keys(SHEETS).forEach(n=>{
    let sh=ss.getSheetByName(n);if(!sh)sh=ss.insertSheet(n);
    const h=SHEETS[n];
    if(sh.getLastRow()===0){sh.getRange(1,1,1,h.length).setValues([h]);sh.setFrozenRows(1);sh.getRange(1,1,1,h.length).setFontWeight("bold");}
    else {const first=sh.getRange(1,1,1,h.length).getDisplayValues()[0];if(first.join("|")!==h.join("|"))throw new Error("Header mismatch in "+n+". Back up data before changing headers.");}
  });
  return "VeloRent sheets ready.";
}

/** Set Script Properties: INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD, then run once. */
function bootstrapSuperAdmin(){
  const props=PropertiesService.getScriptProperties();
  const username=String(props.getProperty("INITIAL_ADMIN_USERNAME")||"").trim();
  const password=String(props.getProperty("INITIAL_ADMIN_PASSWORD")||"");
  if(username.length<4||password.length<14)throw new Error("In Project Settings > Script Properties, set INITIAL_ADMIN_USERNAME (4+ chars) and INITIAL_ADMIN_PASSWORD (14+ chars).");
  const sh=getSheet_("Users");
  const values=sh.getDataRange().getDisplayValues();
  if(values.length>1)throw new Error("Users already exist. Bootstrap is disabled to avoid creating a second root account.");
  createUser_(username,username,password,"SUPER_ADMIN",true);
  props.deleteProperty("INITIAL_ADMIN_PASSWORD");
  props.deleteProperty("INITIAL_ADMIN_USERNAME");
  return "Super Admin created. Sign in and create named accounts for staff.";
}

function doGet(e){
  const p=(e&&e.parameter)||{};
  if(p.action==="health")return json_({ok:true,app:"VeloRent API",message:"API online; authenticated actions require POST."});
  return json_({ok:false,error:"Use the VeloRent frontend API."});
}
function doPost(e){
  try{
    const raw=e&&e.postData&&e.postData.contents;
    const p=raw?JSON.parse(raw):((e&&e.parameter&&e.parameter.payload)?JSON.parse(e.parameter.payload):{});
    const action=String(p.action||"");
    let out;
    if(action==="login")out=login_(p.username,p.password);
    else if(action==="me"){const u=requireSession_(p.token);out={ok:true,user:publicUser_(u)};}
    else if(action==="logout"){const u=requireSession_(p.token);CacheService.getScriptCache().remove("vr_sess_"+p.token);out={ok:true};}
    else if(action==="getState"){const u=requireSession_(p.token);out={ok:true,user:publicUser_(u),state:readState_()};}
    else if(action==="saveState"){const u=requireSession_(p.token);requireRole_(u,["SUPER_ADMIN","ADMIN","MANAGER"]);validateState_(p.state);writeState_(p.state);out={ok:true,message:"Saved"};}
    else if(action==="listUsers"){const u=requireSession_(p.token);requireRole_(u,["SUPER_ADMIN"]);out={ok:true,users:listUsers_()};}
    else if(action==="createUser"){const u=requireSession_(p.token);requireRole_(u,["SUPER_ADMIN"]);const x=p.user||{};out={ok:true,user:createUser_(x.name,x.username,x.password,x.role)};}
    else if(action==="setUserActive"){const u=requireSession_(p.token);requireRole_(u,["SUPER_ADMIN"]);out={ok:true,updated:setUserActive_(p.username,p.active)};}
    else if(action==="recordPayment"){const u=requireSession_(p.token);requireRole_(u,["SUPER_ADMIN","ADMIN","MANAGER","ACCOUNTANT"]);out=recordPayment_(p.payment,u);}
    else throw new Error("Unknown action.");
    return json_(out);
  }catch(err){return json_({ok:false,error:String(err.message||err)});}
}

function login_(username,password){
  username=String(username||"").trim().toLowerCase();password=String(password||"");
  if(!username||!password)throw new Error("Enter username and password.");
  const sh=getSheet_("Users"),values=sh.getDataRange().getValues(),headers=values[0].map(String);
  const ix=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const row=values.slice(1).find(r=>String(r[ix.username]).toLowerCase()===username);
  // Keep response identical for unknown user and incorrect password.
  if(!row||String(row[ix.active])!=="true"||!constantTimeEquals_(hash_(password,String(row[ix.salt])),String(row[ix.passwordHash])))throw new Error("Invalid username or password, or account disabled.");
  const user={};headers.forEach((h,i)=>user[h]=row[i]);
  const token=Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,"");
  const cache=CacheService.getScriptCache();cache.put("vr_sess_"+token,JSON.stringify({id:user.id,username:user.username,role:user.role}),SESSION_SECONDS);
  sh.getRange(values.findIndex(r=>r[ix.username]===row[ix.username])+1,ix.lastLogin+1).setValue(new Date());
  return {ok:true,token,expiresIn:SESSION_SECONDS,user:publicUser_(user)};
}
function createUser_(name,username,password,role,allowRoot){
  name=String(name||"").trim();username=String(username||"").trim().toLowerCase();password=String(password||"");role=String(role||"").toUpperCase();
  if(name.length<2)throw new Error("Enter a full name.");
  if(!/^[a-z0-9._-]{4,40}$/.test(username))throw new Error("Username must be 4–40 characters: letters, numbers, dot, underscore or hyphen.");
  if(password.length<14)throw new Error("Use a password with at least 14 characters.");
  if(!ROLES.includes(role)||(role==="SUPER_ADMIN"&&!allowRoot))throw new Error("Only bootstrap can create the first Super Admin. Other accounts must use a non-root role.");
  const sh=getSheet_("Users"),vals=sh.getDataRange().getValues(),heads=vals[0].map(String);
  if(vals.slice(1).some(r=>String(r[heads.indexOf("username")]).toLowerCase()===username))throw new Error("Username already exists.");
  const salt=Utilities.getUuid()+Utilities.getUuid(),id=Utilities.getUuid();
  sh.appendRow([id,name,username,salt,hash_(password,salt),role,true,new Date(),""]);
  return {name,username,role,active:true};
}
function listUsers_(){return readRows_("Users").map(publicUser_);}
function setUserActive_(username,active){
  username=String(username||"").toLowerCase();const sh=getSheet_("Users"),v=sh.getDataRange().getValues(),h=v[0].map(String),ui=h.indexOf("username"),ai=h.indexOf("active"),ri=h.indexOf("role");
  for(let i=1;i<v.length;i++)if(String(v[i][ui]).toLowerCase()===username){
    if(String(v[i][ri])==="SUPER_ADMIN")throw new Error("The Super Admin cannot be disabled from this screen.");
    sh.getRange(i+1,ai+1).setValue(Boolean(active));return true;
  }throw new Error("User not found.");
}
function publicUser_(u){return {id:String(u.id||""),name:String(u.name||""),username:String(u.username||""),role:String(u.role||"VIEWER"),active:String(u.active)==="true"||u.active===true,lastLogin:u.lastLogin||""};}
function requireSession_(token){
  token=String(token||"");if(token.length<50)throw new Error("Session expired. Please sign in again.");
  const raw=CacheService.getScriptCache().get("vr_sess_"+token);if(!raw)throw new Error("Session expired. Please sign in again.");
  const s=JSON.parse(raw),users=readRows_("Users"),u=users.find(x=>String(x.id)===s.id&&String(x.active)==="true");
  if(!u)throw new Error("Account disabled. Contact Super Admin.");
  return u;
}
function requireRole_(u,roles){if(!roles.includes(String(u.role)))throw new Error("Permission denied for role "+u.role+".");}
function hash_(password,salt){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,salt+"::"+password,Utilities.Charset.UTF_8));}
function constantTimeEquals_(a,b){if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;}
function validateState_(s){if(!s||!Array.isArray(s.vehicles)||!Array.isArray(s.bookings))throw new Error("Invalid state.");if(s.vehicles.length>2000||s.bookings.length>10000)throw new Error("Data limit exceeded.");}
function readState_(){return {vehicles:readRows_("Vehicles"),bookings:readRows_("Bookings")};}
function readRows_(name){const sh=getSheet_(name),v=sh.getDataRange().getValues();if(v.length<2)return[];const h=v[0].map(String);return v.slice(1).filter(r=>r.some(c=>c!=="")).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);if(name==="Vehicles")o.rate=Number(o.rate||0);if(name==="Bookings")["days","rate","total","paid"].forEach(k=>o[k]=Number(o[k]||0));return o;});}
function writeState_(s){const lock=LockService.getScriptLock();lock.waitLock(15000);try{replaceRows_("Vehicles",s.vehicles,SHEETS.Vehicles);replaceRows_("Bookings",s.bookings,SHEETS.Bookings);}finally{lock.releaseLock();}}
function replaceRows_(name,rows,headers){const sh=getSheet_(name);sh.clearContents();sh.getRange(1,1,1,headers.length).setValues([headers]);sh.setFrozenRows(1);if(rows.length)sh.getRange(2,1,rows.length,headers.length).setValues(rows.map(o=>headers.map(h=>o[h]===undefined||o[h]===null?"":o[h])));}
function recordPayment_(x,u){x=x||{};if(!x.bookingId||!(Number(x.amount)>0))throw new Error("Booking ID and positive amount required.");getSheet_("Payments").appendRow([Utilities.getUuid(),String(x.bookingId),String(x.customer||""),Number(x.amount),"Cash",new Date(),String(x.note||""),u.username]);return {ok:true,message:"Cash payment recorded"};}
function getSheet_(name){const id=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");if(!id)throw new Error("Run setupVeloRentSheets() first.");const ss=SpreadsheetApp.openById(id);let sh=ss.getSheetByName(name);if(!sh){sh=ss.insertSheet(name);sh.getRange(1,1,1,SHEETS[name].length).setValues([SHEETS[name]]);sh.setFrozenRows(1);}return sh;}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
