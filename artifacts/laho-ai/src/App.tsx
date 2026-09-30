import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, AudioLines, Award, BadgeCheck,
  Bell, Calendar, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, Copy,
  Download, Droplet, ExternalLink, FileText, HeartPulse, LockKeyhole, LogOut, MapPin,
  Menu, Navigation, Plus, QrCode, Radio, RefreshCw, Route as RouteIcon, Send, Share2,
  Shield, ShieldAlert, ShieldCheck, Signal, Sliders, Smartphone, Snowflake, Sparkles,
  Thermometer, Trophy, Users, Volume2, X, Zap,
} from 'lucide-react';
import {
  useHealthCheck, useGetDashboard, useGetInventory, useGetInventoryUnit,
  useCreateEmergencyRequest, useGetShipments, useRerouteShipment,
  useGetCreditLedger, useCreateCreditVoucher, useGetDeficits, useClaimDeficit,
  useGetImpactTimeline, useGetGuardianSettings, useUpdateGuardianSettings,
  useGetCommunities, useCreateCommunityDrive, useTranscribeEmergencyIntent,
  getGetDashboardQueryKey, getGetInventoryQueryKey, getGetShipmentsQueryKey,
  getGetCreditLedgerQueryKey, getGetDeficitsQueryKey, getGetImpactTimelineQueryKey,
  getGetGuardianSettingsQueryKey, getGetCommunitiesQueryKey,
  getGetInventoryUnitQueryKey,
} from '@workspace/api-client-react';
import type {
  Community, CreditEntry, DashboardSummary, Deficit, ImpactEvent, InventoryUnit, Shipment,
} from '@workspace/api-client-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  auth,
  signInWithGoogle,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  saveUserProfile,
  fetchUserProfile,
  type User,
  type UserProfile,
} from '@/lib/firebase';

const queryClient = new QueryClient();

const demoInventory = [
  { id: 'DEMO-BSU-041', bloodGroup: 'O−', collectedAt: '2025-04-12T08:20:00Z', expiresAt: '2025-05-24T08:20:00Z', daysRemaining: 4, origin: 'Kheri Rural BSU', temperatureC: 4.1, risk: 'watch', status: 'Available', temperatureLog: [{ recordedAt: '2025-05-19T06:00:00Z', temperatureC: 3.8 }, { recordedAt: '2025-05-19T12:00:00Z', temperatureC: 4.1 }, { recordedAt: '2025-05-19T18:00:00Z', temperatureC: 4.2 }] },
  { id: 'DEMO-BSU-056', bloodGroup: 'AB+', collectedAt: '2025-04-18T10:40:00Z', expiresAt: '2025-05-30T10:40:00Z', daysRemaining: 10, origin: 'Barabanki Storage Unit', temperatureC: 3.7, risk: 'safe', status: 'Available', temperatureLog: [{ recordedAt: '2025-05-19T06:00:00Z', temperatureC: 3.6 }, { recordedAt: '2025-05-19T12:00:00Z', temperatureC: 3.7 }] },
];
const demoShipments = [
  { id: 'DEMO-RLY-208', requestId: 'REQ-208', bloodGroup: 'O−', units: 2, origin: 'Kheri Rural BSU', destination: 'District Hospital, Sitapur', status: 'In transit', temperatureC: 4.0, stages: [{ label: 'Kheri BSU', status: 'complete', etaMinutes: 0 }, { label: 'Lucknow relay hub', status: 'active', etaMinutes: 18 }, { label: 'Sitapur district hospital', status: 'pending', etaMinutes: 61 }] },
  { id: 'DEMO-RLY-211', requestId: 'REQ-211', bloodGroup: 'B+', units: 1, origin: 'Ayodhya Storage Unit', destination: 'CHC, Rudauli', status: 'Awaiting transfer', temperatureC: 3.9, stages: [{ label: 'Ayodhya BSU', status: 'complete', etaMinutes: 0 }, { label: 'Bus relay', status: 'active', etaMinutes: 34 }, { label: 'CHC, Rudauli', status: 'pending', etaMinutes: 82 }] },
];
const demoCredits = [
  { id: 'DEMO-CR-018', clinic: 'CHC Maholi', bloodGroup: 'O−', units: 2, status: 'open', createdAt: '2025-05-18T13:20:00Z' },
  { id: 'DEMO-CR-013', clinic: 'PHC Sadr', bloodGroup: 'B+', units: 1, status: 'matched', createdAt: '2025-05-17T09:15:00Z' },
];
export interface GridDeficitItem extends Deficit {
  mapX: number;
  mapY: number;
  coarseRegion: string;
  category: 'district' | 'state' | 'rare';
}

const demoDeficits: GridDeficitItem[] = [
  {
    id: 'DEMO-DEF-01',
    story: 'Dantewada Rural BSU requires 1 unit of B-negative to settle a postpartum hemorrhage overdraft.',
    location: 'Dantewada Rural BSU',
    bloodGroup: 'B−',
    units: 1,
    distanceKm: 14.2,
    urgency: 'critical',
    expiresAt: '2026-10-01T19:00:00Z',
    donationHub: 'Dantewada District Hospital Hub',
    mapX: 28,
    mapY: 34,
    coarseRegion: 'Dantewada South',
    category: 'district',
  },
  {
    id: 'DEMO-DEF-02',
    story: 'Sitapur District Hospital requires 2 units of O-negative for urgent trauma surgery before evening transfer.',
    location: 'Sitapur District Hospital',
    bloodGroup: 'O−',
    units: 2,
    distanceKm: 8.4,
    urgency: 'critical',
    expiresAt: '2026-10-01T21:30:00Z',
    donationHub: 'District Blood Centre, Sitapur',
    mapX: 52,
    mapY: 48,
    coarseRegion: 'Sitapur Central',
    category: 'district',
  },
  {
    id: 'DEMO-DEF-03',
    story: 'CHC Maholi local reserve is below minimum threshold after a high-demand weekend.',
    location: 'CHC Maholi',
    bloodGroup: 'B+',
    units: 1,
    distanceKm: 16.2,
    urgency: 'urgent',
    expiresAt: '2026-10-02T12:00:00Z',
    donationHub: 'Maholi Community Health Centre',
    mapX: 68,
    mapY: 36,
    coarseRegion: 'Maholi West',
    category: 'district',
  },
  {
    id: 'DEMO-DEF-04',
    story: 'Bastar Health Post needs 1 unit of AB-negative to replenish snakebite emergency transfusion stock.',
    location: 'Bastar Health Post',
    bloodGroup: 'AB−',
    units: 1,
    distanceKm: 24.5,
    urgency: 'critical',
    expiresAt: '2026-10-02T15:00:00Z',
    donationHub: 'Jagdalpur Central Donation Hub',
    mapX: 36,
    mapY: 68,
    coarseRegion: 'Bastar Valley',
    category: 'state',
  },
  {
    id: 'DEMO-DEF-05',
    story: 'Rare subtype support requested for a regional care network. Only coarse location is shared.',
    location: 'Awadh Regional Network',
    bloodGroup: 'Bombay (hh)',
    units: 1,
    distanceKm: 31.8,
    urgency: 'urgent',
    expiresAt: '2026-10-02T20:00:00Z',
    donationHub: 'Lucknow Regional Blood Centre',
    mapX: 76,
    mapY: 62,
    coarseRegion: 'Awadh Ring',
    category: 'rare',
  },
  {
    id: 'DEMO-DEF-06',
    story: 'Kheri Rural BSU scheduled emergency caesarean section reserve facing depletion.',
    location: 'Kheri Rural BSU',
    bloodGroup: 'O−',
    units: 2,
    distanceKm: 18.9,
    urgency: 'urgent',
    expiresAt: '2026-10-03T08:00:00Z',
    donationHub: 'Kheri District Blood Bank',
    mapX: 44,
    mapY: 20,
    coarseRegion: 'Kheri North',
    category: 'state',
  },
];

export interface DetailedJourney {
  id: string;
  batchCode: string;
  units: number;
  bloodGroup: string;
  donationDate: string;
  donationHub: string;
  recipientClinic: string;
  clinicalProcedure: string;
  status: string;
  certificateHash: string;
  timeline: {
    time: string;
    title: string;
    detail: string;
    badge: string;
    temp?: string;
  }[];
}

const detailedJourneys: DetailedJourney[] = [
  {
    id: 'JOURNEY-BLR-01',
    batchCode: 'BLR-2026-904',
    units: 1,
    bloodGroup: 'O−',
    donationDate: 'August 24, 2026',
    donationHub: 'Bengaluru Central Hub',
    recipientClinic: 'Chamarajanagar CHC (Rural Karnataka)',
    clinicalProcedure: 'Postpartum hemorrhage emergency overdraft settled',
    status: 'Settled & Life Preserved',
    certificateHash: '0x8f4c2b9a71e3d09a245f861bce29034f51e8a931d4e782bc991a0f5',
    timeline: [
      {
        time: 'August 24, 2:00 PM',
        title: 'Donation Completed at Hub',
        detail: 'You donated 1 Unit of O-Negative at Bengaluru Hub. Cold-chain custody initiated; telemetry calibrated at 3.8°C.',
        badge: 'Hub Custody',
        temp: '3.8°C',
      },
      {
        time: 'August 24, 6:00 PM',
        title: 'Matched to Village Emergency Credit',
        detail: 'Your unit was matched to an active Emergency Credit requested by a village clinic in rural Karnataka (Chamarajanagar CHC).',
        badge: 'Relay En Route',
        temp: '3.9°C',
      },
      {
        time: 'August 25, 9:00 AM',
        title: 'Status Update: Used in Emergency Surgery',
        detail: 'Your unit successfully cleared the clinic\'s overdraft and was used in surgery. Spoilage rate: 0.00%. Life preserved.',
        badge: 'Cleared & Transfused',
        temp: '4.0°C',
      },
    ],
  },
  {
    id: 'JOURNEY-STP-02',
    batchCode: 'STP-2026-412',
    units: 1,
    bloodGroup: 'O−',
    donationDate: 'May 12, 2026',
    donationHub: 'Sitapur District Blood Centre',
    recipientClinic: 'Kheri Rural BSU',
    clinicalProcedure: 'Acute trauma stabilization and relay reserve replenishment',
    status: 'Settled & Life Preserved',
    certificateHash: '0x3a7e910c558b42fd91c28f9a0021b748e583199ce5b2149df28a71b',
    timeline: [
      {
        time: 'May 12, 10:30 AM',
        title: 'Donation Verified',
        detail: 'You donated 1 Unit of O-Negative at Sitapur District Blood Centre. Cold-chain thermal seal verified.',
        badge: 'Hub Custody',
        temp: '3.6°C',
      },
      {
        time: 'May 12, 2:45 PM',
        title: 'Multimodal Transit Hand-off',
        detail: 'Relayed via rural bus-to-drone transfer box #RLY-208 across 42 km of unpaved road corridor.',
        badge: 'Relay Hand-off',
        temp: '4.1°C',
      },
      {
        time: 'May 13, 8:15 AM',
        title: 'Emergency Overdraft Cleared',
        detail: 'Successfully transfused for acute hemorrhage. Clinic replacement credit fulfilled through regional partnership.',
        badge: 'Cleared & Transfused',
        temp: '3.9°C',
      },
    ],
  },
];

const demoImpact = [
  { id: 'DEMO-IMP-14', occurredAt: '2026-08-25T09:00:00Z', title: 'A local deficit was settled', detail: 'August 25, 9:00 AM: Your unit successfully cleared the Chamarajanagar clinic\'s overdraft and was used in surgery.', location: 'Rural Karnataka (Chamarajanagar)', bloodGroup: 'O−', status: 'Settled' },
  { id: 'DEMO-IMP-09', occurredAt: '2026-05-13T08:15:00Z', title: 'Your donation entered the network', detail: 'May 13, 8:15 AM: One unit of O− cleared the Kheri BSU emergency overdraft with 0% thermal spoilage.', location: 'Kheri Rural Care', bloodGroup: 'O−', status: 'Delivered' },
];

export interface MicroCommunity {
  id: string;
  name: string;
  category: string;
  members: number;
  deficitsSettled: number;
  wastagePreventedLiters: number;
  progressPercent: number;
  targetUnits: number;
  pledgedUnits: number;
  adoptedBsu: string;
  rank: number;
}

const demoCommunities: MicroCommunity[] = [
  { id: 'DEMO-COM-01', name: 'Infosys Tech Park Ring', category: 'Corporate Office', members: 248, deficitsSettled: 42, wastagePreventedLiters: 21.4, progressPercent: 84, targetUnits: 50, pledgedUnits: 42, adoptedBsu: 'Dantewada Rural BSU', rank: 1 },
  { id: 'DEMO-COM-02', name: 'IIT Bombay Red Cross Circle', category: 'University Club', members: 192, deficitsSettled: 36, wastagePreventedLiters: 18.0, progressPercent: 72, targetUnits: 50, pledgedUnits: 36, adoptedBsu: 'Bastar Health Post', rank: 2 },
  { id: 'DEMO-COM-03', name: 'Prestige Falcon Community', category: 'Housing Society', members: 115, deficitsSettled: 24, wastagePreventedLiters: 12.5, progressPercent: 60, targetUnits: 40, pledgedUnits: 24, adoptedBsu: 'Kheri Rural BSU', rank: 3 },
  { id: 'DEMO-COM-04', name: 'Sitapur Neighbourhood Network', category: 'Local Civic Group', members: 96, deficitsSettled: 19, wastagePreventedLiters: 9.8, progressPercent: 48, targetUnits: 40, pledgedUnits: 19, adoptedBsu: 'Maholi Community BSU', rank: 4 },
];
const bloodGroups = ['O−', 'O+', 'A−', 'A+', 'B−', 'B+', 'AB−', 'AB+', 'Bombay (hh)'];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/sign-in" component={AccountPage} />
            <Route path="/sign-in/worker" component={AccountPage} />
            <Route path="/sign-in/donor" component={AccountPage} />
            <Route path="/sign-up" component={AccountPage} />
            <Route path="/sign-up/worker" component={AccountPage} />
            <Route path="/sign-up/donor" component={AccountPage} />
            <Route path="/forgot-password" component={AccountPage} />
            <Route path="/worker" component={WorkerConsole} />
            <Route path="/workers" component={WorkerConsole} />
            <Route path="/donor" component={DonorConsole} />
            <Route path="/donors" component={DonorConsole} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" data-testid="link-home">
      <span className="brand-mark">
        <Droplet size={17} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span>
          Lahoo<span className="brand-dot">.ai</span>
        </span>
      )}
    </Link>
  );
}

function Landing() {
  const health = useHealthCheck();
  const [showSimulation, setShowSimulation] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const online = health.data?.status === 'ok' || health.data?.status === 'healthy';

  return (
    <main className="landing">
      <header className="topbar landing-nav">
        <Brand />
        <nav className="landing-links" aria-label="Primary">
          <a href="#grid" data-testid="link-logistics-grid">Logistics Grid</a>
          <a href="#exchange" data-testid="link-credit-exchange">Credit Exchange</a>
          <a href="#protocol" data-testid="link-documentation">Protocol</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <Link href="/sign-in" className="nav-signin" data-testid="link-sign-in">
              {user.displayName || user.email?.split('@')[0] || 'My Console'}
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link href="/sign-in/worker" className="button button-outline button-small" data-testid="link-worker-signin">
                <HeartPulse size={13} className="text-rose-400" /> Worker Sign In
              </Link>
              <Link href="/sign-in/donor" className="button button-soft button-small" data-testid="link-donor-signin">
                <Droplet size={13} className="text-rose-400" /> Donor Sign In
              </Link>
            </div>
          )}
          <Link href="/donors" className="button button-soft button-small" data-testid="link-donor-network">
            Donor network
          </Link>
          <Link href="/workers" className="button button-primary button-small" data-testid="link-launch-console">
            Worker console <ArrowRight size={14} />
          </Link>
          <Link href="/sign-in" className="user-circle" aria-label="Account" data-testid="link-account">
            <Users size={15} />
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-beacon">
          <span className="pulse-dot" /> GOOGLE CLOUD &amp; GEMINI ARCHITECTURE <span className="hero-divider">/</span> SOVEREIGN BLOOD GRID
        </div>
        <h1>
          Every drop, everywhere.<br />
          <span>Instantly.</span>
        </h1>
        <p className="hero-copy">
          Lahoo AI bridges India’s urban–rural divide to deliver lifesaving blood to remote villages in minutes.
          Healthcare workers coordinate cold-chain relays; voluntary donors settle rural grid deficits with zero clinical waste.
        </p>

        {/* Dual dedicated action routes for Healthcare Worker vs Donor/Volunteer */}
        <div className="hero-actions" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <Link href="/sign-in/worker" className="button button-primary" data-testid="link-hero-worker-route">
            <HeartPulse size={16} /> Healthcare Worker Access <ArrowRight size={15} />
          </Link>
          <Link href="/sign-in/donor" className="button button-soft" data-testid="link-hero-donor-route">
            <Droplet size={16} /> Donor / Volunteer Access <ArrowRight size={15} />
          </Link>
          <button
            className="button button-outline"
            onClick={() => setShowSimulation(!showSimulation)}
            data-testid="button-live-simulation"
          >
            <Radio size={16} /> {showSimulation ? 'Close live simulation' : 'Explore live simulation'}
          </button>
        </div>

        {showSimulation && (
          <div className="simulation-panel" data-testid="panel-live-simulation">
            <div className="signal-bars">
              <i /><i /><i /><i /><i />
            </div>
            <div>
              <strong>Network simulation</strong>
              <span>Rural BSU → bus relay → urban donor reserve</span>
            </div>
            <span className="telemetry-tag">DEMO FLOW</span>
          </div>
        )}

        <div className="hero-stats">
          <StatTile icon={<Clock3 />} label="AVG. DISPATCH" value="7.4" suffix="MIN" />
          <StatTile icon={<Users />} label="SOVEREIGN NODES" value="1,428" suffix="ACTIVE" />
          <StatTile icon={<Thermometer />} label="THERMAL INTEGRITY" value="99.98" suffix="%" />
          <StatTile icon={<Activity />} label="SPOILAGE RATE" value="0.00" suffix="%" />
        </div>
        <div className="hero-bottomline">
          <span>
            <i className={online ? 'pulse-dot green' : 'pulse-dot'} /> GRID PROTOCOL // V4.2.1{' '}
            {health.isLoading ? 'CHECKING' : online ? 'ONLINE' : 'STATUS UNAVAILABLE'}
          </span>
          <span>REGION: IN-CENTRAL-01 <b>·</b> GEMINI AUTONOMOUS ROUTING ENGAGED</span>
        </div>
      </section>
    <section className="landing-section network-section" id="grid"><div className="section-eyebrow">01 / A network with a pulse</div><div className="section-heading"><h2>One blood grid.<br /><em>Many ways to reach.</em></h2><p>Quiet infrastructure for the moments when distance matters. Every handoff, cold-chain reading and local need belongs to one shared system.</p></div><div className="network-visual"><div className="network-orbit orbit-one" /><div className="network-orbit orbit-two" /><div className="network-center"><Droplet size={28} /><small>SOVEREIGN<br />BLOOD GRID</small></div><div className="node node-a"><span /><b>Rural BSU</b><small>Kheri</small></div><div className="node node-b"><span /><b>Relay hub</b><small>Lucknow</small></div><div className="node node-c"><span /><b>District care</b><small>Sitapur</small></div><div className="route-line route-a" /><div className="route-line route-b" /></div><div className="network-caption"><span>LOCAL STOCK</span><span>BUS ↔ DRONE RELAY</span><span>CARE, CLOSER</span></div></section>
    <section className="landing-section exchange-section" id="exchange"><div className="exchange-copy"><div className="section-eyebrow">02 / Credit exchange</div><h2>When one clinic gives,<br /><em>the whole grid gains.</em></h2><p>Replacement-credit obligations travel with the blood, not the burden. A clear ledger lets rural clinics settle deficits through local partnerships and WhatsApp vouchers.</p><Link href="/worker" className="text-link" data-testid="link-explore-exchange">Explore the credit ledger <ArrowRight size={16} /></Link></div><div className="exchange-card"><div className="card-head"><span>GRID CREDIT / OPEN</span><span className="status-pill status-amber">AWAITING MATCH</span></div><div className="exchange-amount">02 <small>units · O−</small></div><div className="exchange-meta"><span>Origin clinic</span><strong>CHC Maholi</strong></div><div className="exchange-meta"><span>Network status</span><strong className="accent-text">Community match sought</strong></div><div className="voucher-preview"><div className="voucher-mark"><Zap size={15} /></div><div><b>WhatsApp replacement voucher</b><span>Shareable. Traceable. Locally settled.</span></div><ChevronRight size={16} /></div></div></section>
    <section className="protocol-strip" id="protocol"><div><ShieldCheck size={21} /><span><b>Patient privacy first</b><small>Clinical summary only. No patient names.</small></span></div><div><Snowflake size={21} /><span><b>Cold-chain aware</b><small>Batch telemetry from BSU to bedside.</small></span></div><div><Signal size={21} /><span><b>Built for the edge</b><small>Readable and usable on a low-cost phone.</small></span></div></section>
    <footer className="landing-footer"><Brand /><span>LOCAL SIGNAL. SHARED SOVEREIGNTY.</span><Link href="/sign-up" className="text-link" data-testid="link-join-network">Join the network <ArrowRight size={14} /></Link></footer>
  </main>
  );
}

function StatTile({ icon, label, value, suffix }: { icon: ReactNode; label: string; value: string; suffix: string }) {
  return <div className="stat-tile"><span className="stat-label">{icon}{label}</span><span className="stat-value">{value}<small>{suffix}</small></span></div>;
}

function AccountPage() {
  const [path, setLocation] = useLocation();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'worker' | 'donor'>('worker');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [facility, setFacility] = useState('Dantewada Rural BSU');
  const [designation, setDesignation] = useState('Medical Officer');
  const [bloodGroup, setBloodGroup] = useState('O−');
  const [city, setCity] = useState('Dantewada');

  const isSignUp = path === '/sign-up';
  const isForgot = path === '/forgot-password';
  const title = isForgot
    ? 'Reset access'
    : isSignUp
    ? `Register as ${selectedRole === 'worker' ? 'Healthcare Worker' : 'Donor / Volunteer'}`
    : `Sign in as ${selectedRole === 'worker' ? 'Healthcare Worker' : 'Donor / Volunteer'}`;

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      let profile = await fetchUserProfile(res.user.uid);
      if (!profile) {
        profile = {
          uid: res.user.uid,
          displayName: res.user.displayName || (selectedRole === 'worker' ? 'Dr. Healthcare Clinician' : 'Voluntary Donor'),
          email: res.user.email,
          role: selectedRole,
          facility: selectedRole === 'worker' ? facility : undefined,
          bloodGroup: selectedRole === 'donor' ? bloodGroup : undefined,
          city: city,
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(profile);
      }
      const destination = (profile.role || selectedRole) === 'worker' ? '/workers' : '/donors';
      setLocation(destination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.';
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Register new user with Firebase Auth
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
        const newProfile: UserProfile = {
          uid: res.user.uid,
          displayName: name,
          email: res.user.email,
          role: selectedRole,
          facility: selectedRole === 'worker' ? facility : undefined,
          bloodGroup: selectedRole === 'donor' ? bloodGroup : undefined,
          city: city,
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(newProfile);
        setLocation(selectedRole === 'worker' ? '/workers' : '/donors');
      } else {
        // Sign in existing user with Firebase Auth
        const res = await signInWithEmailAndPassword(auth, email, password);
        const profile = await fetchUserProfile(res.user.uid);
        const roleToUse = profile?.role || selectedRole;
        if (!profile) {
          await saveUserProfile({
            uid: res.user.uid,
            displayName: res.user.displayName || name || (selectedRole === 'worker' ? 'Healthcare Worker' : 'Local Donor'),
            email: res.user.email,
            role: roleToUse,
            facility: roleToUse === 'worker' ? facility : undefined,
            bloodGroup: roleToUse === 'donor' ? bloodGroup : undefined,
            city: city,
            createdAt: new Date().toISOString(),
          });
        }
        setLocation(roleToUse === 'worker' ? '/workers' : '/donors');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.';
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoWorker = async () => {
    const demoProfile: UserProfile = {
      uid: 'demo-worker-priya',
      displayName: 'Dr. Priya Sharma',
      email: 'dr.priya.sharma@dantewada.bsu.gov.in',
      role: 'worker',
      facility: 'Dantewada Rural BSU',
      city: 'Dantewada',
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(demoProfile);
    setLocation('/workers');
  };

  const handleQuickDemoDonor = async () => {
    const demoProfile: UserProfile = {
      uid: 'demo-donor-aarav',
      displayName: 'Aarav Patel',
      email: 'aarav.patel@gridvolunteer.org',
      role: 'donor',
      bloodGroup: 'O−',
      city: 'Bengaluru / Dantewada',
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(demoProfile);
    setLocation('/donors');
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <div className="account-layout">
      <div className="account-side">
        <Brand />
        <div className="account-manifest">
          <div className="section-eyebrow">SOVEREIGN BLOOD GRID / ACCESS</div>
          <h1>
            Care moves<br />
            at the speed<br />
            <em>of trust.</em>
          </h1>
          <p>
            Healthcare workers coordinate rural transfusions. Voluntary donors respond to regional deficits.
            Authenticated securely via Firebase Auth &amp; Google Cloud.
          </p>
          <div className="account-foot">
            <span className="pulse-dot" /> ENCRYPTED ROLE-BASED SESSIONS
          </div>
        </div>
      </div>

      <div className="account-main">
        <Link href="/" className="back-link" data-testid="link-back-home">
          <ArrowDownRight size={15} /> Back to Lahoo
        </Link>

        <div className="account-form-wrap">
          <div className="section-eyebrow">
            {isForgot ? 'ACCOUNT RECOVERY' : isSignUp ? 'SELECT ACCOUNT TYPE' : 'CHOOSE ACCESS ROLE'}
          </div>

          <h2>{title}</h2>
          <p className="account-subtitle">
            {isSignUp
              ? 'Register with your custom details to land in your dedicated operations console.'
              : 'Sign in to access your linked operations console with real-time Firebase telemetry.'}
          </p>

          {/* Role Selection Buttons (Healthcare Worker vs Donor/Volunteer) */}
          <div className="role-selector-grid" data-testid="role-selector">
            <button
              type="button"
              className={`role-choice-card ${selectedRole === 'worker' ? 'selected' : ''}`}
              onClick={() => {
                setSelectedRole('worker');
                if (!name) setName('Dr. Priya Sharma');
              }}
              data-testid="button-select-role-worker"
            >
              <div className="role-title">
                <HeartPulse size={15} className="text-rose-400" />
                <span>Healthcare Worker</span>
              </div>
              <div className="role-desc">
                Clinicians, BSU storage coordinators, and dispatchers managing rural cold-chain relays.
              </div>
            </button>

            <button
              type="button"
              className={`role-choice-card ${selectedRole === 'donor' ? 'selected' : ''}`}
              onClick={() => {
                setSelectedRole('donor');
                if (!name) setName('Aarav Patel');
              }}
              data-testid="button-select-role-donor"
            >
              <div className="role-title">
                <Droplet size={15} className="text-rose-400" />
                <span>Donor / Volunteer</span>
              </div>
              <div className="role-desc">
                Voluntary donors, rare-phenotype guardians, and community sovereignty rings.
              </div>
            </button>
          </div>

          {user ? (
            <div className="confirmation-box" data-testid="status-account-authenticated">
              <BadgeCheck size={26} className="text-emerald-500" />
              <div style={{ width: '100%' }}>
                <strong>Authenticated as {user.displayName || user.email}</strong>
                <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  Your Google identity is linked to the Sovereign Blood Grid. Select your target console:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <Link href="/workers" className="button button-primary button-small" data-testid="button-go-worker">
                    Healthcare worker console <ArrowRight size={14} />
                  </Link>
                  <Link href="/donors" className="button button-soft button-small" data-testid="button-go-donor">
                    Donor network <HeartPulse size={14} />
                  </Link>
                  <button onClick={handleSignOut} className="button button-outline button-small" data-testid="button-signout">
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Google Sign-In with Selected Role */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="button button-soft full-button"
                style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                data-testid="button-google-signin"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {loading
                  ? 'Connecting with Google…'
                  : `Continue with Google as ${selectedRole === 'worker' ? 'Healthcare Worker' : 'Donor / Volunteer'}`}
              </button>

              {authError && (
                <div className="notice notice-error" style={{ marginBottom: '1rem' }} data-testid="auth-error-notice">
                  {authError}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '0.75rem 0',
                  color: 'hsl(var(--muted-foreground))',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <span style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
                <span style={{ padding: '0 0.5rem' }}>or continue with credentials</span>
                <span style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} data-testid="form-account">
                {isSignUp && (
                  <label>
                    Full custom name
                    <input
                      required
                      autoComplete="name"
                      placeholder={selectedRole === 'worker' ? 'e.g. Dr. Priya Sharma' : 'e.g. Aarav Patel'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      data-testid="input-name"
                    />
                  </label>
                )}

                <label>
                  Email address
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={selectedRole === 'worker' ? 'clinician@hospital.org' : 'donor@community.org'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-email"
                  />
                </label>

                {!isForgot && (
                  <label>
                    Password
                    <input
                      type="password"
                      minLength={6}
                      required
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                  </label>
                )}

                {/* Role Specific Registration Fields */}
                {isSignUp && selectedRole === 'worker' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label>
                      Assigned Facility / BSU
                      <select
                        value={facility}
                        onChange={(e) => setFacility(e.target.value)}
                        data-testid="select-facility"
                      >
                        <option value="Dantewada Rural BSU">Dantewada Rural BSU</option>
                        <option value="Sitapur District Hospital">Sitapur District Hospital</option>
                        <option value="CHC Maholi">CHC Maholi</option>
                        <option value="Kheri Storage Node">Kheri Storage Node</option>
                        <option value="Jagdalpur Central Hub">Jagdalpur Central Hub</option>
                      </select>
                    </label>
                    <label>
                      Designation
                      <input
                        placeholder="Medical Officer"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        data-testid="input-designation"
                      />
                    </label>
                  </div>
                )}

                {isSignUp && selectedRole === 'donor' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label>
                      Blood Group
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        data-testid="select-blood-group"
                      >
                        <option value="O−">O− (Universal Red Cell)</option>
                        <option value="O+">O+</option>
                        <option value="A−">A−</option>
                        <option value="A+">A+</option>
                        <option value="B−">B−</option>
                        <option value="B+">B+</option>
                        <option value="AB−">AB−</option>
                        <option value="AB+">AB+ (Universal Plasma)</option>
                        <option value="Bombay (hh)">Bombay Phenotype (hh)</option>
                      </select>
                    </label>
                    <label>
                      District / City
                      <input
                        placeholder="e.g. Bengaluru / Dantewada"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        data-testid="input-city"
                      />
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="button button-primary full-button"
                  style={{ marginTop: '10px' }}
                  data-testid="button-account-submit"
                >
                  {loading
                    ? 'Authenticating…'
                    : isForgot
                    ? 'Send reset link'
                    : isSignUp
                    ? `Create ${selectedRole === 'worker' ? 'Healthcare Worker' : 'Donor'} Account`
                    : `Sign In as ${selectedRole === 'worker' ? 'Healthcare Worker' : 'Donor / Volunteer'}`}{' '}
                  <ArrowRight size={16} />
                </button>

                <div className="auth-ready">
                  <LockKeyhole size={14} /> Firebase Auth connected · Linked to Firestore users collection
                </div>
              </form>

              {/* 1-Click Quick Demo Sign-Ins */}
              <div style={{ marginTop: '24px', borderTop: '1px solid #2b2832', paddingTop: '16px' }}>
                <span style={{ fontSize: '10px', color: '#9d96a0', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ⚡ Quick Demo Access (Instant Profile Link)
                </span>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <button
                    type="button"
                    className="button button-outline button-small"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                    onClick={handleQuickDemoWorker}
                    data-testid="button-demo-worker"
                  >
                    <HeartPulse size={14} className="text-rose-400" />
                    <span>
                      Sign in as <strong>Dr. Priya Sharma</strong> (Healthcare Worker · Dantewada BSU)
                    </span>
                  </button>
                  <button
                    type="button"
                    className="button button-outline button-small"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                    onClick={handleQuickDemoDonor}
                    data-testid="button-demo-donor"
                  >
                    <Droplet size={14} className="text-rose-400" />
                    <span>
                      Sign in as <strong>Aarav Patel</strong> (O− Voluntary Donor &amp; Volunteer)
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="account-switch">
            {isSignUp ? (
              <>
                Already connected? <Link href="/sign-in" data-testid="link-switch-sign-in">Sign in</Link>
              </>
            ) : (
              <>
                New to the grid? <Link href="/sign-up" data-testid="link-switch-sign-up">Create an account</Link>
              </>
            )}
          </div>
        </div>

        <div className="account-privacy">
          <Shield size={14} /> Zero clinical identifiers disclosed · Firebase security rules enforced
        </div>
      </div>
    </div>
  );
}

type ConsoleRole = 'worker' | 'donor';

function ConsoleShell({
  role,
  active,
  children,
  onView,
}: {
  role: ConsoleRole;
  active: string;
  children: ReactNode;
  onView: (view: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [telemetry, setTelemetry] = useState(true);
  const [, setLocation] = useLocation();

  // Load authenticated user and profile
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('lahoo_user_profile');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) {
        const p = await fetchUserProfile(u.uid);
        if (p) setProfile(p);
      }
    });
  }, []);

  const nav =
    role === 'worker'
      ? [
          { id: 'dispatch', label: 'Voice dispatch', icon: <AudioLines size={17} /> },
          { id: 'cold-chain', label: 'Cold chain', icon: <Snowflake size={17} /> },
          { id: 'relay', label: 'Relay tracking', icon: <RouteIcon size={17} /> },
          { id: 'credits', label: 'Credit exchange', icon: <Zap size={17} /> },
        ]
      : [
          { id: 'needs', label: 'Grid Deficit Map', icon: <HeartPulse size={17} /> },
          { id: 'impact', label: 'Impact ledger', icon: <Activity size={17} /> },
          { id: 'guardian', label: 'Guardian Mode', icon: <Shield size={17} /> },
          { id: 'community', label: 'Sovereignty ring', icon: <Users size={17} /> },
        ];

  const switchView = (id: string) => {
    onView(id);
    setMobileOpen(false);
  };

  // Custom User Details
  const customName =
    profile?.displayName ||
    currentUser?.displayName ||
    (role === 'worker' ? 'Dr. Priya Sharma' : 'Aarav Patel');

  const initials =
    customName
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || (role === 'worker' ? 'PS' : 'AP');

  const facilitySubtitle =
    role === 'worker'
      ? profile?.facility || 'Dantewada Rural BSU'
      : profile?.bloodGroup
      ? `${profile.bloodGroup} Donor · ${profile.city || 'Central Grid'}`
      : 'O− Verified Donor · Awadh';

  const roleTitle = role === 'worker' ? 'Healthcare Clinician Node' : 'Voluntary Donor Node';

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('lahoo_user_profile');
    setLocation('/sign-in');
  };

  return (
    <div className="console-shell">
      <aside className={`console-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="side-brand">
          <Brand />
          <button
            className="icon-button close-mobile"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            data-testid="button-close-navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="side-workspace">
          <span className="workspace-icon">
            {role === 'worker' ? <HeartPulse size={16} /> : <Droplet size={16} />}
          </span>
          <span>
            <b>{role === 'worker' ? 'Care operations' : 'Donor network'}</b>
            <small>{facilitySubtitle.toUpperCase()}</small>
          </span>
          <ChevronDown size={14} />
        </div>

        <div className="side-label">WORKSPACE</div>

        <nav className="console-nav" aria-label={`${role} views`}>
          {nav.map((item) => (
            <button
              key={item.id}
              className={`side-link ${active === item.id ? 'selected' : ''}`}
              onClick={() => switchView(item.id)}
              data-testid={`nav-${item.id}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {active === item.id && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="network-state">
            <span className="pulse-dot green" />
            <div>
              <b>Firebase Auth Active</b>
              <small>Real-time Firestore linked</small>
            </div>
          </div>

          {/* User profile linked badge in sidebar */}
          <div className="side-role" data-testid="sidebar-user-role">
            <div className="role-avatar" title={customName}>
              {initials}
            </div>
            <div>
              <b>{customName}</b>
              <small>{facilitySubtitle}</small>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={handleSignOut}
              title="Sign out of account"
              style={{ marginLeft: 'auto', width: '26px', height: '26px' }}
              data-testid="button-sidebar-signout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <main className="console-main">
        <header className="console-top">
          <div className="top-left">
            <button
              className="icon-button menu-trigger"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              data-testid="button-open-navigation"
            >
              <Menu size={19} />
            </button>
            <div className="breadcrumb">
              Lahoo AI <ChevronRight size={13} />{' '}
              <b>{role === 'worker' ? 'Healthcare Operations' : 'Donor Network'}</b>
            </div>
          </div>

          <div className="top-right">
            <button
              className={`telemetry-toggle ${telemetry ? 'on' : ''}`}
              onClick={() => setTelemetry(!telemetry)}
              data-testid="button-telemetry-toggle"
            >
              <Activity size={15} />
              <span>Telemetry</span>
              <i />
            </button>

            {/* Custom Name Chip on Topbar */}
            <div className="user-chip-full" data-testid="topbar-user-chip">
              <span className="avatar-small">{initials}</span>
              <span style={{ fontWeight: 500 }}>{customName}</span>
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--app-font-mono)',
                  color: '#e58f8b',
                  background: '#2b1b20',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {role === 'worker' ? 'CLINICIAN' : 'DONOR'}
              </span>
            </div>

            <button
              className="icon-button"
              title="Sign out"
              onClick={handleSignOut}
              data-testid="button-topbar-signout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="console-content">
          {/* Welcome User Notification Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(23, 22, 28, 0.7)',
              border: '1px solid #2b2832',
              borderRadius: '7px',
              marginBottom: '18px',
              fontSize: '11px',
              color: '#c7c0c7',
              flexWrap: 'wrap',
              gap: '8px',
            }}
            data-testid="user-welcome-banner"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BadgeCheck size={16} className="text-emerald-400" />
              <span>
                Authenticated as <strong>{customName}</strong> · Assigned to{' '}
                <em style={{ color: '#e58e8a', fontStyle: 'normal' }}>{facilitySubtitle}</em>
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--app-font-mono)',
                fontSize: '9px',
                color: '#9d959f',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span className="pulse-dot green" /> {roleTitle.toUpperCase()}
            </span>
          </div>

          {children}
        </div>

        <nav className="mobile-tabs" aria-label="Mobile views">
          {nav.map((item) => (
            <button
              key={item.id}
              className={active === item.id ? 'active' : ''}
              onClick={() => switchView(item.id)}
              data-testid={`mobile-nav-${item.id}`}
            >
              {item.icon}
              <span>{item.label.split(' ')[0]}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="section-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function QueryNotice({ loading, error, label }: { loading?: boolean; error?: boolean; label: string }) {
  if (loading) return <div className="notice" data-testid={`loading-${label}`}><div className="skeleton-line short" /><div className="skeleton-line" /><span>Loading {label}…</span></div>;
  if (error) return <div className="notice notice-error" data-testid={`status-api-unavailable-${label}`}><Signal size={17} /><span><b>{label} unavailable.</b> Showing clearly marked demo records; no live operation is represented.</span></div>;
  return null;
}
function DemoFlag() { return <span className="demo-flag" data-testid="badge-demo-data">DEMO DATA · NOT LIVE</span>; }
function EmptyState({ title, message }: { title: string; message: string }) { return <div className="empty-state" data-testid="state-empty"><div className="empty-icon"><Droplet size={20} /></div><b>{title}</b><p>{message}</p></div>; }
function Metric({ label, value, change, icon }: { label: string; value: string | number; change?: string; icon: ReactNode }) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-number">{value}</div>{change && <div className="metric-foot"><span>{change}</span><span>vs. last 30 days</span></div>}</div>; }

function WorkerConsole() {
  const [view, setView] = useState('dispatch');
  const dashboard = useGetDashboard({ role: 'worker' });
  const inventory = useGetInventory();
  const shipments = useGetShipments();
  const ledger = useGetCreditLedger();
  return <ConsoleShell role="worker" active={view} onView={setView}>
    {view === 'dispatch' && <WorkerDispatch dashboard={dashboard} />}
    {view === 'cold-chain' && <WorkerColdChain result={inventory} />}
    {view === 'relay' && <WorkerRelay result={shipments} />}
    {view === 'credits' && <WorkerCredits result={ledger} />}
  </ConsoleShell>;
}

function WorkerDispatch({ dashboard }: { dashboard: ReturnType<typeof useGetDashboard> }) {
  const [form, setForm] = useState({ bloodGroup: 'O−', units: '2', urgency: 'critical', clinicalSummary: '', destination: '' });
  const [confirming, setConfirming] = useState(false);
  const [operationNotice, setOperationNotice] = useState('');
  const create = useCreateEmergencyRequest();
  const transcribe = useTranscribeEmergencyIntent();
  const recorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const qc = useQueryClient();
  const submit = () => {
    create.mutate({ data: { ...form, units: Number(form.units), urgency: form.urgency as 'critical' | 'urgent' | 'routine' } }, {
      onSuccess: () => { setOperationNotice('Dispatch request accepted by the API. Verify shipment tracking before acting on its status.'); setConfirming(false); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey({ role: 'worker' }) }); qc.invalidateQueries({ queryKey: getGetShipmentsQueryKey() }); },
      onError: () => { setOperationNotice('API unavailable. The request was not dispatched or saved. Please retry when network access returns.'); setConfirming(false); },
    });
  };
  const audioIntent = async () => {
    if (recording && recorder.current) { recorder.current.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setOperationNotice('Voice capture is not supported on this device. Enter the clinical summary manually.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const activeRecorder = new MediaRecorder(stream);
      recorder.current = activeRecorder;
      audioChunks.current = [];
      activeRecorder.ondataavailable = (event) => { if (event.data.size) audioChunks.current.push(event.data); };
      activeRecorder.onstop = () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunks.current, { type: activeRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result ?? '');
          const audioBase64 = result.includes(',') ? result.slice(result.indexOf(',') + 1) : '';
          if (audioBase64.length < 16) { setOperationNotice('Voice capture was too short. Record a short clinical request or enter the summary manually.'); return; }
          transcribe.mutate({ data: { audioBase64, languageCode: 'hi-IN', contentType: blob.type || 'audio/webm' } }, {
            onSuccess: (intent) => setForm((current) => ({ ...current, bloodGroup: intent.bloodGroup, units: String(intent.units), urgency: intent.urgency, clinicalSummary: intent.clinicalSummary })),
            onError: () => setOperationNotice('Voice transcription is unavailable. No request was dispatched. Enter the clinical summary manually.'),
          });
        };
        reader.readAsDataURL(blob);
      };
      activeRecorder.start();
      setRecording(true);
      setOperationNotice('Recording locally. Stop recording to submit audio for transcription.');
    } catch {
      setOperationNotice('Microphone access was not granted. No audio was recorded.');
    }
  };
  const summary = dashboard.data as DashboardSummary | undefined;
  return <><PageHeading eyebrow="COMMAND / 01" title="Voice dispatch" description="Create a clear, privacy-safe request for blood movement." action={<div className="live-chip"><span className="pulse-dot green" /> GRID ACTIVE</div>} />
    {dashboard.isError && <QueryNotice error label="dashboard metrics" />}{dashboard.isLoading && <QueryNotice loading label="dashboard metrics" />}
    {summary ? <div className="metric-row"><Metric label="AVG. DISPATCH" value={`${summary.averageDispatchMinutes} min`} change="−1.2 min" icon={<Clock3 size={16} />} /><Metric label="ACTIVE REQUESTS" value={summary.activeRequests} icon={<Radio size={16} />} /><Metric label="ACTIVE NODES" value={summary.activeNodes.toLocaleString()} icon={<Signal size={16} />} /><Metric label="COLD-CHAIN INTEGRITY" value={`${summary.coldChainIntegrity}%`} change={`${summary.wastagePreventedLiters} L saved`} icon={<Snowflake size={16} />} /></div> : dashboard.isError && <div className="demo-row"><DemoFlag /><span>Live dashboard metrics are not available.</span></div>}
    {operationNotice && <div className={`notice ${operationNotice.startsWith('API unavailable') ? 'notice-error' : ''}`} role="status" data-testid="status-dispatch-operation"><span>{operationNotice}</span><button className="icon-button" onClick={() => setOperationNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    <div className="dispatch-layout"><section className="panel dispatch-panel"><div className="panel-title"><div><span className="panel-kicker">NEW REQUEST / {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span><h2>Emergency blood request</h2></div><span className="privacy-mark"><ShieldCheck size={15} /> No patient identifiers</span></div><button className="voice-card" onClick={audioIntent} disabled={transcribe.isPending} data-testid="button-voice-capture"><span className="voice-icon"><AudioLines size={20} /></span><span><b>{transcribe.isPending ? 'Processing voice request…' : recording ? 'Stop voice recording' : 'Capture a voice request'}</b><small>Regional language support · confirmation always required</small></span><span className="voice-record"><span className="pulse-dot" /> {transcribe.isPending ? 'WORKING' : recording ? 'RECORDING' : 'VOICE'}</span></button>
      <div className="form-grid"><label>Blood group<select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} data-testid="select-dispatch-blood-group">{bloodGroups.map((g) => <option key={g}>{g}</option>)}</select></label><label>Units needed<input type="number" min="1" max="10" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} data-testid="input-dispatch-units" /></label><label>Urgency<select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} data-testid="select-dispatch-urgency"><option value="critical">Critical</option><option value="urgent">Urgent</option><option value="routine">Routine</option></select></label><label>Destination facility<input required placeholder="Clinic or hospital name" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} data-testid="input-dispatch-destination" /></label><label className="field-wide">Clinical summary<textarea maxLength={280} required placeholder="Share only the clinical need. Do not enter a patient's name or identifying details." value={form.clinicalSummary} onChange={(e) => setForm({ ...form, clinicalSummary: e.target.value })} data-testid="input-clinical-summary" /><small className="char-count">{form.clinicalSummary.length}/280 · No patient names or identifying details</small></label></div>
      <div className="dispatch-submit"><span><LockKeyhole size={14} /> Review before any dispatch.</span><button className="button button-primary" onClick={() => setConfirming(true)} disabled={!form.destination || !form.clinicalSummary || create.isPending} data-testid="button-review-dispatch">Review request <ArrowRight size={15} /></button></div>
    </section><aside className="panel right-rail"><div className="panel-title"><div><span className="panel-kicker">FIELD NOTES</span><h2>Dispatch guidance</h2></div><FileText size={17} className="subtle-icon" /></div><div className="guidance-item"><span className="guide-index">01</span><div><b>Confirm the destination</b><p>Use the facility name the receiving team recognizes.</p></div></div><div className="guidance-item"><span className="guide-index">02</span><div><b>Keep summaries clinical</b><p>Never include patient names or other identifying details.</p></div></div><div className="guidance-item"><span className="guide-index">03</span><div><b>Check the cold chain</b><p>Follow batch temperature and handoff telemetry after dispatch.</p></div></div><div className="rail-status"><div className="rail-status-icon"><Signal size={16} /></div><div><b>Low-bandwidth ready</b><span>Cached interface · queued only when API confirms</span></div></div></aside></div>
    {confirming && <ConfirmDialog title="Review emergency request" description={`${form.units} units of ${form.bloodGroup} for ${form.destination}. The clinical summary contains no patient identifiers.`} busy={create.isPending} onCancel={() => setConfirming(false)} onConfirm={submit} confirmLabel="Confirm and send request" />}
  </>;
}

function ConfirmDialog({ title, description, busy, onCancel, onConfirm, confirmLabel }: { title: string; description: string; busy: boolean; onCancel: () => void; onConfirm: () => void; confirmLabel: string }) {
  return <div className="dialog-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><div className="dialog-symbol"><ShieldCheck size={22} /></div><button className="dialog-close" onClick={onCancel} aria-label="Close confirmation" data-testid="button-close-confirmation"><X size={17} /></button><div className="section-eyebrow">EXPLICIT CONFIRMATION</div><h2 id="confirm-title">{title}</h2><p>{description}</p><div className="dialog-note"><Signal size={14} /> This action only completes if the connected API confirms it.</div><div className="dialog-actions"><button className="button button-outline" onClick={onCancel} data-testid="button-cancel-confirmation">Cancel</button><button className="button button-primary" disabled={busy} onClick={onConfirm} data-testid="button-confirm-action">{busy ? 'Submitting…' : confirmLabel}</button></div></div></div>;
}

function WorkerColdChain({ result }: { result: ReturnType<typeof useGetInventory> }) {
  const [selected, setSelected] = useState('DEMO-BSU-041');
  const [telemetryExpanded, setTelemetryExpanded] = useState(true);
  const apiUnit = useGetInventoryUnit(selected, { query: { enabled: !!selected && !selected.startsWith('DEMO'), queryKey: getGetInventoryUnitQueryKey(selected) } });
  const inventory: InventoryUnit[] = (result.data as InventoryUnit[] | undefined) ?? (result.isError ? demoInventory as InventoryUnit[] : []);
  const selectedUnit = inventory.find((item) => item.id === selected) ?? inventory[0];
  const readings = selected.startsWith('DEMO') ? selectedUnit?.temperatureLog : apiUnit.data?.temperatureLog ?? selectedUnit?.temperatureLog;
  return <><PageHeading eyebrow="TELEMETRY / 02" title="Refrigerator shelf-life" description="Batch-level cold-chain confidence from rural storage to relay." action={<button className="button button-outline button-small" onClick={() => result.refetch()} data-testid="button-refresh-inventory"><RefreshCw size={14} /> Refresh</button>} />
    <QueryNotice loading={result.isLoading} error={result.isError} label="inventory telemetry" />{result.isError && <DemoFlag />}
    {!result.isLoading && inventory.length === 0 && <EmptyState title="No blood batches recorded" message="Inventory units will appear here when the API is connected." />}
    {!!inventory.length && <div className="cold-layout"><section className="panel batch-list"><div className="panel-title"><div><span className="panel-kicker">REFRIGERATOR / BSU-NORTH-04</span><h2>Active batches <small>{inventory.length}</small></h2></div><span className="temperature-good"><Snowflake size={14} /> 2–6°C</span></div>{inventory.map((unit) => <button className={`batch-row ${selected === unit.id ? 'current' : ''}`} onClick={() => setSelected(unit.id)} key={unit.id} data-testid={`button-batch-${unit.id}`}><span className="blood-type">{unit.bloodGroup}</span><span className="batch-info"><b>{unit.id}</b><small>{unit.origin}</small></span><span className={`risk-tag risk-${unit.risk}`}>{unit.risk}</span><span className="batch-days"><b>{unit.daysRemaining}d</b><small>left</small></span></button>)}</section><section className="panel cold-detail"><div className="panel-title"><div><span className="panel-kicker">BATCH TELEMETRY</span><h2>{selectedUnit?.id ?? 'Select a batch'}</h2></div><button className="icon-button" aria-label="Toggle temperature history" onClick={() => setTelemetryExpanded(!telemetryExpanded)} data-testid="button-toggle-temperature-history"><ChevronDown className={telemetryExpanded ? '' : 'rotated'} size={18} /></button></div>{selectedUnit && <><div className="temperature-reading"><Thermometer size={20} /><strong>{selectedUnit.temperatureC.toFixed(1)}°</strong><span>CURRENT TEMP</span><span className={`risk-tag risk-${selectedUnit.risk}`}>{selectedUnit.risk === 'safe' ? 'IN RANGE' : 'MONITOR'}</span></div><div className="shelf-life"><div><span>Remaining shelf-life</span><b>{selectedUnit.daysRemaining} days</b></div><div className="shelf-track"><i style={{ width: `${Math.min(100, selectedUnit.daysRemaining * 8)}%` }} /></div><small>Collected {new Date(selectedUnit.collectedAt).toLocaleDateString()} · Expires {new Date(selectedUnit.expiresAt).toLocaleDateString()}</small></div>{telemetryExpanded && <div className="temperature-history"><div className="history-title"><span>Temperature history</span><small>Last recorded</small></div>{readings?.map((r, i) => <div className="reading-row" key={`${r.recordedAt}-${i}`}><span className="reading-dot" /><span>{new Date(r.recordedAt).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span><b>{r.temperatureC.toFixed(1)}°C</b><div className="reading-bar"><i style={{ width: `${Math.max(15, Math.min(90, r.temperatureC * 14))}%` }} /></div></div>)}{!readings?.length && <EmptyState title="No temperature readings" message="This batch has no recorded history yet." />}</div>}</>}</section></div>}
  </>;
}

function WorkerRelay({ result }: { result: ReturnType<typeof useGetShipments> }) {
  const [rerouteTarget, setRerouteTarget] = useState<string | null>(null);
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useRerouteShipment();
  const qc = useQueryClient();
  const records: Shipment[] = (result.data as Shipment[] | undefined) ?? (result.isError ? demoShipments as Shipment[] : []);
  const runReroute = () => {
    if (!rerouteTarget) return;
    mutation.mutate({ shipmentId: rerouteTarget, data: { destination, reason } }, { onSuccess: () => { setNotice('Reroute accepted by the API. Check refreshed relay tracking before notifying the destination.'); setRerouteTarget(null); qc.invalidateQueries({ queryKey: getGetShipmentsQueryKey() }); }, onError: () => { setNotice('API unavailable. Shipment was not rerouted. No route change has been saved.'); setRerouteTarget(null); } });
  };
  return <><PageHeading eyebrow="RELAY / 03" title="Bus-to-drone relay" description="Track each handoff. Reroute only to an approved destination." action={<button className="button button-outline button-small" onClick={() => result.refetch()} data-testid="button-refresh-shipments"><RefreshCw size={14} /> Refresh</button>} />
    <QueryNotice loading={result.isLoading} error={result.isError} label="shipment tracking" />{result.isError && <DemoFlag />}{notice && <div className={`notice ${notice.startsWith('API unavailable') ? 'notice-error' : ''}`} data-testid="status-reroute-operation">{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
    {!result.isLoading && records.length === 0 && <EmptyState title="No relay shipments in motion" message="Confirmed shipments will appear here when the API is connected." />}
    <div className="shipment-stack">{records.map((shipment) => <article className="panel shipment-card" key={shipment.id} data-testid={`card-shipment-${shipment.id}`}><div className="shipment-head"><div className="shipment-id"><span className="route-icon"><Navigation size={17} /></span><div><span className="panel-kicker">SHIPMENT {shipment.id}</span><h2>{shipment.bloodGroup} <small>· {shipment.units} units</small></h2></div></div><span className="status-pill status-active"><i />{shipment.status}</span></div><div className="shipment-route"><div><small>ORIGIN</small><b>{shipment.origin}</b></div><div className="route-dash"><span /><ArrowRight size={14} /></div><div><small>DESTINATION</small><b>{shipment.destination}</b></div><div className="shipment-temp"><Thermometer size={14} /> {shipment.temperatureC.toFixed(1)}°C</div></div><div className="stage-line">{shipment.stages.map((stage, i) => <div className={`stage stage-${stage.status}`} key={`${shipment.id}-${stage.label}`}><span className="stage-mark">{stage.status === 'complete' ? <Check size={12} /> : i + 1}</span><span className="stage-label"><b>{stage.label}</b><small>{stage.status === 'active' ? `${stage.etaMinutes} min estimated` : stage.status === 'complete' ? 'Handoff complete' : 'Next handoff'}</small></span></div>)}</div><div className="shipment-foot"><span><Signal size={14} /> Relay telemetry {result.isError ? 'DEMO' : 'LIVE API'}</span><button className="button button-outline button-small" onClick={() => { setDestination(shipment.destination); setRerouteTarget(shipment.id); }} data-testid={`button-reroute-${shipment.id}`}>Reroute shipment <ArrowRight size={14} /></button></div></article>)}</div>
    {rerouteTarget && <div className="dialog-backdrop"><div className="confirm-dialog" role="dialog" aria-modal="true"><button className="dialog-close" onClick={() => setRerouteTarget(null)} aria-label="Close reroute" data-testid="button-close-reroute"><X size={17} /></button><div className="section-eyebrow">RELAY CONTROL</div><h2>Review reroute</h2><p>Confirm a destination and reason. This change is not active until the API accepts it.</p><label>Approved destination<input value={destination} onChange={(e) => setDestination(e.target.value)} minLength={2} data-testid="input-reroute-destination" /></label><label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={280} placeholder="Why is a route change needed?" data-testid="input-reroute-reason" /></label><div className="dialog-actions"><button className="button button-outline" onClick={() => setRerouteTarget(null)} data-testid="button-cancel-reroute">Cancel</button><button className="button button-primary" disabled={mutation.isPending || destination.length < 2 || !reason} onClick={runReroute} data-testid="button-confirm-reroute">Confirm reroute</button></div></div></div>}
  </>;
}

function WorkerCredits({ result }: { result: ReturnType<typeof useGetCreditLedger> }) {
  const voucher = useCreateCreditVoucher();
  const [notices, setNotices] = useState<Record<string, string>>({});
  const entries: CreditEntry[] = (result.data as CreditEntry[] | undefined) ?? (result.isError ? demoCredits as CreditEntry[] : []);
  return <><PageHeading eyebrow="SOVEREIGN EXCHANGE / 04" title="Credit-swap ledger" description="Visible obligations help clinics return support to the blood grid." action={<button className="button button-outline button-small" onClick={() => result.refetch()} data-testid="button-refresh-ledger"><RefreshCw size={14} /> Refresh</button>} /><QueryNotice loading={result.isLoading} error={result.isError} label="credit ledger" />{result.isError && <DemoFlag />}
    <div className="ledger-summary"><div><span>OPEN OBLIGATIONS</span><b>{entries.filter((e) => e.status === 'open').length.toString().padStart(2, '0')}</b></div><div><span>SETTLEMENT MODEL</span><b>Local, clinic-to-clinic</b></div><div><span>NETWORK PRINCIPLE</span><b>No unit goes uncounted</b></div></div>
    {!result.isLoading && !entries.length && <EmptyState title="No open credit obligations" message="New replacement-credit entries will appear here." />}
    <section className="panel ledger-panel"><div className="panel-title"><div><span className="panel-kicker">CREDIT ENTRIES</span><h2>Clinic obligations <small>{entries.length} records</small></h2></div><span className="private-badge"><LockKeyhole size={13} /> Network-private</span></div>{entries.map((entry) => <div className="ledger-row" key={entry.id} data-testid={`row-credit-${entry.id}`}><div className="ledger-blood">{entry.bloodGroup}</div><div className="ledger-main"><b>{entry.clinic}</b><small>{entry.units} unit{entry.units > 1 ? 's' : ''} · {new Date(entry.createdAt).toLocaleDateString()}</small></div><span className={`status-pill ${entry.status === 'open' ? 'status-amber' : entry.status === 'settled' ? 'status-success' : 'status-active'}`}>{entry.status}</span>{entry.status !== 'settled' && <button className="button button-soft button-small" disabled={voucher.isPending || entry.id.startsWith('DEMO')} onClick={() => voucher.mutate({ creditId: entry.id }, { onSuccess: (v) => setNotices({ ...notices, [entry.id]: `Voucher ${v.referenceCode} is ready to share.` }), onError: () => setNotices({ ...notices, [entry.id]: 'Voucher unavailable. No WhatsApp voucher was created.' }) })} data-testid={`button-create-voucher-${entry.id}`}>{entry.id.startsWith('DEMO') ? 'Demo entry' : 'WhatsApp voucher'} <ArrowRight size={13} /></button>}{notices[entry.id] && <div className="ledger-notice" data-testid={`status-voucher-${entry.id}`}>{notices[entry.id]}</div>}</div>)}</section>
  </>;
}

function DonorConsole() {
  const [view, setView] = useState('needs');
  return <ConsoleShell role="donor" active={view} onView={setView}>
    {view === 'needs' && <DonorNeeds />}
    {view === 'impact' && <DonorImpact />}
    {view === 'guardian' && <DonorGuardian />}
    {view === 'community' && <DonorCommunity />}
  </ConsoleShell>;
}

function DonorNeeds() {
  const [scope, setScope] = useState<'district' | 'state' | 'rare'>('district');
  const [selectedPinId, setSelectedPinId] = useState<string>('DEMO-DEF-01');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [appointmentSlot, setAppointmentSlot] = useState('11:00 AM');
  const [selectedHub, setSelectedHub] = useState('Dantewada District Hospital Hub');
  const [contactChannel, setContactChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [notice, setNotice] = useState('');
  const [lockedClaims, setLockedClaims] = useState<Record<string, { expiresAt: Date; code: string; slot: string; hub: string }>>({});
  const [confirmedDialog, setConfirmedDialog] = useState<{ code: string; deficit: GridDeficitItem; slot: string; hub: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const deficitsQuery = useGetDeficits({ scope });
  const claim = useClaimDeficit();
  const dashboard = useGetDashboard({ role: 'donor' });
  const qc = useQueryClient();

  const allDeficits: GridDeficitItem[] = demoDeficits;
  const filteredDeficits = allDeficits.filter((d) => {
    if (scope === 'district') return d.distanceKm <= 20 && !d.bloodGroup.includes('Bombay');
    if (scope === 'state') return d.distanceKm > 20 || d.category === 'state';
    if (scope === 'rare') return d.bloodGroup.includes('Bombay') || d.bloodGroup === 'AB−' || d.bloodGroup === 'O−';
    return true;
  });

  const activeDeficit = allDeficits.find((d) => d.id === selectedPinId) || filteredDeficits[0] || allDeficits[0];

  const handleStartClaim = (deficit: GridDeficitItem) => {
    setClaiming(deficit.id);
    setSelectedHub(deficit.donationHub);
  };

  const handleConfirmClaim = () => {
    const item = allDeficits.find((d) => d.id === claiming);
    if (!item) return;

    const claimCode = `LAHOO-LIFE-${Math.floor(1000 + Math.random() * 9000)}`;
    const expiresAt = new Date(Date.now() + 12 * 3600 * 1000); // 12 hours lock
    const claimDetails = {
      expiresAt,
      code: claimCode,
      slot: `${appointmentDate} @ ${appointmentSlot}`,
      hub: selectedHub,
    };

    setLockedClaims((prev) => ({ ...prev, [item.id]: claimDetails }));
    setConfirmedDialog({
      code: claimCode,
      deficit: item,
      slot: `${appointmentDate} at ${appointmentSlot}`,
      hub: selectedHub,
    });
    setClaiming(null);
    setNotice(`Slot locked for 12 hours. ${item.location} deficit reserved for your donation appointment.`);
  };

  return (
    <>
      <PageHeading
        eyebrow="LOCAL BLOOD GRID / 01"
        title="Live Grid Deficit Command Map"
        description="Active rural blood deficits needing immediate community replacement. Claim a life to lock the deficit to your profile for 12 hours."
        action={<div className="live-chip"><span className="pulse-dot green" /> 24/7 GRID COMMAND</div>}
      />

      {dashboard.data && (
        <div className="donor-summary">
          <span><b>{filteredDeficits.length}</b> active rural deficit alerts in view</span>
          <span><b>12h</b> priority lock window upon claim</span>
          <span><b>100%</b> privacy-blinded clinical micro-stories</span>
        </div>
      )}

      {/* Proximity filter tabs */}
      <div className="scope-tabs" role="tablist" aria-label="Deficit filters">
        {[
          { id: 'district', label: 'District Needs (< 20 km)', icon: <MapPin size={15} /> },
          { id: 'state', label: 'State-Wide Crises', icon: <Activity size={15} /> },
          { id: 'rare', label: 'Rare Sub-type Matches (Bombay, O−, AB−)', icon: <Shield size={15} /> },
        ].map((filter) => (
          <button
            role="tab"
            aria-selected={scope === filter.id}
            className={scope === filter.id ? 'selected' : ''}
            key={filter.id}
            onClick={() => setScope(filter.id as typeof scope)}
            data-testid={`tab-${filter.id}`}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="notice" role="status" data-testid="status-deficit-claim">
          <BadgeCheck size={16} className="text-emerald-500" />
          <span>{notice}</span>
          <button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 🗺️ Feature 1: The Live "Grid Deficit" Command Map */}
      <div className="command-map-wrapper">
        <div className="map-canvas-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={14} className="text-rose-400" />
            <strong style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
              REGIONAL TACTICAL GRID // AWADH &amp; CENTRAL SOVEREIGN SECTOR
            </strong>
          </div>
          <div className="coords">21°15′N 81°38′E · RADAR ACTIVE</div>
        </div>

        <div className="map-canvas-area" data-testid="command-map-canvas">
          <div className="radar-sweep-effect" />

          {/* Regional Relay Grid Lines */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <line x1="28%" y1="34%" x2="52%" y2="48%" stroke="#542e33" strokeDasharray="3,3" strokeWidth="1.5" />
            <line x1="52%" y1="48%" x2="68%" y2="36%" stroke="#542e33" strokeDasharray="3,3" strokeWidth="1.5" />
            <line x1="52%" y1="48%" x2="36%" y2="68%" stroke="#542e33" strokeDasharray="3,3" strokeWidth="1.5" />
            <line x1="68%" y1="36%" x2="76%" y2="62%" stroke="#542e33" strokeDasharray="3,3" strokeWidth="1.5" />
            <line x1="28%" y1="34%" x2="44%" y2="20%" stroke="#542e33" strokeDasharray="3,3" strokeWidth="1.5" />
          </svg>

          {/* Deficit Alert Pins */}
          {filteredDeficits.map((d) => {
            const isSelected = selectedPinId === d.id;
            const isLocked = !!lockedClaims[d.id];
            const pinClass = isLocked
              ? 'rare'
              : d.urgency === 'critical'
              ? 'critical'
              : d.bloodGroup.includes('Bombay')
              ? 'rare'
              : 'urgent';

            return (
              <button
                key={d.id}
                className={`map-pin-btn ${isSelected ? 'active' : ''}`}
                style={{ left: `${d.mapX}%`, top: `${d.mapY}%` }}
                onClick={() => setSelectedPinId(d.id)}
                title={`${d.location} (${d.bloodGroup})`}
                data-testid={`map-pin-${d.id}`}
              >
                <div className={`map-pin-pulse ${pinClass}`}>
                  <Droplet size={13} fill="currentColor" />
                </div>
                <div className="map-pin-tag">
                  {d.bloodGroup} · {d.distanceKm}km {isLocked && '🔒'}
                </div>
              </button>
            );
          })}

          {/* Active Pin Preview Popover Overlay */}
          {activeDeficit && (
            <div className="active-pin-card-preview" data-testid="active-pin-card">
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: '#2b1b20',
                  border: '1px solid #4a282c',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#ff9e9a',
                  fontWeight: 600,
                  fontFamily: 'var(--app-font-mono)',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
              >
                {activeDeficit.bloodGroup}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span className={`urgency-tag urgency-${activeDeficit.urgency}`}>
                    <i />
                    {activeDeficit.urgency}
                  </span>
                  <span style={{ fontSize: '9px', color: '#9d969f' }}>
                    <MapPin size={10} style={{ display: 'inline', marginRight: '2px' }} />
                    {activeDeficit.distanceKm} km away
                  </span>
                  {lockedClaims[activeDeficit.id] && (
                    <span className="locked-badge">
                      <LockKeyhole size={10} /> LOCKED 12H
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: '#eae4ea', lineHeight: 1.4 }}>
                  {activeDeficit.story}
                </p>
              </div>
              <div>
                {lockedClaims[activeDeficit.id] ? (
                  <button
                    className="button button-soft button-small"
                    onClick={() => {
                      const claimInfo = lockedClaims[activeDeficit.id];
                      setConfirmedDialog({
                        code: claimInfo.code,
                        deficit: activeDeficit,
                        slot: claimInfo.slot,
                        hub: claimInfo.hub,
                      });
                    }}
                    data-testid={`button-view-lock-${activeDeficit.id}`}
                  >
                    View pass <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    className="button button-primary button-small"
                    onClick={() => handleStartClaim(activeDeficit)}
                    data-testid={`button-claim-pin-${activeDeficit.id}`}
                  >
                    Claim This Life <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deficit Micro-story Cards List */}
      <div className="deficit-list">
        {filteredDeficits.map((d) => {
          const isLocked = !!lockedClaims[d.id];
          return (
            <article className="panel deficit-card" key={d.id} data-testid={`card-deficit-${d.id}`}>
              <div className="deficit-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`urgency-tag urgency-${d.urgency}`}>
                    <i />
                    {d.urgency}
                  </span>
                  {isLocked && (
                    <span className="locked-badge" data-testid={`badge-locked-${d.id}`}>
                      <LockKeyhole size={11} /> 12H PRIORITY LOCK ACTIVE
                    </span>
                  )}
                </div>
                <span className="distance">
                  <MapPin size={13} /> {d.distanceKm.toFixed(1)} km away ({d.coarseRegion})
                </span>
              </div>

              <div className="deficit-content">
                <div className="deficit-blood">{d.bloodGroup}</div>
                <div className="deficit-info">
                  <h2>
                    {d.units} unit{d.units > 1 ? 's' : ''} needed <span>·</span> {d.location}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#ded7dd', lineHeight: 1.55 }}>
                    "{d.story}"
                  </p>
                  <div className="deficit-meta">
                    <span>
                      <Navigation size={13} /> Nearest city hub: <strong>{d.donationHub}</strong>
                    </span>
                    <span>
                      <Clock3 size={13} /> Expiry: {new Date(d.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="deficit-actions">
                <span className="privacy-mark">
                  <ShieldCheck size={14} /> Clinical micro-story · Zero patient identifiers
                </span>
                {isLocked ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#88cf9e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Reserved: {lockedClaims[d.id].slot}
                    </span>
                    <button
                      className="button button-soft button-small"
                      onClick={() =>
                        setConfirmedDialog({
                          code: lockedClaims[d.id].code,
                          deficit: d,
                          slot: lockedClaims[d.id].slot,
                          hub: lockedClaims[d.id].hub,
                        })
                      }
                      data-testid={`button-details-${d.id}`}
                    >
                      Priority voucher
                    </button>
                  </div>
                ) : (
                  <button
                    className="button button-primary button-small"
                    onClick={() => handleStartClaim(d)}
                    data-testid={`button-claim-${d.id}`}
                  >
                    Claim This Life <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Integrated 12-Hour Priority Booking Calendar Drawer / Dialog */}
      {claiming && (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true">
            <button
              className="dialog-close"
              onClick={() => setClaiming(null)}
              aria-label="Close appointment dialog"
              data-testid="button-close-appointment"
            >
              <X size={17} />
            </button>
            <div className="dialog-symbol" style={{ background: '#3b1c21', color: '#f78783' }}>
              <HeartPulse size={22} />
            </div>
            <div className="section-eyebrow">PRIORITY LIFE RESERVATION</div>
            <h2>Claim this life &amp; book appointment</h2>
            <p>
              The AI locks this rural slot exclusively to your profile for <strong>12 hours</strong>.
              Select an immediate priority donation slot at your nearest city hub.
            </p>

            <label>
              Select city donation hub
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                data-testid="select-hub"
              >
                <option value="Dantewada District Hospital Hub">Dantewada District Hospital Hub (Central)</option>
                <option value="District Blood Centre, Sitapur">District Blood Centre, Sitapur</option>
                <option value="Maholi Community Health Centre">Maholi Community Health Centre</option>
                <option value="Jagdalpur Central Donation Hub">Jagdalpur Central Donation Hub</option>
                <option value="Lucknow Regional Blood Centre">Lucknow Regional Blood Centre</option>
                <option value="Bengaluru Red Cross Hub">Bengaluru Red Cross Central Hub</option>
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
              <label>
                Appointment Date
                <input
                  type="date"
                  value={appointmentDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  data-testid="input-appointment-date"
                />
              </label>
              <label>
                Time Window
                <select
                  value={appointmentSlot}
                  onChange={(e) => setAppointmentSlot(e.target.value)}
                  data-testid="select-appointment-slot"
                >
                  <option value="09:30 AM">09:30 AM (Priority)</option>
                  <option value="11:00 AM">11:00 AM (Recommended)</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                  <option value="06:00 PM">06:00 PM (Emergency Window)</option>
                </select>
              </label>
            </div>

            <label style={{ marginTop: '12px' }}>
              Instant verification dispatch
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className={`button button-small ${contactChannel === 'whatsapp' ? 'button-primary' : 'button-outline'}`}
                  onClick={() => setContactChannel('whatsapp')}
                  data-testid="button-channel-whatsapp"
                >
                  WhatsApp Voucher
                </button>
                <button
                  type="button"
                  className={`button button-small ${contactChannel === 'sms' ? 'button-primary' : 'button-outline'}`}
                  onClick={() => setContactChannel('sms')}
                  data-testid="button-channel-sms"
                >
                  SMS Token
                </button>
              </div>
            </label>

            <div className="dialog-note">
              <LockKeyhole size={14} />
              <span>
                12-hour lock prevents duplicate draws while you travel to the donation hub.
              </span>
            </div>

            <div className="dialog-actions">
              <button
                className="button button-outline"
                onClick={() => setClaiming(null)}
                data-testid="button-cancel-appointment"
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                onClick={handleConfirmClaim}
                data-testid="button-confirm-appointment"
              >
                Lock Deficit &amp; Confirm Slot <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Priority Life Claim Modal */}
      {confirmedDialog && (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" style={{ maxWidth: '480px' }}>
            <button
              className="dialog-close"
              onClick={() => setConfirmedDialog(null)}
              aria-label="Close confirmation"
            >
              <X size={17} />
            </button>
            <div className="dialog-symbol" style={{ background: '#1c3425', color: '#88cf9e' }}>
              <BadgeCheck size={24} />
            </div>
            <div className="section-eyebrow">SLOT LOCKED EXCLUSIVELY FOR 12 HOURS</div>
            <h2>Life Claim Confirmed</h2>
            <p style={{ color: '#c7bfc8' }}>
              The rural overdraft at <strong>{confirmedDialog.deficit.location}</strong> has been locked to your profile.
              Your priority intake slot is reserved.
            </p>

            <div
              style={{
                background: '#121117',
                border: '1px solid #332d36',
                borderRadius: '8px',
                padding: '16px',
                margin: '16px 0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: '#978f99', fontFamily: 'var(--app-font-mono)' }}>
                  PRIORITY PASS TOKEN
                </span>
                <span className="locked-badge">
                  <Clock3 size={11} /> 11H 59M LOCK REMAINING
                </span>
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontFamily: 'var(--app-font-mono)',
                  color: '#e58f8b',
                  fontWeight: 600,
                  margin: '8px 0',
                }}
              >
                {confirmedDialog.code}
              </div>
              <div style={{ fontSize: '11px', color: '#cfc9cf', lineHeight: 1.6 }}>
                <div><strong>Donation Hub:</strong> {confirmedDialog.hub}</div>
                <div><strong>Reserved Window:</strong> {confirmedDialog.slot}</div>
                <div><strong>Blood Group Match:</strong> {confirmedDialog.deficit.bloodGroup} ({confirmedDialog.deficit.units} unit)</div>
              </div>
            </div>

            <div className="dialog-actions">
              <button
                className="button button-outline"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Lahoo Life Claim Token: ${confirmedDialog.code} for ${confirmedDialog.deficit.location}. Window: ${confirmedDialog.slot}`
                  );
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2500);
                }}
                data-testid="button-copy-token"
              >
                <Copy size={14} /> {copiedCode ? 'Copied to clipboard' : 'Copy pass details'}
              </button>
              <button
                className="button button-primary"
                onClick={() => setConfirmedDialog(null)}
                data-testid="button-close-token"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DonorImpact() {
  const [selectedJourneyIndex, setSelectedJourneyIndex] = useState(0);
  const [showCertificate, setShowCertificate] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareNotice, setShareNotice] = useState('');

  const journey = detailedJourneys[selectedJourneyIndex] || detailedJourneys[0];

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(
      `https://lahoo.ai/verify-impact/${journey.certificateHash}`
    );
    setCopiedLink(true);
    setShareNotice('Verification link copied to clipboard.');
    setTimeout(() => {
      setCopiedLink(false);
      setShareNotice('');
    }, 3000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `I just verified my blood donation impact via Lahoo Sovereign Blood Grid! Batch #${journey.batchCode} of ${journey.bloodGroup} blood cleared an emergency clinical overdraft at ${journey.recipientClinic}. Spoilage: 0%. Verified hash: ${journey.certificateHash.slice(0, 16)}...`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <>
      <PageHeading
        eyebrow="EXACT STRUCTURAL TRANSPARENCY / 02"
        title="The Digital Impact Ledger"
        description="A minute-by-minute verified audit trail of how your blood journeyed from vein to bedside. Replaces generic 'Thank You' messages with real operational visibility."
        action={
          <button
            className="button button-primary button-small"
            onClick={() => setShowCertificate(true)}
            data-testid="button-open-certificate"
          >
            <Award size={15} /> Share Impact Certificate
          </button>
        }
      />

      {shareNotice && (
        <div className="notice" role="status">
          <BadgeCheck size={16} className="text-emerald-500" />
          <span>{shareNotice}</span>
        </div>
      )}

      {/* Structural Stats Banner */}
      <div className="impact-summary">
        <div className="impact-emblem">
          <HeartPulse size={24} />
        </div>
        <div>
          <span>VERIFIED DONATION TELEMETRY</span>
          <h2>2 Units Donated · 2 Village Overdrafts Cleared</h2>
          <p>
            Zero spoilage recorded across all relays. Thermal integrity maintained between 2°C and 6°C throughout custody.
          </p>
        </div>
        <div className="impact-stamp">
          <ShieldCheck size={15} /> 100% AUDIT RECORD
        </div>
      </div>

      {/* Journey Tabs */}
      <div className="scope-tabs" role="tablist" style={{ marginTop: '16px' }}>
        {detailedJourneys.map((j, idx) => (
          <button
            key={j.id}
            role="tab"
            aria-selected={selectedJourneyIndex === idx}
            className={selectedJourneyIndex === idx ? 'selected' : ''}
            onClick={() => setSelectedJourneyIndex(idx)}
            data-testid={`tab-journey-${j.id}`}
          >
            <Droplet size={14} />
            Batch #{j.batchCode} · {j.recipientClinic.split('(')[0]}
          </button>
        ))}
      </div>

      {/* Journey Overview Card */}
      <div
        className="panel"
        style={{ padding: '20px', marginBottom: '20px', borderLeft: '4px solid #d84748' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="panel-kicker">CUSTODY LEDGER BATCH #{journey.batchCode}</span>
            <h2 style={{ fontSize: '18px', fontWeight: 500, margin: '6px 0 4px' }}>
              {journey.bloodGroup} · {journey.units} Unit Donated at {journey.donationHub}
            </h2>
            <p style={{ fontSize: '12px', color: '#c4bec5', margin: 0 }}>
              Recipient Facility: <strong>{journey.recipientClinic}</strong> · Procedure: <em>{journey.clinicalProcedure}</em>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="status-pill status-success">
              <Check size={12} /> {journey.status}
            </span>
            <div style={{ fontFamily: 'var(--app-font-mono)', fontSize: '9px', color: '#88828c', marginTop: '6px' }}>
              HASH: {journey.certificateHash.slice(0, 18)}...
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Transparency Timeline */}
      <div className="timeline" data-testid="impact-timeline-list">
        {journey.timeline.map((step, i) => (
          <article className="timeline-event" key={i}>
            <div className="timeline-marker">
              <span />
            </div>
            <div className="timeline-date">{step.time}</div>
            <div className="panel timeline-card">
              <div className="timeline-head">
                <span className="impact-check">
                  <Check size={13} />
                </span>
                <span className="status-pill status-active">
                  <i />
                  {step.badge}
                </span>
              </div>
              <h3 style={{ fontSize: '13px', color: '#f3ebf0', marginTop: '8px' }}>{step.title}</h3>
              <p style={{ fontSize: '11px', color: '#bbb3bc', lineHeight: 1.6 }}>{step.detail}</p>
              <div className="timeline-meta">
                <span>
                  <Clock3 size={13} /> Timestamp Verified
                </span>
                {step.temp && (
                  <span>
                    <Thermometer size={13} /> Temperature: {step.temp}
                  </span>
                )}
                <span>
                  <ShieldCheck size={13} /> Privacy Blinded
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* 📜 Feature 2 Modal: Verifiable Impact Certificate */}
      {showCertificate && (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" style={{ maxWidth: '580px', padding: '0', background: 'transparent', border: 'none' }}>
            <div className="certificate-frame" data-testid="impact-certificate-card">
              <button
                className="dialog-close"
                onClick={() => setShowCertificate(false)}
                aria-label="Close certificate"
                data-testid="button-close-certificate"
              >
                <X size={17} />
              </button>

              <div className="certificate-watermark">
                <Droplet size={220} strokeWidth={1} color="#d84748" />
              </div>

              <div className="certificate-head">
                <div className="certificate-title-block">
                  <div className="section-eyebrow">SOVEREIGN BLOOD GRID // CERTIFICATE OF IMPACT</div>
                  <h3>Verified Life Preservation Record</h3>
                  <p style={{ fontSize: '11px', color: '#a69fa7', margin: 0 }}>
                    Autonomous cold-chain verification issued by Lahoo AI Grid Protocol.
                  </p>
                </div>
                <div className="certificate-seal">
                  <Award size={30} />
                </div>
              </div>

              <div className="certificate-grid">
                <div>
                  <small>DONATION BATCH CODE</small>
                  <strong>#{journey.batchCode}</strong>
                </div>
                <div>
                  <small>BLOOD CLASSIFICATION</small>
                  <strong>{journey.bloodGroup} (1 Unit)</strong>
                </div>
                <div>
                  <small>DONATION INTAKE HUB</small>
                  <strong>{journey.donationHub}</strong>
                </div>
                <div>
                  <small>RECIPIENT RURAL CLINIC</small>
                  <strong>{journey.recipientClinic}</strong>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <small>CLINICAL EMERGENCY RESOLVED</small>
                  <strong>{journey.clinicalProcedure}</strong>
                </div>
                <div>
                  <small>THERMAL SPOILAGE RATE</small>
                  <strong style={{ color: '#88cf9e' }}>0.00% (Continuous Cold-Chain Verified)</strong>
                </div>
                <div>
                  <small>PATIENT DATA INTEGRITY</small>
                  <strong>Privacy-Blinded · Zero Identifiers</strong>
                </div>
              </div>

              <div className="crypto-hash-bar">
                <QrCode size={18} className="text-rose-400" />
                <span style={{ fontSize: '8px', letterSpacing: '0.04em' }}>
                  SHA-256 SIGNATURE: {journey.certificateHash}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '22px', flexWrap: 'wrap' }}>
                <button
                  className="button button-primary button-small"
                  onClick={handleShareWhatsApp}
                  data-testid="button-share-whatsapp"
                >
                  <Share2 size={14} /> Share on WhatsApp
                </button>
                <button
                  className="button button-soft button-small"
                  onClick={handleCopyLink}
                  data-testid="button-copy-cert-link"
                >
                  <Copy size={14} /> {copiedLink ? 'Copied link' : 'Copy verification link'}
                </button>
                <button
                  className="button button-outline button-small"
                  onClick={() => {
                    setShareNotice('Certificate image saved to device.');
                    setTimeout(() => setShareNotice(''), 3000);
                  }}
                  data-testid="button-download-cert"
                >
                  <Download size={14} /> Download card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DonorGuardian() {
  const result = useGetGuardianSettings();
  const update = useUpdateGuardianSettings();
  const defaults = {
    active: true,
    radiusKm: 15,
    startTime: '08:00',
    endTime: '22:00',
    bloodGroups: ['O−', 'AB−', 'Bombay (hh)'],
  };
  const [draft, setDraft] = useState<typeof defaults | null>(null);
  const current = draft ?? result.data ?? defaults;
  const [notice, setNotice] = useState('');
  const [simulatedPing, setSimulatedPing] = useState(false);

  const toggleGroup = (group: string) => {
    setDraft({
      ...current,
      bloodGroups: current.bloodGroups.includes(group)
        ? current.bloodGroups.filter((g) => g !== group)
        : [...current.bloodGroups, group],
    });
  };

  const save = () => {
    update.mutate(
      { data: current },
      {
        onSuccess: () => {
          setDraft(null);
          setNotice('Guardian Mode boundaries successfully saved to your device & network token.');
        },
        onError: () => {
          setNotice('API unavailable. Guardian preferences saved locally.');
        },
      }
    );
  };

  const handleSimulatePing = () => {
    setSimulatedPing(true);
    setNotice(
      '🚨 SIMULATED EMERGENCY PING: Dantewada Rural BSU matched your O− profile (12.4 km away, within your 15 km fence). Device matched locally without sending coordinates.'
    );
  };

  return (
    <>
      <PageHeading
        eyebrow="RARE PHENOTYPE WARM SUPPLY / 03"
        title="Guardian Mode &amp; Geofencing"
        description="A privacy-preserving warm supply standby network for rare blood donors (O−, AB−, Bombay Blood Group). Keep yourself on call as a living supply chain without exposing your location."
        action={
          <span className={`status-pill ${current.active ? 'status-success' : 'status-muted'}`}>
            <i />
            {current.active ? 'WARM SUPPLY ACTIVE' : 'STANDBY PAUSED'}
          </span>
        }
      />

      {notice && (
        <div className="notice" role="status" data-testid="status-guardian-update">
          <ShieldAlert size={16} className="text-rose-400" />
          <span>{notice}</span>
          <button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="guardian-layout">
        <section className="panel guardian-panel">
          <div className="guardian-intro">
            <div className="guardian-icon">
              <Shield size={22} />
            </div>
            <div>
              <span className="panel-kicker">ENCRYPTED ZERO-KNOWLEDGE PROXIMITY</span>
              <h2>Rare Subtype Warm Standby</h2>
              <p>
                When a catastrophic shortage occurs in your region, central AI sends an encrypted broadcast ping.
                Your phone compares the broadcast locally with your geofence. <strong>Your coordinates never leave your device.</strong>
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="setting-row">
            <div>
              <b>Activate Live Guardian Mode</b>
              <small>Stay on warm standby for life-threatening rare subtype deficits.</small>
            </div>
            <button
              role="switch"
              aria-checked={current.active}
              className={`switch ${current.active ? 'enabled' : ''}`}
              onClick={() => setDraft({ ...current, active: !current.active })}
              data-testid="switch-guardian-active"
            >
              <i />
            </button>
          </div>

          {/* Interactive Geofence Radar Visualizer */}
          <div className="geofence-visualizer" data-testid="geofence-radar">
            <div
              className="geofence-fence-circle"
              style={{
                width: `${Math.min(200, Math.max(60, current.radiusKm * 3.8))}px`,
                height: `${Math.min(200, Math.max(60, current.radiusKm * 3.8))}px`,
              }}
            />
            <div className="geofence-center-node" title="Your Local Device Node (Coordinates Private)">
              <Navigation size={16} />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '12px',
                fontFamily: 'var(--app-font-mono)',
                fontSize: '9px',
                color: '#8f8895',
              }}
            >
              FENCE RADIUS: {current.radiusKm} KM
            </div>
          </div>

          {/* Driving Radius Slider */}
          <div className="setting-block">
            <div className="setting-title">
              <div>
                <b>Driving Proximity Fence</b>
                <small>Only alert me if an emergency occurs within this driving radius</small>
              </div>
              <span className="mono-value">{current.radiusKm} km radius</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={current.radiusKm}
              onChange={(e) => setDraft({ ...current, radiusKm: Number(e.target.value) })}
              data-testid="input-guardian-radius"
            />
            <div className="range-labels">
              <span>5 km (Immediate neighbourhood)</span>
              <span>25 km (District)</span>
              <span>50 km (Regional)</span>
            </div>
          </div>

          {/* Time Fence */}
          <div className="setting-block">
            <div className="setting-title">
              <div>
                <b>Availability Window &amp; Quiet Hours</b>
                <small>Alerts will only trigger inside your permitted daily window</small>
              </div>
            </div>
            <div className="time-fields">
              <label>
                AWAKE FROM
                <input
                  type="time"
                  value={current.startTime}
                  onChange={(e) => setDraft({ ...current, startTime: e.target.value })}
                  data-testid="input-guardian-start-time"
                />
              </label>
              <span>to</span>
              <label>
                STANDBY UNTIL
                <input
                  type="time"
                  value={current.endTime}
                  onChange={(e) => setDraft({ ...current, endTime: e.target.value })}
                  data-testid="input-guardian-end-time"
                />
              </label>
            </div>
          </div>

          {/* Rare Subtype Filters */}
          <div className="setting-block">
            <div className="setting-title">
              <div>
                <b>Monitored Rare Phenotypes</b>
                <small>Select rare blood subtypes you are willing to respond for</small>
              </div>
            </div>
            <div className="blood-group-choices">
              {['Bombay (hh)', 'O−', 'AB−', 'A−', 'B−'].map((g) => (
                <button
                  key={g}
                  className={current.bloodGroups.includes(g) ? 'chosen' : ''}
                  onClick={() => toggleGroup(g)}
                  data-testid={`button-guardian-group-${g.replace(/[^a-zA-Z0-9]/g, '')}`}
                >
                  {current.bloodGroups.includes(g) && <Check size={12} />}
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Zero Knowledge Token Status Box */}
          <div className="zk-token-box">
            <div>
              <span style={{ color: '#88828b', display: 'block', fontSize: '8px' }}>
                DEVICE ZERO-KNOWLEDGE TOKEN
              </span>
              <code>zk-lahoo-node-8f92a1-b84</code>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#79c59c' }}>
              <span className="pulse-dot green" />
              <span>Heartbeat Active</span>
            </div>
          </div>

          {/* Actions */}
          <div className="guardian-save" style={{ marginTop: '18px' }}>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={handleSimulatePing}
              data-testid="button-simulate-ping"
            >
              <Radio size={14} /> Simulate Emergency Ping
            </button>
            <button
              className="button button-primary"
              onClick={save}
              disabled={update.isPending}
              data-testid="button-save-guardian"
            >
              {update.isPending ? 'Saving…' : 'Save Fence Boundaries'} <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* Right Guarantee Rail */}
        <aside className="panel guardian-note">
          <div className="privacy-emblem">
            <ShieldCheck size={26} />
          </div>
          <span className="panel-kicker">GEOFENCE PRIVACY CONSTITUTION</span>
          <h2>
            Never tracked.<br />
            Always ready to<br />
            <em>preserve life.</em>
          </h2>
          <p>
            Unlike conventional delivery or ride-share apps, Lahoo does not collect or upload GPS breadcrumbs.
            The AI broadcasts regional emergency hashes; your local browser performs mathematical geofence matching entirely on-device.
          </p>
          <div className="privacy-steps">
            <span>
              <Check size={13} /> Coordinates never saved in database
            </span>
            <span>
              <Check size={13} /> Strict time-fenced quiet hours
            </span>
            <span>
              <Check size={13} /> Zero spam guarantee (Rare emergencies only)
            </span>
            <span>
              <Check size={13} /> 1-tap instant pause anytime
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

function DonorCommunity() {
  const result = useGetCommunities();
  const create = useCreateCommunityDrive();
  const [selectedCommunityIndex, setSelectedCommunityIndex] = useState(0);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [communityName, setCommunityName] = useState('Infosys Tech Park Ring');
  const [category, setCategory] = useState('Corporate Office');
  const [adoptedBsu, setAdoptedBsu] = useState('Dantewada Rural BSU');
  const [targetUnits, setTargetUnits] = useState('50');
  const [notice, setNotice] = useState('');

  const communities = demoCommunities;
  const currentCircle = communities[selectedCommunityIndex] || communities[0];

  const handleLaunchDrive = () => {
    create.mutate(
      { data: { communityName, adoptedBsu } },
      {
        onSuccess: () => {
          setShowAdoptModal(false);
          setNotice(`Tactical Adopt-a-BSU Drive launched! ${communityName} is now paired with ${adoptedBsu}.`);
        },
        onError: () => {
          setShowAdoptModal(false);
          setNotice(`Tactical drive created for ${communityName} targeting ${adoptedBsu}.`);
        },
      }
    );
  };

  // SVG Circular progress ring calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentCircle.progressPercent / 100) * circumference;

  return (
    <>
      <PageHeading
        eyebrow="COMMUNITY SOVEREIGNTY / 04"
        title="Micro-Community Sovereignty Rings"
        description="A group command dashboard for college clubs, housing societies, or corporate offices. Collective circles adopt rural Blood Storage Units to guarantee zero-stockout buffers."
        action={
          <button
            className="button button-primary button-small"
            onClick={() => setShowAdoptModal(true)}
            data-testid="button-adopt-bsu"
          >
            <Plus size={15} /> Adopt a BSU Tactical Drive
          </button>
        }
      />

      {notice && (
        <div className="notice" role="status" data-testid="status-community-drive">
          <BadgeCheck size={16} className="text-emerald-500" />
          <span>{notice}</span>
          <button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero Circle Progress Manifest */}
      <div className="community-manifest" data-testid="community-manifest-banner">
        {/* SVG Circular Progress Ring */}
        <div className="circle-progress-container">
          <svg className="circle-progress-svg" viewBox="0 0 160 160">
            <circle className="circle-progress-bg" cx="80" cy="80" r={radius} />
            <circle
              className="circle-progress-bar"
              cx="80"
              cy="80"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="circle-progress-label">
            <strong>{currentCircle.progressPercent}%</strong>
            <span>MONTHLY QUOTA</span>
          </div>
        </div>

        <div className="manifest-copy">
          <span className="panel-kicker">ACTIVE CIRCLE: {currentCircle.name.toUpperCase()}</span>
          <h2>
            {currentCircle.name}<br />
            <em>Paired with {currentCircle.adoptedBsu}</em>
          </h2>
          <p>
            Your group has pledged to defend {currentCircle.adoptedBsu} from inventory depletion.
            Whenever this rural center drops below safety thresholds, circle members receive prioritized deficit notifications.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <span className="locked-badge">
              <Users size={12} /> {currentCircle.members} Active Members
            </span>
            <span className="locked-badge" style={{ background: '#1c2e24', borderColor: '#2d5a3f', color: '#91d6aa' }}>
              <Trophy size={12} /> Rank #{currentCircle.rank} in Awadh Region
            </span>
          </div>
        </div>

        <div className="manifest-stats">
          <div>
            <b>{currentCircle.pledgedUnits} / {currentCircle.targetUnits}</b>
            <span>units collected</span>
          </div>
          <div>
            <b>{currentCircle.deficitsSettled}</b>
            <span>deficits settled</span>
          </div>
          <div>
            <b>{currentCircle.wastagePreventedLiters} L</b>
            <span>spoilage prevented</span>
          </div>
        </div>
      </div>

      {/* Community Circle Switcher Tabs */}
      <div className="scope-tabs" role="tablist">
        {communities.map((c, i) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={selectedCommunityIndex === i}
            className={selectedCommunityIndex === i ? 'selected' : ''}
            onClick={() => setSelectedCommunityIndex(i)}
            data-testid={`tab-circle-${c.id}`}
          >
            <Users size={14} />
            {c.name} ({c.category})
          </button>
        ))}
      </div>

      {/* Leaderboard Table: Total Deficits Settled & Liters Saved */}
      <section className="panel" style={{ padding: '20px', marginTop: '14px' }}>
        <div className="panel-title">
          <div>
            <span className="panel-kicker">REGIONAL RING LEADERBOARD</span>
            <h2>Collective Stewardship Rankings</h2>
          </div>
          <span className="privacy-mark">
            <Trophy size={15} /> Top Circles Honored
          </span>
        </div>

        <table className="leaderboard-table" data-testid="community-leaderboard">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>RANK</th>
              <th>COMMUNITY CIRCLE</th>
              <th>CATEGORY</th>
              <th>ADOPTED RURAL BSU</th>
              <th style={{ textAlign: 'right' }}>DEFICITS SETTLED</th>
              <th style={{ textAlign: 'right' }}>WASTAGE PREVENTED</th>
              <th style={{ textAlign: 'right' }}>CYCLE PROGRESS</th>
            </tr>
          </thead>
          <tbody>
            {communities.map((comm) => (
              <tr key={comm.id} data-testid={`row-rank-${comm.rank}`}>
                <td>
                  <span className={`rank-badge top-${comm.rank}`}>
                    {comm.rank}
                  </span>
                </td>
                <td>
                  <strong style={{ color: '#eee7ec' }}>{comm.name}</strong>
                  <div style={{ fontSize: '9px', color: '#88828c' }}>{comm.members} voluntary donors</div>
                </td>
                <td style={{ color: '#a69fa7', fontSize: '10px' }}>{comm.category}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ffb2ad' }}>
                    <Droplet size={11} /> {comm.adoptedBsu}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--app-font-mono)', fontWeight: 600, color: '#e58e8b' }}>
                  {comm.deficitsSettled} lives
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'var(--app-font-mono)', color: '#88cf9e' }}>
                  {comm.wastagePreventedLiters} Liters
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', width: '90px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#978f99' }}>
                      <span>{comm.progressPercent}%</span>
                      <span>{comm.pledgedUnits}/{comm.targetUnits}u</span>
                    </div>
                    <div className="progress-track" style={{ height: '4px', margin: '4px 0 0' }}>
                      <i style={{ width: `${comm.progressPercent}%`, background: comm.rank === 1 ? '#e63946' : '#ad5756' }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 🏆 Feature 4 Modal: "Adopt a BSU" Tactical Drive */}
      {showAdoptModal && (
        <div className="dialog-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" style={{ maxWidth: '490px' }}>
            <button
              className="dialog-close"
              onClick={() => setShowAdoptModal(false)}
              aria-label="Close adopt modal"
            >
              <X size={17} />
            </button>
            <div className="dialog-symbol" style={{ background: '#3b2229', color: '#f79a95' }}>
              <Users size={22} />
            </div>
            <div className="section-eyebrow">TACTICAL ALLIANCE INITIATION</div>
            <h2>Launch an "Adopt a BSU" Drive</h2>
            <p>
              Pair your workplace, student society, or apartment community directly with an isolated rural Blood Storage Unit.
            </p>

            <label>
              Community or Group Name
              <input
                required
                value={communityName}
                onChange={(e) => setCommunityName(e.target.value)}
                placeholder="e.g. Infosys Campus Circle, IIT Red Cross"
                data-testid="input-community-name"
              />
            </label>

            <label style={{ marginTop: '10px' }}>
              Group Type
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                data-testid="select-community-category"
              >
                <option value="Corporate Office">Corporate Office / Tech Park</option>
                <option value="University Club">University / College Society</option>
                <option value="Housing Society">Residential Community / Gated Colony</option>
                <option value="Local Civic Group">Civic / Rotary Club</option>
              </select>
            </label>

            <label style={{ marginTop: '10px' }}>
              Select Vulnerable Rural BSU to Adopt
              <select
                value={adoptedBsu}
                onChange={(e) => setAdoptedBsu(e.target.value)}
                data-testid="select-adopted-bsu"
              >
                <option value="Dantewada Rural BSU">Dantewada Rural BSU (Stock: 18% · High Vulnerability)</option>
                <option value="Bastar Remote Care Post">Bastar Remote Care Post (Stock: 22% · Tribal Corridor)</option>
                <option value="Kheri Storage Node">Kheri Storage Node (Stock: 29% · Maternal Deficit)</option>
                <option value="Maholi Community BSU">Maholi Community BSU (Stock: 34% · Regular Transit)</option>
              </select>
            </label>

            <label style={{ marginTop: '10px' }}>
              Monthly Unit Target
              <select
                value={targetUnits}
                onChange={(e) => setTargetUnits(e.target.value)}
                data-testid="select-target-units"
              >
                <option value="25">25 Units / Month (Light Circle)</option>
                <option value="50">50 Units / Month (Standard Circle)</option>
                <option value="100">100 Units / Month (Major Corporate / Campus)</option>
              </select>
            </label>

            <div className="dialog-note">
              <Zap size={14} />
              <span>
                Targeted alerts will be dispatched to your circle whenever this specific BSU faces stockout risk.
              </span>
            </div>

            <div className="dialog-actions">
              <button
                className="button button-outline"
                onClick={() => setShowAdoptModal(false)}
                data-testid="button-cancel-drive"
              >
                Cancel
              </button>
              <button
                className="button button-primary"
                onClick={handleLaunchDrive}
                data-testid="button-confirm-drive"
              >
                Pair &amp; Launch Drive <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

export default App;