const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = process.env.ZELNANDO_STORE_PATH || path.join(DATA_DIR, "zelnando-store.json");

const initialStore = () => ({
  users: {},
  transfers: {},
  receipts: {},
  supportCases: {},
  ledger: [],
  counters: {
    transfer: 1000,
    receipt: 1000,
    support: 1000,
    ledger: 1000,
  },
});

const ensureStore = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(initialStore(), null, 2));
  }
};

const readStore = () => {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read Zelnando store: ${error.message}`);
  }
};

const writeStore = (store) => {
  ensureStore();
  const tempPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2));
  fs.renameSync(tempPath, STORE_PATH);
};

const now = () => new Date().toISOString();

const nextId = (store, type, prefix) => {
  store.counters[type] = (store.counters[type] || 1000) + 1;
  return `${prefix}-${store.counters[type]}`;
};

const withStore = (operation) => {
  const store = readStore();
  const result = operation(store);
  writeStore(store);
  return result;
};

const defaultUser = (phone) => ({
  phone,
  stage: "new",
  accountType: null,
  language: "en",
  kycStatus: "not_started",
  pinStatus: "demo_pin",
  pendingTransferId: null,
  lastTransferId: null,
  savedRecipients: {},
  createdAt: now(),
  updatedAt: now(),
});

const getOrCreateUser = (store, phone) => {
  if (!store.users[phone]) {
    store.users[phone] = defaultUser(phone);
    addLedgerEvent(store, "user_created", { phone });
  }
  return store.users[phone];
};

const updateUser = (phone, changes) =>
  withStore((store) => {
    const user = getOrCreateUser(store, phone);
    Object.assign(user, changes, { updatedAt: now() });
    addLedgerEvent(store, "user_updated", { phone, changes });
    return user;
  });

const getUser = (phone) =>
  withStore((store) => {
    const user = getOrCreateUser(store, phone);
    return { ...user };
  });

const addLedgerEvent = (store, type, data) => {
  const id = nextId(store, "ledger", "LED");
  store.ledger.push({
    id,
    type,
    data,
    createdAt: now(),
  });
  return id;
};

const createTransferQuote = (phone, transfer) =>
  withStore((store) => {
    const user = getOrCreateUser(store, phone);
    const id = nextId(store, "transfer", "ZLT");
    const amount = transfer.amount || 0;
    const fee = transfer.fee || 25;

    const record = {
      id,
      userPhone: phone,
      recipient: transfer.recipient || "recipient",
      amount,
      currency: transfer.currency || "HTG",
      fee,
      total: amount + fee,
      rail: transfer.rail || "MonCash",
      status: "awaiting_pin",
      createdAt: now(),
      updatedAt: now(),
    };

    store.transfers[id] = record;
    user.pendingTransferId = id;
    user.stage = "awaiting_pin";
    user.updatedAt = now();
    addLedgerEvent(store, "transfer_quoted", { transferId: id, phone });
    return { ...record };
  });

const approveTransfer = (phone, pin) =>
  withStore((store) => {
    const user = getOrCreateUser(store, phone);
    const transfer = user.pendingTransferId ? store.transfers[user.pendingTransferId] : null;

    if (!transfer) {
      user.stage = "new";
      user.updatedAt = now();
      return { error: "no_pending_transfer" };
    }

    transfer.status = "completed";
    transfer.approvedAt = now();
    transfer.updatedAt = now();
    transfer.approval = {
      method: "pin",
      pinLength: String(pin).length,
    };

    const receiptId = nextId(store, "receipt", "ZLN");
    const receipt = {
      id: receiptId,
      transferId: transfer.id,
      userPhone: phone,
      status: "issued",
      createdAt: now(),
    };

    store.receipts[receiptId] = receipt;
    transfer.receiptId = receiptId;
    user.pendingTransferId = null;
    user.lastTransferId = transfer.id;
    user.stage = "new";
    user.updatedAt = now();

    if (transfer.recipient) {
      user.savedRecipients[transfer.recipient.toLowerCase()] = {
        name: transfer.recipient,
        rail: transfer.rail,
        lastTransferId: transfer.id,
        updatedAt: now(),
      };
    }

    addLedgerEvent(store, "transfer_approved", { transferId: transfer.id, receiptId, phone });
    return { transfer: { ...transfer }, receipt: { ...receipt } };
  });

const latestTransfer = (phone) =>
  withStore((store) => {
    const user = getOrCreateUser(store, phone);
    const transfer = user.lastTransferId ? store.transfers[user.lastTransferId] : null;
    return transfer ? { ...transfer } : null;
  });

const readStoreSnapshot = () => readStore();

const createSupportCase = (phone, message) =>
  withStore((store) => {
    const user = getOrCreateUser(store, phone);
    const id = nextId(store, "support", "SUP");
    const supportCase = {
      id,
      userPhone: phone,
      message,
      status: "open",
      createdAt: now(),
      updatedAt: now(),
    };
    store.supportCases[id] = supportCase;
    user.stage = "new";
    user.updatedAt = now();
    addLedgerEvent(store, "support_case_created", { supportCaseId: id, phone });
    return { ...supportCase };
  });

module.exports = {
  STORE_PATH,
  approveTransfer,
  createSupportCase,
  createTransferQuote,
  getUser,
  latestTransfer,
  readStoreSnapshot,
  updateUser,
};
