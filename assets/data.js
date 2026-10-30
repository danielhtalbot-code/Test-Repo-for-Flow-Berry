/* Fictional demo data. Every pharmacy, grower, doctor, patient and product here is made up. */
(function () {
  const a = (base, rows) => rows.map(([ph, delta, stock]) => ({ ph, price: base + delta, stock }));

  window.MOCK = {
    fee: 1.99,
    pharmacies: [
      { id: "ph1", name: "Harbour Lane Pharmacy", suburb: "Surry Hills", mode: "Pickup or same-day courier" },
      { id: "ph2", name: "Westgate Community Pharmacy", suburb: "Parramatta", mode: "Pickup or same-day courier" },
      { id: "ph3", name: "Willoughby Road Pharmacy", suburb: "Chatswood", mode: "Pickup only" },
      { id: "ph4", name: "Coastline Pharmacy", suburb: "Newcastle", mode: "Pickup or next-day post" },
      { id: "ph5", name: "Escarpment Family Pharmacy", suburb: "Wollongong", mode: "Pickup or next-day post" },
      { id: "ph6", name: "Riverbend Pharmacy", suburb: "Penrith", mode: "Pickup or same-day courier" },
      { id: "ph7", name: "Tablelands Pharmacy", suburb: "Armidale", mode: "Next-day post" }
    ],
    // Licensed growers and sponsors. They sell to pharmacies only; patients never see these listings.
    growers: [
      { id: "g1", name: "Kestrel Valley Growers", region: "Southern Highlands NSW", licence: "ODC-DEMO-0141", status: "Verified", about: "Indoor-grown dried flower and oils, packed on site.", leadTime: "2 business days", minOrder: 5, delivers: "NSW and ACT" },
      { id: "g2", name: "Mallee Botanics", region: "Riverina NSW", licence: "ODC-DEMO-0277", status: "Verified", about: "Greenhouse dried flower, CBD oils and pastilles.", leadTime: "3 business days", minOrder: 6, delivers: "NSW, ACT and VIC" },
      { id: "g3", name: "Blue Gum Therapeutics", region: "Hunter Valley NSW", licence: "ODC-DEMO-0318", status: "Verified", about: "Pastilles and capsules made from its own crop.", leadTime: "Next business day", minOrder: 10, delivers: "NSW" },
      { id: "g4", name: "Coral Coast Pharma", region: "Gold Coast QLD (sponsor)", licence: "ODC-DEMO-0402", status: "Documents due", about: "Sponsor supplying dried flower and oils into NSW.", leadTime: "4 business days", minOrder: 5, delivers: "QLD and NSW" }
    ],
    // trade = price a pharmacy pays the grower per unit, ex GST. units = grower stock on hand.
    products: [
      { id: "p1", name: "Kestrel K22 Flower", grower: "g1", form: "Dried flower", pack: "10 g", strength: "THC 22%, CBD under 0.3%", category: 5, schedule: "S8", trade: 74, units: 140, batch: "K22-2609-A", expiry: "Sep 2027" },
      { id: "p2", name: "Kestrel Balance Oil 10:10", grower: "g1", form: "Oral oil", pack: "25 mL", strength: "THC 10 mg/mL, CBD 10 mg/mL", category: 3, schedule: "S8", trade: 107, units: 60, batch: "KBO-2608-C", expiry: "Aug 2027" },
      { id: "p3", name: "Kestrel K14 Flower", grower: "g1", form: "Dried flower", pack: "10 g", strength: "THC 14%, CBD 8%", category: 4, schedule: "S8", trade: 69, units: 18, batch: "K14-2609-B", expiry: "Sep 2027" },
      { id: "p4", name: "Mallee CBD 100 Oil", grower: "g2", form: "Oral oil", pack: "25 mL", strength: "CBD 100 mg/mL", category: 1, schedule: "S4", trade: 98, units: 85, batch: "MCB-2607-A", expiry: "Jul 2027" },
      { id: "p5", name: "Mallee M18 Flower", grower: "g2", form: "Dried flower", pack: "15 g", strength: "THC 18%, CBD under 0.3%", category: 5, schedule: "S8", trade: 86, units: 40, batch: "M18-2610-A", expiry: "Oct 2027" },
      { id: "p6", name: "Mallee CBD 25 Pastilles", grower: "g2", form: "Pastille", pack: "30 pastilles", strength: "CBD 25 mg per pastille", category: 1, schedule: "S4", trade: 57, units: 120, batch: "MCP-2608-B", expiry: "Feb 2028" },
      { id: "p7", name: "Blue Gum Pastilles 5:5", grower: "g3", form: "Pastille", pack: "30 pastilles", strength: "THC 5 mg, CBD 5 mg per pastille", category: 3, schedule: "S8", trade: 77, units: 30, batch: "BGP-2609-A", expiry: "Mar 2028" },
      { id: "p8", name: "Blue Gum CBD 50 Capsules", grower: "g3", form: "Capsule", pack: "60 capsules", strength: "CBD 50 mg per capsule", category: 1, schedule: "S4", trade: 92, units: 75, batch: "BGC-2607-C", expiry: "Jan 2028" },
      { id: "p9", name: "Coral Coast C25 Flower", grower: "g4", form: "Dried flower", pack: "10 g", strength: "THC 25%, CBD under 0.3%", category: 5, schedule: "S8", trade: 81, units: 12, batch: "C25-2608-A", expiry: "Aug 2027" },
      { id: "p10", name: "Coral Coast 1:20 Oil", grower: "g4", form: "Oral oil", pack: "30 mL", strength: "THC 1 mg/mL, CBD 20 mg/mL", category: 2, schedule: "S8", trade: 102, units: 0, batch: "C120-2606-B", expiry: "Jun 2027" }
    ],
    // Which pharmacies list each product, at their own retail price
    availability: {
      p1: a(128, [["ph1", 0, "In stock"], ["ph2", 6, "In stock"], ["ph3", -4, "Low stock"], ["ph5", 9, "In stock"], ["ph7", 2, "Ships in 2 days"]]),
      p2: a(185, [["ph1", 0, "In stock"], ["ph2", -6, "In stock"], ["ph4", 4, "In stock"], ["ph6", -2, "Low stock"]]),
      p3: a(119, [["ph1", 0, "In stock"], ["ph3", 3, "In stock"], ["ph6", -5, "In stock"]]),
      p4: a(169, [["ph1", 6, "In stock"], ["ph2", 0, "In stock"], ["ph4", -4, "Low stock"], ["ph5", 2, "In stock"], ["ph7", 8, "In stock"]]),
      p5: a(149, [["ph2", 0, "In stock"], ["ph4", 7, "In stock"], ["ph6", -3, "Ships in 2 days"]]),
      p6: a(98, [["ph1", 0, "In stock"], ["ph3", 4, "In stock"], ["ph5", -2, "In stock"]]),
      p7: a(132, [["ph1", 0, "Low stock"], ["ph2", 5, "In stock"], ["ph6", -3, "In stock"], ["ph7", 6, "In stock"]]),
      p8: a(158, [["ph3", 0, "In stock"], ["ph4", 6, "In stock"]]),
      p9: a(139, [["ph1", 0, "In stock"], ["ph2", -4, "In stock"], ["ph5", 5, "Low stock"], ["ph6", 2, "In stock"]]),
      p10: a(176, [["ph2", 0, "In stock"], ["ph3", 7, "In stock"], ["ph4", -3, "In stock"]])
    },
    // Harbour Lane Pharmacy's order queue (pseudonymous patient references only)
    orders: [
      { id: "FB-10431", ref: "Patient 4821", product: "p2", time: "9:12 am", mode: "Same-day courier", status: "checking" },
      { id: "FB-10430", ref: "Patient 7706", product: "p1", time: "8:57 am", mode: "Pickup", status: "new" },
      { id: "FB-10428", ref: "Patient 3190", product: "p9", time: "8:31 am", mode: "Same-day courier", status: "new" },
      { id: "FB-10425", ref: "Patient 5517", product: "p6", time: "8:02 am", mode: "Pickup", status: "checking" },
      { id: "FB-10422", ref: "Patient 2264", product: "p3", time: "Yesterday", mode: "Pickup", status: "ready" },
      { id: "FB-10419", ref: "Patient 8842", product: "p7", time: "Yesterday", mode: "Same-day courier", status: "ready" },
      { id: "FB-10416", ref: "Patient 1937", product: "p4", time: "Yesterday", mode: "Same-day courier", status: "done" }
    ],
    // Pharmacy-to-grower stock orders, newest first
    stockOrders: [
      { po: "PO-2214", ph: "ph2", product: "p1", qty: 20, status: "Requested" },
      { po: "PO-2212", ph: "ph4", product: "p4", qty: 12, status: "Requested" },
      { po: "PO-2211", ph: "ph6", product: "p3", qty: 12, status: "Requested" },
      { po: "PO-2209", ph: "ph3", product: "p8", qty: 10, status: "Confirmed" },
      { po: "PO-2207", ph: "ph1", product: "p2", qty: 16, status: "Confirmed" },
      { po: "PO-2205", ph: "ph5", product: "p9", qty: 8, status: "Dispatched" },
      { po: "PO-2203", ph: "ph1", product: "p6", qty: 12, status: "Dispatched" },
      { po: "PO-2201", ph: "ph5", product: "p1", qty: 10, status: "Dispatched" }
    ],
    verification: [
      { name: "Dr Tom Becker", type: "Doctor", check: "AHPRA registration", status: "Checking" },
      { name: "Riverbend Pharmacy", type: "Pharmacy", check: "Pharmacy approval and pharmacist registration", status: "Checking" },
      { name: "Coral Coast Pharma", type: "Grower", check: "Licence renewal documents", status: "Needs documents" },
      { name: "Dr Leah Morgan", type: "Doctor", check: "Identity", status: "Approved" }
    ],
    safety: [
      { type: "Adverse event report", product: "p7", route: "Prescriber, pharmacy and sponsor notified; TGA report drafted", status: "Open" },
      { type: "Quality complaint", product: "p1", route: "Kestrel Valley Growers", status: "With grower" },
      { type: "Recall", product: "p5", batch: "M18-2605-B", reason: "Labelling error", route: "3 pharmacies and 11 doctors notified", status: "Closed" }
    ],
    // Base-case projection used in the pitch deck: paid orders a day, months 1-12
    trend: [4.7, 8.0, 12.0, 16.7, 22.0, 28.0, 34.6, 40.7, 47.0, 53.5, 60.1, 67.0],
    kpi: { paidPerDay: 67, livePharmacies: 48, activeDoctors: 61, feesMonth: 3683 }
  };
})();
