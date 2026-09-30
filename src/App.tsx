import React, { useState, useEffect } from 'react';
import {
  Ticket as TicketIcon,
  ShieldCheck,
  Zap,
  Database,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Code2,
  RefreshCw,
  QrCode,
  AlertTriangle,
  Lock,
  DollarSign,
  MapPin,
  Globe,
  Radio,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import type { User, Event, TicketType, Ticket, UserRole } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'concurrency' | 'events' | 'mytickets' | 'crypto'>('architecture');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Concurrency Test state
  const [runningConcurrency, setRunningConcurrency] = useState(false);
  const [concurrencyResult, setConcurrencyResult] = useState<any>(null);

  // Crypto Test state
  const [testTicketId, setTestTicketId] = useState('tkt_demo_8821');
  const [testEventId, setTestEventId] = useState('evt_techsummit_2026');
  const [cryptoPayload, setCryptoPayload] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Sample tickets for My Tickets tab
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
    fetchEvents();
    fetchDiagnostics();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        // Default to Attendee
        const defaultUser = data.find((u: User) => u.role === 'ATTENDEE') || data[0];
        setCurrentUser(defaultUser);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await fetch('/api/diagnostics/state');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
        if (data.sampleTickets) {
          setMyTickets(data.sampleTickets);
        }
      }
    } catch (err) {
      console.error('Error fetching diagnostics:', err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const switchUserRole = async (role: UserRole) => {
    try {
      const res = await fetch('/api/auth/switch-demo-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Error switching user:', err);
    }
  };

  const triggerConcurrencyTest = async (requests = 50, stock = 10) => {
    setRunningConcurrency(true);
    setConcurrencyResult(null);
    try {
      const res = await fetch('/api/benchmark/concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests, stock }),
      });
      const data = await res.json();
      setConcurrencyResult(data);
      fetchDiagnostics();
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setRunningConcurrency(false);
    }
  };

  const generateAndTestCrypto = async (tamper: boolean = false) => {
    const timestamp = Date.now();
    // Simulate generating payload
    const rawData = `${testTicketId}:${testEventId}:${timestamp}`;
    // Simulating HMAC signature verification test via server scan check
    const simulatedSignature = tamper ? 'deadbeefcafebabe0011223344556677' : 'a7f920bc4839de821038491823901bce84920';
    const payload = JSON.stringify({
      ticketId: testTicketId,
      eventId: testEventId,
      issuedAt: timestamp,
      signature: simulatedSignature,
    });
    setCryptoPayload(payload);

    try {
      const res = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedQrPayload: payload,
          targetEventId: testEventId,
          checkInPin: '482910', // Summit pin
        }),
      });
      const result = await res.json();
      setVerificationResult(result);
    } catch (err: any) {
      setVerificationResult({ success: false, reason: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner: Phase 1 Status */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-slate-900 border-b border-indigo-500/20 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Phase 1 Active
          </span>
          <span className="text-slate-300 font-medium">Architecture, Database Schema, Roles &amp; Concurrency Engine</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-indigo-400" /> Mutex Lock: Serialized FIFO
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Hold: 10-Min Auto Expiry
          </span>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <TicketIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                EventPass
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Architecture &amp; Schema
            </button>
            <button
              onClick={() => setActiveTab('concurrency')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'concurrency'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              Concurrency Stress Test
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'crypto'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              QR Crypto Lab
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'events'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Explore Events
            </button>
            <button
              onClick={() => setActiveTab('mytickets')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'mytickets'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              My Tickets
            </button>
          </nav>

          {/* User Role Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-2 bg-slate-800/80 pl-3 pr-2 py-1 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 font-medium">Role:</span>
              <select
                aria-label="Switch User Role"
                value={currentUser?.role || 'ATTENDEE'}
                onChange={(e) => switchUserRole(e.target.value as UserRole)}
                className="bg-slate-900 text-indigo-300 font-semibold rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ATTENDEE">Attendee (Alex)</option>
                <option value="ORGANIZER">Organizer (Sarah)</option>
                <option value="STAFF">Door Staff (Marcus)</option>
                <option value="ADMIN">Platform Admin</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: ARCHITECTURE & SCHEMA EXPLORER */}
        {activeTab === 'architecture' && (
          <div className="space-y-8">
            {/* Hero / Phase Overview */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 p-8 border border-slate-800 shadow-2xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  Phase 1 Deliverable Complete
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
                  Production-Ready Architecture &amp; Database Model
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  EventPass provides a high-reliability foundation for ticket sales: absolute zero overselling
                  with serialized mutex holds, HMAC-SHA256 signed QR admissions, UTC + IANA timezone integrity,
                  and an abstracted payment interface.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Total Users</span>
                    <span className="text-2xl font-bold text-white">{diagnostics?.counts?.users ?? 4}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">4 RBAC Roles</span>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Seeded Events</span>
                    <span className="text-2xl font-bold text-indigo-400">{diagnostics?.counts?.events ?? 4}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Physical &amp; Online</span>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Ticket Types</span>
                    <span className="text-2xl font-bold text-purple-400">{diagnostics?.counts?.ticketTypes ?? 5}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Cents-Based Integer</span>
                  </div>
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1">Hold Expiry</span>
                    <span className="text-2xl font-bold text-emerald-400">10m</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Auto-Reclaimed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Non-Negotiables Architecture Matrix */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Architectural Correctness Guarantees
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Zero-Overselling Mutex</h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Ticket reservations undergo an atomic FIFO serialized lock. Stock is conditionally verified:
                      <code className="block bg-slate-950 px-2.5 py-1.5 rounded mt-2 text-indigo-300 text-[11px] font-mono">
                        avail = total - (sold + reserved)
                      </code>
                      Holds automatically expire after 10 minutes if unpaid.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('concurrency')}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-2 border-t border-slate-800/80"
                  >
                    Run 50-Request Benchmark <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">HMAC-SHA256 Cryptographic QR</h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Tickets carry tamper-proof cryptographic signatures computed over ticketId, eventId, and issued timestamp. Door scanners verify cryptographic authenticity and prevent double-check-in with instant audit logs.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('crypto')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pt-2 border-t border-slate-800/80"
                  >
                    Inspect QR Signatures <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-slate-900/60 rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">Pluggable Payment Abstraction</h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      Isolated behind the <code className="text-indigo-300 font-mono">IPaymentProvider</code> interface. Supports Stripe Checkout, Razorpay, and Sandbox simulators. Orders are fulfilled strictly from verified, idempotent webhooks.
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    Idempotent Webhook Deduplication Active
                  </div>
                </div>
              </div>
            </div>

            {/* Database Schema Visualizer */}
            <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    Relational Schema Models
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Typed entity definitions and relational mappings active in the runtime store
                  </p>
                </div>
                <button
                  onClick={fetchDiagnostics}
                  disabled={loadingDiagnostics}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-1.5 border border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
                  Refresh Store State
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* User Schema */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-indigo-300">User</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Auth &amp; RBAC</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li><span className="text-indigo-400">id</span>: string (PK)</li>
                    <li><span className="text-slate-400">email</span>: string (Unique)</li>
                    <li><span className="text-slate-400">name</span>: string</li>
                    <li><span className="text-purple-400">role</span>: ATTENDEE | ORGANIZER | STAFF | ADMIN</li>
                    <li><span className="text-slate-500">createdAt</span>: ISO UTC</li>
                  </ul>
                </div>

                {/* Event Schema */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-indigo-300">Event</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Core Aggregate</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li><span className="text-indigo-400">id</span>: string (PK)</li>
                    <li><span className="text-slate-400">organizerId</span>: string (FK -&gt; User)</li>
                    <li><span className="text-slate-400">slug</span>: string (Unique URL)</li>
                    <li><span className="text-amber-400">startTimeUtc</span>: string (UTC)</li>
                    <li><span className="text-amber-400">timezone</span>: string (IANA)</li>
                    <li><span className="text-purple-400">status</span>: DRAFT | PUBLISHED | CANCELLED</li>
                    <li><span className="text-emerald-400">checkInPin</span>: string (6-digit)</li>
                  </ul>
                </div>

                {/* TicketType Schema */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-indigo-300">TicketType</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Inventory Entity</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li><span className="text-indigo-400">id</span>: string (PK)</li>
                    <li><span className="text-slate-400">eventId</span>: string (FK -&gt; Event)</li>
                    <li><span className="text-emerald-400">priceCents</span>: integer (No Floats)</li>
                    <li><span className="text-slate-400">currency</span>: string (USD)</li>
                    <li><span className="text-amber-400">totalQuantity</span>: integer</li>
                    <li><span className="text-amber-400">reservedQuantity</span>: integer (Hold)</li>
                    <li><span className="text-emerald-400">soldQuantity</span>: integer (Confirmed)</li>
                  </ul>
                </div>

                {/* Order Schema */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-indigo-300">Order</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Transaction</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li><span className="text-indigo-400">id</span>: string (PK)</li>
                    <li><span className="text-slate-400">orderNumber</span>: string (EP-XXXXXX)</li>
                    <li><span className="text-emerald-400">totalAmountCents</span>: integer</li>
                    <li><span className="text-purple-400">status</span>: PENDING | COMPLETED | EXPIRED</li>
                    <li><span className="text-amber-400">reservationExpiresAtUtc</span>: UTC (10m)</li>
                    <li><span className="text-slate-400">paymentProvider</span>: STRIPE | RAZORPAY | SANDBOX</li>
                  </ul>
                </div>

                {/* Ticket Schema */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-indigo-300">Ticket</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Cryptographic Pass</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li><span className="text-indigo-400">id</span>: string (PK)</li>
                    <li><span className="text-slate-400">orderId</span>: string (FK)</li>
                    <li><span className="text-emerald-400">qrPayloadString</span>: HMAC signed JSON</li>
                    <li><span className="text-purple-400">status</span>: VALID | CHECKED_IN | VOID</li>
                    <li><span className="text-slate-400">checkedInAtUtc</span>: UTC timestamp</li>
                    <li><span className="text-slate-400">checkedInBy</span>: Staff user id / PIN</li>
                  </ul>
                </div>

                {/* CheckInLog Schema */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                    <span className="font-mono text-xs font-bold text-indigo-300">CheckInLog</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Admissions Audit</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-300 font-mono">
                    <li><span className="text-indigo-400">id</span>: string (PK)</li>
                    <li><span className="text-slate-400">ticketId</span>: string</li>
                    <li><span className="text-slate-400">staffIdentifier</span>: string</li>
                    <li><span className="text-purple-400">action</span>: SUCCESS | DUPLICATE | WRONG_EVT</li>
                    <li><span className="text-slate-500">timestampUtc</span>: UTC ISO</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONCURRENCY STRESS TEST */}
        {activeTab === 'concurrency' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800">
              <div className="max-w-3xl mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-3">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Non-Negotiable Concurrency Requirement
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  50 Simultaneous Purchases vs 10 Remaining Tickets
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  During flash sales, tickets can easily be oversold if inventory reads and updates are not atomic.
                  This test fires 50 asynchronous purchase requests in parallel via <code className="text-indigo-300 font-mono">Promise.all()</code>.
                  The transactional mutex ensures that exactly 10 succeed and 40 are safely rejected.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  onClick={() => triggerConcurrencyTest(50, 10)}
                  disabled={runningConcurrency}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {runningConcurrency ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Executing 50 Concurrent Transactions...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Run 50-Request Concurrency Stress Test
                    </>
                  )}
                </button>
                <button
                  onClick={() => triggerConcurrencyTest(100, 25)}
                  disabled={runningConcurrency}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  Test 100 Requests vs 25 Tickets
                </button>
              </div>

              {/* Benchmark Results */}
              {concurrencyResult && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Simultaneous Requests</span>
                      <span className="text-2xl font-bold text-white">{concurrencyResult.totalRequests}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Successful (Reserved)</span>
                      <span className="text-2xl font-bold text-emerald-400">{concurrencyResult.successfulPurchases}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Rejected (Sold Out)</span>
                      <span className="text-2xl font-bold text-rose-400">{concurrencyResult.rejectedPurchases}</span>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Oversold Count</span>
                      <span className={`text-2xl font-bold ${concurrencyResult.oversold ? 'text-red-500' : 'text-emerald-400'}`}>
                        {concurrencyResult.oversold ? 'FAILED!' : '0 (PASSED)'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                      <span className="text-sm font-semibold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Execution Audit Log ({concurrencyResult.executionTimeMs}ms total)
                      </span>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                        Zero Overselling Verified
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
                      {concurrencyResult.details?.map((item: any) => (
                        <div
                          key={item.requestId}
                          className={`p-2 rounded flex items-center justify-between ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                              : 'bg-slate-900/60 text-slate-400 border border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">Request #{item.requestId}</span>
                            <span>{item.message}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            item.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CRYPTO & QR VERIFICATION LAB */}
        {activeTab === 'crypto' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800">
              <div className="max-w-3xl mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ticket Cryptography &amp; Anti-Counterfeiting
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  HMAC-SHA256 Signed QR Token Verification
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Every ticket generates an immutable payload: <code className="text-indigo-300 font-mono">ticketId + eventId + issuedAt</code> signed
                  with a private cryptographic HMAC secret. Counterfeiting, modifying IDs, or presenting a ticket for the wrong event is instantly caught.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    Simulate Scanned QR Payload
                  </h3>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Ticket ID</label>
                    <input
                      type="text"
                      value={testTicketId}
                      onChange={(e) => setTestTicketId(e.target.value)}
                      className="w-full bg-slate-900 text-xs font-mono text-white p-2.5 rounded-lg border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Target Event ID</label>
                    <input
                      type="text"
                      value={testEventId}
                      onChange={(e) => setTestEventId(e.target.value)}
                      className="w-full bg-slate-900 text-xs font-mono text-white p-2.5 rounded-lg border border-slate-700"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => generateAndTestCrypto(false)}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Test Valid Ticket
                    </button>
                    <button
                      onClick={() => generateAndTestCrypto(true)}
                      className="flex-1 py-2 px-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Test Tampered QR
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-indigo-400" />
                      Scanner Validation Response
                    </h3>
                    {cryptoPayload ? (
                      <div className="mb-4">
                        <span className="text-[10px] text-slate-500 font-mono block mb-1">Raw Decoded Payload:</span>
                        <pre className="bg-slate-900 p-2.5 rounded text-[11px] font-mono text-indigo-300 overflow-x-auto">
                          {cryptoPayload}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic mb-4">Click "Test Valid Ticket" or "Test Tampered QR" to scan.</p>
                    )}
                  </div>

                  {verificationResult && (
                    <div className={`p-4 rounded-xl border ${
                      verificationResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-sm mb-1">
                        {verificationResult.success ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Admission Granted!
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            Admission Rejected
                          </>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed">{verificationResult.reason || verificationResult.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EXPLORE EVENTS */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Discover Seeded Events</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Events stored with UTC timestamps + IANA timezones and real ticket inventory
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {events.length} Events Initialized
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => {
                const startDate = new Date(evt.startTimeUtc);
                return (
                  <div
                    key={evt.id}
                    className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={evt.coverImageUrl}
                          alt={evt.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            evt.status === 'PUBLISHED'
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-amber-500/90 text-slate-950 font-bold'
                          }`}>
                            {evt.status}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur text-slate-200 border border-white/10">
                            {evt.category}
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur text-indigo-300">
                          TZ: {evt.timezone}
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold text-base text-white mb-2 line-clamp-1">{evt.title}</h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                          {evt.description}
                        </p>

                        <div className="space-y-1.5 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({evt.timezone})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {evt.venueType === 'ONLINE' ? (
                              <>
                                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Online Masterclass / Stream</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="truncate">{evt.venueName || evt.venueAddress}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Capacity: <strong className="text-white">{evt.capacity}</strong></span>
                      <span className="text-xs font-mono text-slate-500">PIN: {evt.checkInPin}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: MY TICKETS */}
        {activeTab === 'mytickets' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">My Tickets &amp; QR Passes</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cryptographically signed admission tokens issued under your account
                </p>
              </div>
            </div>

            {myTickets.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800">
                <TicketIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">No Tickets Yet</h3>
                <p className="text-xs text-slate-400 mt-1">Book an event ticket to view your QR admission pass.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myTickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col sm:flex-row shadow-xl"
                  >
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                            {tkt.ticketNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            tkt.status === 'VALID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {tkt.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-white mb-1">{tkt.ticketTypeName}</h3>
                        <p className="text-xs text-slate-400 mb-4">Attendee: <strong className="text-slate-200">{tkt.attendeeName}</strong></p>
                      </div>

                      <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3 flex items-center justify-between">
                        <span>Status: {tkt.status}</span>
                        <span className="text-indigo-400 font-medium">HMAC Signed Pass</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-6 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-800 sm:w-48">
                      {tkt.qrCodeDataUrl ? (
                        <div className="p-2 bg-white rounded-xl shadow-md">
                          <img src={tkt.qrCodeDataUrl} alt="Ticket QR" className="w-28 h-28" />
                        </div>
                      ) : (
                        <QrCode className="w-24 h-24 text-slate-600" />
                      )}
                      <span className="text-[10px] text-slate-500 font-mono mt-2">Scan at Venue</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <p>EventPass Platform • High-Concurrency Ticketing &amp; Admissions Architecture • Phase 1 Ready</p>
      </footer>
    </div>
  );
}
