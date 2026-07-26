require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./supabaseClient');

async function seedAdmin() {
  const { count, error: countErr } = await supabase
    .from('admin_users').select('*', { count: 'exact', head: true });
  if (countErr) throw countErr;
  if (count > 0) { console.log('Admin user already exists — skipping.'); return; }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.log('ADMIN_USERNAME / ADMIN_PASSWORD not set in .env — skipping admin seed.');
    return;
  }
  const hash = bcrypt.hashSync(password, 12);
  const { error } = await supabase.from('admin_users').insert({ username, password_hash: hash });
  if (error) throw error;
  console.log('Admin user created:', username);
}

async function seedPartners() {
  const { count, error: countErr } = await supabase
    .from('partners').select('*', { count: 'exact', head: true });
  if (countErr) throw countErr;
  if (count > 0) { console.log('Partners already seeded — skipping.'); return; }

  const partners = [
    { name: 'Covestro Elastomers', tagline: 'Polyurethane raw materials',
      description: "Manufacturer of polyurethane raw materials and elastomer systems used in cast elastomer, coating and adhesive formulations. Stansaq represents Covestro Elastomers' relevant product lines within its territory, supporting local rubber and elastomer processors with technical qualification and supply.",
      applications: 'Cast polyurethane elastomers\nCoating and lamination resins\nAdhesive and sealant raw materials' },
    { name: 'Alfapac AB', tagline: 'Industrial & protective films',
      description: "Swedish manufacturer of extruded industrial and protective films. Stansaq handles regional distribution and technical support for Alfapac's film ranges, matching gauge, width and chemistry to local converting and fabrication requirements.",
      applications: 'Surface protection film\nProcess and release film\nCustom-width roll stock' },
    { name: 'Polyvantis Specialty Films', tagline: 'Technical & specialty films',
      description: "Manufacturer of technical and specialty polymer films for construction, industrial and consumer applications. Stansaq represents Polyvantis' specialty film ranges to regional converters and fabricators.",
      applications: 'Technical construction films\nSpecialty optical and functional films\nCustom laminate substrates' },
    { name: 'Troester GmbH', tagline: 'Extrusion & processing machinery',
      description: 'German manufacturer of extrusion and processing lines for rubber and cable production. Stansaq manages equipment specification, quotation and after-sales coordination for Troester machinery in the region.',
      applications: 'Rubber extrusion lines\nCable insulation & jacketing lines\nCompounding and mixing systems' },
    { name: 'inPipe Sweden', tagline: 'Trenchless pipe rehabilitation',
      description: 'Swedish developer of cured-in-place pipe relining systems for sewer, stormwater and potable water infrastructure. Stansaq supports regional contractors with system specification, materials supply and installation guidance.',
      applications: 'Sewer & stormwater relining\nPotable water main rehabilitation\nIndustrial pipe rehabilitation' },
    { name: 'Tampo Services', tagline: 'Pad printing equipment & services',
      description: "Supplier of pad printing equipment and surface decoration services for industrial and consumer components. Stansaq represents Tampo Services' equipment range to regional manufacturers requiring in-house decoration capability.",
      applications: 'Pad printing machinery\nSurface decoration consumables\nApplication and process support' }
  ];

  const rows = partners.map((p, i) => ({ ...p, sort_order: i }));
  const { error } = await supabase.from('partners').insert(rows);
  if (error) throw error;
  console.log(`Seeded ${partners.length} partners.`);
}

(async () => {
  try {
    await seedAdmin();
    await seedPartners();
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  }
})();
