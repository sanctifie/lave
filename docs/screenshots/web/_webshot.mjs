import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;

const BASE = 'http://localhost:4173';
const OUT = '/home/user/lave/docs/screenshots/web';
const now = Date.now();
const iso = (d) => new Date(now - d*3600e3).toISOString();

// ---- données de démo ----
const MOCKS = {
  '/admin/stats': { orders: 1284, deliveries: 936, rides: 412, mealOrders: 268, appointments: 1547, users: 3129, doctors: 42 },
  '/admin/orders': [
    { id: 'ord_9f2a1c7b', status: 'delivered', totalFcfa: 6800, createdAt: iso(2), patient:{name:'Awa Ndong',phone:'+241 06 12 34 56'}, partner:{legalName:'Pharmacie du Centre'}, items:[{name:'a',quantity:1},{name:'b',quantity:2},{name:'c',quantity:1}] },
    { id: 'ord_3b8e4d21', status: 'dispatched', totalFcfa: 3500, createdAt: iso(1), patient:{name:'Koffi Bantsantsa',phone:'+241 07 88 42 10'}, partner:{legalName:'Pharmacie Akanda'}, items:[{name:'a',quantity:1}] },
    { id: 'ord_7c1f9a05', status: 'preparing', totalFcfa: 12400, createdAt: iso(3), patient:{name:'Léa Toungou',phone:'+241 06 55 21 09'}, partner:{legalName:'Grande Pharmacie'}, items:[{name:'a',quantity:2},{name:'b',quantity:1}] },
    { id: 'ord_1a4d6e33', status: 'pending_pharmacy', totalFcfa: 4200, createdAt: iso(4), patient:{name:'Marc Obiang',phone:'+241 07 30 11 88'}, partner:{legalName:'Pharmacie du Centre'}, items:[{name:'a',quantity:3}] },
    { id: 'ord_5e9b2c88', status: 'ready_for_pickup', totalFcfa: 2100, createdAt: iso(5), patient:{name:'Sylvie Mba',phone:'+241 06 77 90 45'}, partner:{legalName:'Pharmacie Glass'}, items:[{name:'a',quantity:1}] },
    { id: 'ord_2f7a8b19', status: 'cancelled', totalFcfa: 5600, createdAt: iso(6), patient:{name:'Éric Nzé',phone:'+241 07 45 66 32'}, partner:{legalName:'Pharmacie Akanda'}, items:[{name:'a',quantity:2}] },
  ],
  '/admin/deliveries': [
    { id:'dlv_a1', status:'in_transit', feeFcfa:1000, createdAt:iso(1), courier:{user:{name:'Jean-Marc B.'}}, order:{partner:{legalName:'Pharmacie du Centre'},patient:{name:'Awa Ndong'}}, ride:null, mealOrder:null },
    { id:'dlv_a2', status:'delivered', feeFcfa:1500, createdAt:iso(2), courier:{user:{name:'Paul O.'}}, order:{partner:{legalName:'Grande Pharmacie'},patient:{name:'Léa Toungou'}}, ride:null, mealOrder:null },
    { id:'dlv_a3', status:'assigned', feeFcfa:2000, createdAt:iso(3), courier:{user:{name:'Aïcha D.'}}, order:null, ride:null, mealOrder:{mealPlan:{name:'Menu diabétique'}} },
    { id:'dlv_a4', status:'pending_assignment', feeFcfa:1000, createdAt:iso(4), courier:null, order:{partner:{legalName:'Pharmacie Glass'},patient:{name:'Marc Obiang'}}, ride:null, mealOrder:null },
    { id:'dlv_a5', status:'delivered', feeFcfa:1200, createdAt:iso(5), courier:{user:{name:'Jean-Marc B.'}}, order:null, ride:{request:{originLandmark:'CHU',destLandmark:'Nzeng-Ayong',type:'hospital'}}, mealOrder:null },
  ],
  '/admin/rides': [
    { id:'rid_b1', status:'completed', fareEstFcfa:3500, fareFinalFcfa:3500, createdAt:iso(1), request:{patientId:'p1',type:'hospital',originLandmark:'Glass',destLandmark:'CHU Libreville'}, delivery:{status:'delivered'} },
    { id:'rid_b2', status:'in_progress', fareEstFcfa:2800, fareFinalFcfa:null, createdAt:iso(2), request:{patientId:'p2',type:'exam',originLandmark:'Akanda',destLandmark:'Labo Biolab'}, delivery:{status:'in_transit'} },
    { id:'rid_b3', status:'searching', fareEstFcfa:4200, fareFinalFcfa:null, createdAt:iso(3), request:{patientId:'p3',type:'home',originLandmark:'Nzeng-Ayong',destLandmark:'Domicile'}, delivery:null },
    { id:'rid_b4', status:'completed', fareEstFcfa:1900, fareFinalFcfa:2100, createdAt:iso(4), request:{patientId:'p4',type:'hospital',originLandmark:'Owendo',destLandmark:'Hôpital Régional'}, delivery:{status:'delivered'} },
  ],
  '/admin/meals': [
    { id:'mel_c1', patientId:'p1', totalFcfa:4000, deliveryFeeFcfa:1000, notes:'Sans sel', createdAt:iso(1), mealPlan:{name:'Menu diabétique',partnerId:'x'}, delivery:{status:'in_transit'} },
    { id:'mel_c2', patientId:'p2', totalFcfa:3500, deliveryFeeFcfa:1000, notes:null, createdAt:iso(2), mealPlan:{name:'Menu hypertension',partnerId:'x'}, delivery:{status:'delivered'} },
    { id:'mel_c3', patientId:'p3', totalFcfa:4500, deliveryFeeFcfa:1200, notes:'Livrer avant 12h', createdAt:iso(3), mealPlan:{name:'Menu post-opératoire',partnerId:'x'}, delivery:{status:'pending_assignment'} },
  ],
  '/admin/doctors': [
    { id:'doc_d1', cnomNumber:'CNOM-GA-2291', consultationFeeFcfa:5000, isAvailableNow:true, verificationStatus:'verified', createdAt:iso(200), user:{name:'Dr. Sylvie Mba',phone:'+241 06 10 20 30',isActive:true}, specialty:{name:'Médecine générale'} },
    { id:'doc_d2', cnomNumber:'CNOM-GA-1874', consultationFeeFcfa:6000, isAvailableNow:true, verificationStatus:'verified', createdAt:iso(400), user:{name:'Dr. Paul Obame',phone:'+241 07 22 33 44',isActive:true}, specialty:{name:'Pédiatrie'} },
    { id:'doc_d3', cnomNumber:'CNOM-GA-3120', consultationFeeFcfa:9000, isAvailableNow:false, verificationStatus:'verified', createdAt:iso(120), user:{name:'Dr. Éric Nzé',phone:'+241 06 55 66 77',isActive:true}, specialty:{name:'Cardiologie'} },
    { id:'doc_d4', cnomNumber:'CNOM-GA-4402', consultationFeeFcfa:7000, isAvailableNow:false, verificationStatus:'pending_verification', createdAt:iso(20), user:{name:'Dr. Aïcha Diallo',phone:'+241 07 90 12 34',isActive:true}, specialty:{name:'Gynécologie'} },
    { id:'doc_d5', cnomNumber:'CNOM-GA-5567', consultationFeeFcfa:8000, isAvailableNow:false, verificationStatus:'pending_manual', createdAt:iso(8), user:{name:'Dr. Léa Kombila',phone:'+241 06 44 55 66',isActive:true}, specialty:{name:'Dermatologie'} },
  ],
  '/admin/users': [
    { id:'usr_e1', name:'Awa Ndong', phone:'+241 06 12 34 56', role:'patient', isActive:true, createdAt:iso(300) },
    { id:'usr_e2', name:'Dr. Sylvie Mba', phone:'+241 06 10 20 30', role:'doctor', isActive:true, createdAt:iso(500) },
    { id:'usr_e3', name:'Jean-Marc Boussougou', phone:'+241 07 88 42 10', role:'courier', isActive:true, createdAt:iso(250) },
    { id:'usr_e4', name:'Pharmacie du Centre', phone:'+241 01 76 22 00', role:'partner_staff', isActive:true, createdAt:iso(600) },
    { id:'usr_e5', name:'Koffi Bantsantsa', phone:'+241 07 30 11 88', role:'patient', isActive:false, createdAt:iso(120) },
    { id:'usr_e6', name:'Admin MBOLO', phone:'+241 00 00 00 01', role:'admin', isActive:true, createdAt:iso(900) },
  ],
  '/pricing': [
    { id:'pr1', kind:'delivery_base', valueFcfa:1000, valueNum:null, updatedAt:iso(50), updatedBy:'admin' },
    { id:'pr2', kind:'delivery_per_km', valueFcfa:250, valueNum:null, updatedAt:iso(50), updatedBy:'admin' },
    { id:'pr3', kind:'service_fee', valueFcfa:500, valueNum:null, updatedAt:iso(50), updatedBy:'admin' },
    { id:'pr4', kind:'consultation_base_fee', valueFcfa:5000, valueNum:null, updatedAt:iso(50), updatedBy:'admin' },
    { id:'pr5', kind:'platform_commission_pct', valueFcfa:null, valueNum:'15', updatedAt:iso(50), updatedBy:'admin' },
    { id:'pr6', kind:'ride_base_fee', valueFcfa:1500, valueNum:null, updatedAt:iso(50), updatedBy:'admin' },
    { id:'pr7', kind:'ride_per_km', valueFcfa:300, valueNum:null, updatedAt:iso(50), updatedBy:'admin' },
  ],
};

const TOKEN = JSON.stringify({ id:'usr_admin', name:'Admin MBOLO', phone:'+241 00 00 00 01', role:'admin', token:'demo' });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 });

// intercepte l'API
await ctx.route('**/localhost:3000/**', (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname;
  const key = MOCKS[path] !== undefined ? path : Object.keys(MOCKS).find(k => path === k);
  const data = key !== undefined ? MOCKS[key] : (MOCKS[path] ?? []);
  route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ data }) });
});

const page = await ctx.newPage();
await page.addInitScript((t) => { localStorage.setItem('mbolo_admin_token', t); }, TOKEN);

const routes = [
  ['/', '02-dashboard'],
  ['/orders', '03-orders'],
  ['/pricing', '04-pricing'],
  ['/deliveries', '05-deliveries'],
  ['/rides', '06-rides'],
  ['/meals', '07-meals'],
  ['/doctors', '08-doctors'],
  ['/users', '09-users'],
];
for (const [r, file] of routes) {
  await page.goto(BASE + r, { waitUntil:'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${file}.png` });
  console.log('capturé', file);
}

// Login (sans token)
const ctx2 = await browser.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 });
const p2 = await ctx2.newPage();
await p2.goto(BASE + '/login', { waitUntil:'networkidle' });
await p2.waitForTimeout(400);
await p2.screenshot({ path: `${OUT}/01-login.png` });
console.log('capturé 01-login');

await browser.close();
console.log('OK');
