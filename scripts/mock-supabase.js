// MOCK for local logic-testing only. Mimics the subset of the real
// @supabase/supabase-js chainable query builder that routes/api.js and
// routes/admin.js actually use, backed by an in-memory store instead of
// a real Postgres database. This proves the route logic is internally
// consistent — it does NOT prove anything about a real Supabase project,
// real network behavior, real RLS enforcement, or real Storage behavior.

const tables = { admin_users: [], partners: [], products: [] };
let nextId = { admin_users: 1, partners: 1, products: 1 };
const storageFiles = new Map(); // filename -> buffer

function clone(row) { return row ? JSON.parse(JSON.stringify(row)) : row; }

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.mode = null; // 'select' | 'insert' | 'update' | 'delete'
    this.filters = [];
    this.payload = null;
    this.orders = [];
    this.limitN = null;
    this.wantSingle = null; // 'single' | 'maybeSingle'
    this.countOpt = null;
    this.selectAfterInsert = false;
  }
  select(cols, opts) {
    if (this.mode === null) this.mode = 'select';
    if (opts && opts.count) this.countOpt = opts;
    if (this.mode === 'insert') this.selectAfterInsert = true;
    return this;
  }
  insert(payload) { this.mode = 'insert'; this.payload = payload; return this; }
  update(payload) { this.mode = 'update'; this.payload = payload; return this; }
  delete() { this.mode = 'delete'; return this; }
  eq(col, val) { this.filters.push([col, String(val)]); return this; }
  order(col, opts) { this.orders.push([col, opts]); return this; }
  limit(n) { this.limitN = n; return this; }
  single() { this.wantSingle = 'single'; return this; }
  maybeSingle() { this.wantSingle = 'maybeSingle'; return this; }

  _matches(row) {
    return this.filters.every(([col, val]) => String(row[col]) === val);
  }

  _execute() {
    const store = tables[this.table];
    try {
      if (this.mode === 'select') {
        let rows = store.filter(r => this._matches(r)).map(clone);
        this.orders.forEach(([col, opts]) => {
          rows.sort((a, b) => (opts && opts.ascending === false ? b[col] - a[col] : a[col] - b[col]));
        });
        if (this.limitN != null) rows = rows.slice(0, this.limitN);
        if (this.countOpt) return { data: null, error: null, count: rows.length };
        if (this.wantSingle) return { data: rows[0] || null, error: null };
        return { data: rows, error: null };
      }
      if (this.mode === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = items.map(item => {
          const row = { id: nextId[this.table]++, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...item };
          store.push(row);
          return clone(row);
        });
        if (this.selectAfterInsert) {
          return this.wantSingle ? { data: inserted[0], error: null } : { data: inserted, error: null };
        }
        return { data: null, error: null };
      }
      if (this.mode === 'update') {
        const matched = store.filter(r => this._matches(r));
        matched.forEach(r => Object.assign(r, this.payload));
        return { data: null, error: null };
      }
      if (this.mode === 'delete') {
        const before = store.length;
        for (let i = store.length - 1; i >= 0; i--) {
          if (this._matches(store[i])) store.splice(i, 1);
        }
        return { data: null, error: null };
      }
      return { data: null, error: { message: 'Unhandled mock mode: ' + this.mode } };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }

  then(resolve, reject) {
    try { resolve(this._execute()); } catch (err) { reject(err); }
  }
}

class StorageBucket {
  constructor(bucket) { this.bucket = bucket; }
  async upload(filename, buffer) {
    storageFiles.set(filename, buffer);
    return { data: { path: filename }, error: null };
  }
  getPublicUrl(filename) {
    return { data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${this.bucket}/${filename}` } };
  }
  async remove(filenames) {
    filenames.forEach(f => storageFiles.delete(f));
    return { data: null, error: null };
  }
}

function createClient() {
  return {
    from(table) { return new QueryBuilder(table); },
    storage: { from(bucket) { return new StorageBucket(bucket); } }
  };
}

module.exports = { createClient, __mock: { tables, storageFiles } };
