import { useState, useEffect, useRef, useMemo } from 'react';
import { safeStorage } from './storage';
import { Flame, Sparkles } from 'lucide-react';

interface JournalEntry {
  text: string;
  ts: number;
  actionAnchor?: {
    trigger: string;
    action: string;
  };
}

interface InsightData {
  theme: string;
  principle: string;
  insight: string;
  action: string;
}

const playTick = (type: 'tick' | 'tock' | 'chime' | 'inhale' | 'exhale') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'tock') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'chime') {
      // Warm gong/celestial bell: chord frequencies
      const freqs = [329.63, 392.00, 523.25, 659.25]; // E4, G4, C5, E5 (C major-ish/E minor harmony)
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0 + idx * 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + 2.5 + idx * 0.1);
      });
    } else if (type === 'inhale') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.6);
    } else if (type === 'exhale') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.6);
    }
  } catch (e) {
    console.warn("AudioContext error: ", e);
  }
};

const calculateStreak = (entriesList: JournalEntry[]) => {
  if (entriesList.length === 0) return { current: 0, longest: 0 };

  const getLocalDateString = (timestamp: number) => {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Extract unique dates in YYYY-MM-DD
  const dateSet = new Set<string>();
  entriesList.forEach(entry => {
    dateSet.add(getLocalDateString(entry.ts));
  });

  const uniqueDates = Array.from(dateSet).sort(); // ascending, e.g. ["2026-07-01", "2026-07-04", ...]

  // Calculate longest streak
  let longest = 0;
  let tempStreak = 0;
  let prevDateMs: number | null = null;

  uniqueDates.forEach((dateStr) => {
    const parts = dateStr.split('-');
    const currentMs = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
    
    if (prevDateMs === null) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((currentMs - prevDateMs) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak += 1;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    prevDateMs = currentMs;
    if (tempStreak > longest) {
      longest = tempStreak;
    }
  });

  // Calculate current streak
  const today = new Date();
  const todayStr = getLocalDateString(today.getTime());
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday.getTime());

  let current = 0;
  if (dateSet.has(todayStr)) {
    current = 1;
    let checkDate = new Date(today);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = getLocalDateString(checkDate.getTime());
      if (dateSet.has(checkStr)) {
        current += 1;
      } else {
        break;
      }
    }
  } else if (dateSet.has(yesterdayStr)) {
    current = 1;
    let checkDate = new Date(yesterday);
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkStr = getLocalDateString(checkDate.getTime());
      if (dateSet.has(checkStr)) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, longest };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ name: string; slug: string } | null>(null);
  const [nameInputValue, setNameInputValue] = useState('');
  const [entryText, setEntryText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const streak = useMemo(() => calculateStreak(entries), [entries]);
  
  // Cursor tracking & 3D tilt for manifestation page
  const [paperMousePos, setPaperMousePos] = useState({ x: 0, y: 0 });
  const [isHoveringPaper, setIsHoveringPaper] = useState(false);
  const [paperTilt, setPaperTilt] = useState({ rotateX: 0, rotateY: 0 });
  
  // Insight states
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');

  // Reminder states
  const [reminderTime, setReminderTime] = useState('20:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderStatus, setReminderStatus] = useState('');

  // Tooltip position state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    text: string;
    date: string;
    left: number;
    top: number;
    actionAnchor?: { trigger: string; action: string };
  }>({ visible: false, text: '', date: '', left: 0, top: 0 });

  // Share card / Download states
  const [sharingEntry, setSharingEntry] = useState<JournalEntry | null>(null);
  const [activeTheme, setActiveTheme] = useState<'cosmic' | 'vintage' | 'slate' | 'aurora' | 'zen' | 'tarot'>('cosmic');
  const [sharingText, setSharingText] = useState('');
  const [sharingOrnament, setSharingOrnament] = useState('✦');
  const [sharingFont, setSharingFont] = useState<'serif' | 'sans' | 'cursive' | 'mono'>('serif');
  const [sharingBorder, setSharingBorder] = useState<'none' | 'minimal' | 'ornate' | 'brackets'>('ornate');
  const [sharingAccent, setSharingAccent] = useState('#f3d38a');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareGuide, setShowShareGuide] = useState(false);

  const handleOpenSharing = (entry: JournalEntry) => {
    setSharingEntry(entry);
    setSharingText(entry.text);
    setActiveTheme('cosmic');
    setSharingOrnament('✦');
    setSharingFont('serif');
    setSharingBorder('ornate');
    setSharingAccent('#f3d38a');
  };

  // Action Anchor Bridge states
  const [isActionBridgeActive, setIsActionBridgeActive] = useState(false);
  const [anchorTrigger, setAnchorTrigger] = useState('');
  const [anchorAction, setAnchorAction] = useState('');

  // Breathing Booster states
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('visherai:muted') === 'true';
    } catch {
      return false;
    }
  });
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(60);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathingCycleSeconds, setBreathingCycleSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isBreathingActive) {
      setBreathingSecondsLeft(60);
      setBreathingPhase('inhale');
      setBreathingCycleSeconds(0);
      
      if (!isMuted) {
        playTick('inhale');
      }
      
      interval = setInterval(() => {
        setBreathingSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsBreathingActive(false);
            if (interval) clearInterval(interval);
            if (!isMuted) {
              playTick('chime');
            }
            return 0;
          }
          
          if (!isMuted) {
            // Tock on quarter divisions, tick on others
            if ((prev - 1) % 4 === 0) {
              playTick('tock');
            } else {
              playTick('tick');
            }
          }
          return prev - 1;
        });

        setBreathingCycleSeconds((prev) => {
          const next = (prev + 1) % 12;
          if (next < 4) {
            setBreathingPhase('inhale');
            if (!isMuted && next === 0) {
              playTick('inhale');
            }
          } else if (next < 8) {
            setBreathingPhase('hold');
          } else {
            setBreathingPhase('exhale');
            if (!isMuted && next === 8) {
              playTick('exhale');
            }
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBreathingActive, isMuted]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const galaxyLayerRef = useRef<SVGGElement | null>(null);
  const constellationSvgRef = useRef<SVGSVGElement | null>(null);

  // ---------- STARFIELD BACKGROUND ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stars: Array<{ x: number; y: number; r: number; phase: number; speed: number }> = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight || window.innerHeight;
      stars = [];
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.3 + 0.2,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.015 + 0.005,
        });
      }
    };

    const drawStars = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin((t * s.speed) + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,225,255,${0.15 + twinkle * 0.65})`;
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(drawStars);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrameId = requestAnimationFrame(drawStars);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ---------- MINDVERSE GALAXY ILLUSTRATION ----------
  useEffect(() => {
    const layer = galaxyLayerRef.current;
    if (!layer) return;
    layer.innerHTML = '';

    const svgNS = 'http://www.w3.org/2000/svg';
    const cx = 200, cy = 150;
    const turns = 3.2;
    const stepCount = 70;
    const anchorPoints: Array<{ x: number; y: number; r: number; op: number }> = [];

    for (let i = 0; i < stepCount; i++) {
      const t = i / stepCount;
      const angle = t * turns * Math.PI * 2;
      const radius = 14 + t * 170;
      const x = cx + Math.cos(angle) * radius;
      const y = cy - Math.abs(Math.sin(angle * 0.5)) * radius * 0.35 - t * 40;
      const yy = cy - t * 230 + Math.sin(angle) * radius * 0.25;
      const xx = cx + Math.cos(angle) * radius * 0.9;
      if (yy < -20 || xx < -20 || xx > 420) continue;
      anchorPoints.push({ x: xx, y: yy, r: 0.6 + Math.random() * 1.8, op: 1 - t * 0.5 });
    }

    // Connect sequential points
    for (let i = 1; i < anchorPoints.length; i++) {
      const a = anchorPoints[i - 1], b = anchorPoints[i];
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.y));
      line.setAttribute('stroke', 'rgba(196,166,255,0.22)');
      line.setAttribute('stroke-width', '0.6');
      layer.appendChild(line);
    }

    anchorPoints.forEach((p, idx) => {
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', String(p.x));
      c.setAttribute('cy', String(p.y));
      c.setAttribute('r', String(p.r));
      c.setAttribute('fill', idx % 9 === 0 ? '#f3d38a' : '#e6e1ff');
      c.setAttribute('opacity', p.op.toFixed(2));
      c.style.animation = `twinkleStar ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`;
      layer.appendChild(c);
    });

    const innerPts = [[200, 120], [178, 150], [222, 150]];
    innerPts.forEach((pt, i) => {
      const target = anchorPoints[Math.min(anchorPoints.length - 1, 18 + i * 14)];
      if (!target) return;
      const line = document.createElementNS(svgNS, 'path');
      const midX = (pt[0] + target.x) / 2 + (i - 1) * 20;
      const midY = (pt[1] + target.y) / 2;
      line.setAttribute('d', `M${pt[0]},${pt[1]} Q${midX},${midY} ${target.x},${target.y}`);
      line.setAttribute('stroke', 'rgba(243,211,138,0.35)');
      line.setAttribute('stroke-width', '0.8');
      line.setAttribute('fill', 'none');
      layer.appendChild(line);
    });
  }, [currentUser]);

  // ---------- INITIAL SIGN IN AUTOMATION ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await safeStorage.get('profile:last');
        if (res && res.value) {
          const saved = JSON.parse(res.value);
          if (saved && saved.name) {
            setNameInputValue(saved.name);
          }
        }
      } catch (e) {
        console.warn('Could not auto-load profile:', e);
      }
    })();
  }, []);

  // ---------- PROFILE LOAD EFFECT ----------
  useEffect(() => {
    if (currentUser) {
      loadEntries();
      loadReminder();
    }
  }, [currentUser]);

  // ---------- NOTIFICATION REMINDER CHECK LOOP ----------
  useEffect(() => {
    let intervalId: any;
    let lastFiredDateKey: string | null = null;

    const checkReminder = () => {
      if (!reminderEnabled) return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const current = `${hh}:${mm}`;
      const todayKey = now.toDateString();

      if (current === reminderTime && lastFiredDateKey !== todayKey) {
        lastFiredDateKey = todayKey;
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            const n = new Notification('Visherai', {
              body: "Today's line is still waiting to be written.",
            });
            n.onclick = () => {
              window.focus();
            };
          }
        } catch (e) {
          console.error('Notification error:', e);
        }
      }
    };

    if (reminderEnabled) {
      intervalId = setInterval(checkReminder, 20000);
      checkReminder();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [reminderEnabled, reminderTime]);

  const slugify = (name: string) => {
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'guest';
  };

  const handleSignIn = async () => {
    if (!nameInputValue.trim()) return;
    const name = nameInputValue.trim();
    const slug = slugify(name);
    const profile = { name, slug };
    setCurrentUser(profile);
    try {
      await safeStorage.set('profile:last', JSON.stringify(profile));
    } catch (e) {
      console.error(e);
    }
  };

  const loadEntries = async () => {
    if (!currentUser) return;
    try {
      const prefix = `entries:${currentUser.slug}:`;
      const list = await safeStorage.list(prefix);
      if (!list || !list.keys || list.keys.length === 0) {
        setEntries([]);
        return;
      }
      const loadedEntries: JournalEntry[] = [];
      for (const key of list.keys) {
        try {
          const res = await safeStorage.get(key);
          if (res && res.value) {
            loadedEntries.push(JSON.parse(res.value));
          }
        } catch (e) {
          // skip
        }
      }
      loadedEntries.sort((a, b) => a.ts - b.ts);
      setEntries(loadedEntries);
    } catch (e) {
      console.error('Error loading entries:', e);
    }
  };

  const loadReminder = async () => {
    if (!currentUser) return;
    try {
      const res = await safeStorage.get(`reminder:${currentUser.slug}`);
      if (res && res.value) {
        const saved = JSON.parse(res.value);
        setReminderTime(saved.time || '20:00');
        const isEnabled = !!saved.enabled && ('Notification' in window) && Notification.permission === 'granted';
        setReminderEnabled(isEnabled);
        updateReminderStatusMessage(isEnabled, saved.time || '20:00');
      } else {
        setReminderEnabled(false);
        setReminderStatus('');
      }
    } catch (e) {
      console.error('Error loading reminder:', e);
    }
  };

  const updateReminderStatusMessage = (enabled: boolean, time: string) => {
    if (!('Notification' in window)) {
      setReminderStatus("Your browser doesn't support notifications.");
      return;
    }
    if (Notification.permission === 'denied') {
      setReminderStatus('Notifications are blocked for this page in your browser settings.');
      return;
    }
    if (enabled) {
      setReminderStatus(`On — a notification will fire at ${time} while this tab is open.`);
    } else {
      setReminderStatus('');
    }
  };

  const handleToggleReminder = async () => {
    if (!('Notification' in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    if (reminderEnabled) {
      setReminderEnabled(false);
      setReminderStatus('');
      try {
        await safeStorage.set(
          `reminder:${currentUser?.slug}`,
          JSON.stringify({ time: reminderTime, enabled: false })
        );
      } catch (e) {
        console.error(e);
      }
      return;
    }

    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      setReminderEnabled(true);
      updateReminderStatusMessage(true, reminderTime);
      try {
        await safeStorage.set(
          `reminder:${currentUser?.slug}`,
          JSON.stringify({ time: reminderTime, enabled: true })
        );
      } catch (e) {
        console.error(e);
      }
    } else {
      setReminderEnabled(false);
      setReminderStatus('Notifications are blocked for this page in your browser settings.');
    }
  };

  const handleReminderTimeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReminderTime(val);
    updateReminderStatusMessage(reminderEnabled, val);
    if (currentUser) {
      try {
        await safeStorage.set(
          `reminder:${currentUser.slug}`,
          JSON.stringify({ time: val, enabled: reminderEnabled })
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveEntry = async () => {
    const text = entryText.trim();
    if (!text) {
      setStatusMsg('Write a line first.');
      setTimeout(() => setStatusMsg(''), 2200);
      return;
    }
    if (!currentUser) return;

    setIsSaving(true);
    setStatusMsg('Sending it out…');

    const entry: JournalEntry = { text, ts: Date.now() };
    const key = `entries:${currentUser.slug}:${entry.ts}`;
    
    try {
      const ok = await safeStorage.set(key, JSON.stringify(entry));
      setIsSaving(false);
      if (ok) {
        setStatusMsg('Written. A new star just lit up.');
        setEntryText('');
        await loadEntries();
        generateInsight(text);
      } else {
        setStatusMsg('Could not save — try again.');
      }
    } catch (e) {
      setIsSaving(false);
      setStatusMsg('Could not save — try again.');
    }
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSaveActionAnchor = async () => {
    if (!currentUser || entries.length === 0) {
      alert("Write and send today's manifestation first.");
      return;
    }
    const trigger = anchorTrigger.trim();
    const action = anchorAction.trim();
    if (!trigger || !action) {
      alert("Please fill out both the trigger and the action to build your bridge.");
      return;
    }

    const latestEntry = entries[entries.length - 1];
    const updatedEntry: JournalEntry = {
      ...latestEntry,
      actionAnchor: { trigger, action }
    };

    const key = `entries:${currentUser.slug}:${latestEntry.ts}`;
    try {
      await safeStorage.set(key, JSON.stringify(updatedEntry));
      await loadEntries();
      setIsActionBridgeActive(false);
      setAnchorTrigger('');
      setAnchorAction('');
      setStatusMsg('Neural Action Bridge successfully locked and wired!');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (e) {
      console.error(e);
      alert('Could not save Action Bridge. Please try again.');
    }
  };

  const generateInsight = async (text: string) => {
    setInsightLoading(true);
    setInsightError('');
    setInsight(null);

    // Scroll the research section into view
    const researchSec = document.getElementById('research');
    if (researchSec) {
      researchSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    try {
      const response = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryText: text }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Insight endpoint returned error', data);
        setInsightError(data?.details || "Couldn't generate a personalized reflection just now.");
        return;
      }
      setInsight(data);
    } catch (e) {
      console.error('Insight error:', e);
      setInsightError("Couldn't generate a personalized reflection just now — the four principles below still apply, take a look through them.");
    } finally {
      setInsightLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!currentUser) return;
    const confirmed = window.confirm(`This will permanently delete every entry saved under "${currentUser.name}". This can't be undone. Continue?`);
    if (!confirmed) return;

    try {
      const prefix = `entries:${currentUser.slug}:`;
      const list = await safeStorage.list(prefix);
      if (list && list.keys) {
        for (const key of list.keys) {
          await safeStorage.delete(key);
        }
      }
      await loadEntries();
      setInsight(null);
      setInsightError('');
      alert('All your entries have been erased.');
    } catch (e) {
      console.error(e);
      alert('Something went wrong erasing your data — please try again.');
    }
  };

  const handleSwitchProfile = () => {
    setCurrentUser(null);
    setEntries([]);
    setInsight(null);
    setInsightError('');
  };

  // ---------- STORY CARD GENERATION & DOWNLOAD ----------
  const handleDownloadCard = (entry: JournalEntry) => {
    // Create an offscreen canvas for a high-res mobile story aspect ratio card (1080 x 1920)
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. RICH BACKGROUND GRADIENT (Celestial Space Indigo & Slate)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#040308');
    bgGrad.addColorStop(0.3, '#0b0918');
    bgGrad.addColorStop(0.7, '#130e26');
    bgGrad.addColorStop(1, '#020104');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Radial gold aura in the center
    const radialAura = ctx.createRadialGradient(540, 960, 100, 540, 960, 800);
    radialAura.addColorStop(0, 'rgba(212, 175, 55, 0.12)');
    radialAura.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)');
    radialAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialAura;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. CELESTIAL BACKGROUND STARS
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 1080;
      const y = Math.random() * 1920;
      const r = Math.random() * 2 + 0.5;
      ctx.globalAlpha = Math.random() * 0.7 + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 3. SECURE GILDED GOLD DOUBLE BORDERS
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(50, 50, 980, 1820);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(68, 68, 944, 1784);

    // Corner decorative stars
    const drawCornerStar = (cx: number, cy: number) => {
      ctx.fillStyle = '#dfaf3f';
      ctx.font = '40px "Inter"';
      ctx.textAlign = 'center';
      ctx.fillText('✦', cx, cy + 12);
    };
    drawCornerStar(105, 110);
    drawCornerStar(975, 110);
    drawCornerStar(105, 1810);
    drawCornerStar(975, 1810);

    // 4. DRAW CUSTOM GOLD "V" LOGO (Matching Visherai aesthetic) AT THE TOP
    const lx = 540;
    const ly = 320;
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    
    // Draw V wing
    ctx.beginPath();
    ctx.moveTo(lx - 90, ly - 60);
    ctx.lineTo(lx, ly + 80);
    ctx.lineTo(lx + 90, ly - 60);
    ctx.stroke();

    // Central line and sphere
    ctx.beginPath();
    ctx.moveTo(lx, ly + 80);
    ctx.lineTo(lx, ly - 20);
    ctx.stroke();

    // Symmetrical dots
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(lx - 35, ly - 25, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(lx + 35, ly - 25, 7, 0, Math.PI * 2);
    ctx.fill();

    // Top Glowing Oracle Sphere
    const sphereGrad = ctx.createRadialGradient(lx, ly - 50, 2, lx, ly - 50, 18);
    sphereGrad.addColorStop(0, '#ffffff');
    sphereGrad.addColorStop(0.5, '#a5f3fc');
    sphereGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(lx, ly - 50, 18, 0, Math.PI * 2);
    ctx.fill();

    // Title text
    ctx.fillStyle = '#dfaf3f';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "Space Grotesk", sans-serif';
    ctx.fillText('V I S H E R A I', 540, 480);
    
    ctx.fillStyle = '#9a94c9';
    ctx.font = '18px "Space Grotesk", sans-serif';
    ctx.fillText('DAILY INTENTION ALIGNMENT', 540, 520);

    // 5. WRITING THE MANIFESTATION TEXT BLOCK (ELEGANTLY CENTERED)
    ctx.fillStyle = '#fffdf2';
    ctx.textAlign = 'center';
    ctx.font = 'italic 52px "Fraunces", Georgia, serif';
    
    const maxTextWidth = 800;
    const rawText = entry.text;
    const wordsList = rawText.split(' ');
    const lines = [];
    let currentLineStr = wordsList[0] || '';

    for (let i = 1; i < wordsList.length; i++) {
      const testLine = currentLineStr + " " + wordsList[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width < maxTextWidth) {
        currentLineStr = testLine;
      } else {
        lines.push(currentLineStr);
        currentLineStr = wordsList[i];
      }
    }
    if (currentLineStr) {
      lines.push(currentLineStr);
    }

    // Draw lines with custom line height
    const startY = 960 - ((lines.length - 1) * 75) / 2;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
    ctx.shadowBlur = 15;

    // Draw gold double quotes
    ctx.fillStyle = '#dfaf3f';
    ctx.font = '80px "Fraunces", Georgia, serif';
    ctx.fillText('“', 540, startY - 80);

    ctx.fillStyle = '#fffdf2';
    ctx.font = 'italic 46px "Fraunces", Georgia, serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, 540, startY + index * 75);
    });

    ctx.fillStyle = '#dfaf3f';
    ctx.font = '80px "Fraunces", Georgia, serif';
    ctx.fillText('”', 540, startY + lines.length * 75 + 10);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 6. ALIGNMENT CREDENTIALS & SCRIPTURE
    ctx.fillStyle = '#dfaf3f';
    ctx.font = 'italic 32px "Fraunces", Georgia, serif';
    ctx.fillText('Aligned & Sealed', 540, 1420);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "Space Grotesk", sans-serif';
    ctx.fillText(`BY ${currentUser?.name.toUpperCase() || 'ANONYMOUS'}`, 540, 1475);

    // Timestamp
    const formattedDateStr = new Date(entry.ts).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
    ctx.fillStyle = '#9a94c9';
    ctx.font = '20px "Space Grotesk", sans-serif';
    ctx.fillText(formattedDateStr, 540, 1530);

    // Seal icon
    ctx.fillStyle = '#dfaf3f';
    ctx.font = '28px "Space Grotesk", sans-serif';
    ctx.fillText('☾   WRITE IT, WIRE IT IN   ☽', 540, 1620);

    // Trigger download
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanName = slugify(currentUser?.name || 'visherai');
      link.download = `visherai-intention-${cleanName}-${entry.ts}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to export canvas image:', e);
      alert('Could not download image. Please check your browser permissions.');
    }
  };

  // ---------- STORY CARD SHARING (NATIVE WEB SHARE) ----------
  const handleShareToStory = async () => {
    const shareUrl = window.location.origin;
    const text = `I sealed my written star intention on Visherai today: "${sharingText || sharingEntry?.text}"`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Visherai Celestial Alignment',
          text: text,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Native share canceled or failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      } catch (err) {
        console.error('Failed to copy share link:', err);
      }
    }
  };

  // ---------- CONSTELLATION GRAPHICS GENERATION ----------
  const layoutPositions = (n: number) => {
    const cx = 380, cy = 210;
    const positions = [];
    for (let i = 0; i < n; i++) {
      const angle = i * 2.4;
      const radius = 18 + i * (150 / Math.max(n, 8));
      const x = cx + Math.cos(angle) * radius * 0.9;
      const y = cy + Math.sin(angle) * radius * 0.5;
      positions.push({
        x: Math.max(24, Math.min(736, x)),
        y: Math.max(24, Math.min(396, y))
      });
    }
    return positions;
  };

  const positions = layoutPositions(entries.length);

  const handleStarMouseEnter = (entry: JournalEntry, pos: { x: number; y: number }, isLatest: boolean) => {
    const date = new Date(entry.ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const textPreview = entry.text.length > 140 ? entry.text.slice(0, 140) + '…' : entry.text;

    const svgElement = constellationSvgRef.current;
    if (!svgElement) return;

    const rect = svgElement.getBoundingClientRect();
    const scaleX = rect.width / 760;
    const scaleY = rect.height / 420;

    setTooltip({
      visible: true,
      text: textPreview,
      date,
      left: Math.min(rect.width - 270, pos.x * scaleX + 12),
      top: Math.max(0, pos.y * scaleY - 10),
      actionAnchor: entry.actionAnchor,
    });
  };

  const handleStarMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const todayDateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const words = entryText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <canvas id="stars" ref={canvasRef}></canvas>

      {/* SIGN-IN GATE */}
      {!currentUser ? (
        <div id="gate">
          <div className="gate-card">
            <div className="flex justify-center mb-5">
              <img
                src="/favicon.svg"
                alt="Visherai Logo"
                className="w-24 h-24 rounded-full border border-[#d4af37]/20 shadow-[0_0_30px_rgba(139,92,246,0.25)] select-none pointer-events-none object-contain"
              />
            </div>
            <div className="gate-mark">Visherai</div>
            <p className="gate-sub">Tell me what to call you, and I'll open the sky you left off at.</p>
            <input
              id="nameInput"
              placeholder="Your name"
              maxLength={40}
              value={nameInputValue}
              onChange={(e) => setNameInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSignIn();
              }}
            />
            <button className="btn btn-primary" id="enterBtn" style={{ width: '100%' }} onClick={handleSignIn}>
              Open my sky
            </button>
            <p className="gate-note">
              No password, no account creation — just a name, so your entries know who's coming back. Use the same name each time to see your own history.
            </p>
          </div>
        </div>
      ) : (
        <div className="wrap" id="app">
          {/* HERO */}
          <header className="hero">
            <span className="eyebrow">a quiet place between mind and universe</span>
            <div id="greeting">Welcome back, {currentUser.name}</div>
            
            {/* Streak Counter Badge */}
            <div className="streak-badge" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(196, 166, 255, 0.05)',
              border: '1px solid var(--line)',
              borderRadius: '99px',
              padding: '0.4rem 1rem',
              fontSize: '0.75rem',
              color: 'var(--starlight)',
              fontFamily: 'var(--font-body)',
              marginTop: '0.2rem',
              marginBottom: '1rem',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 12px rgba(139, 92, 246, 0.03)'
            }}>
              {streak.current > 0 ? (
                <>
                  <Flame size={14} className="text-[#f3d38a]" fill="currentColor" style={{ color: 'var(--gold)', filter: 'drop-shadow(0 0 4px rgba(243, 211, 138, 0.4))' }} />
                  <span>
                    <strong style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '0.85rem' }}>{streak.current}</strong> day streak
                  </span>
                  {streak.longest > streak.current && (
                    <span style={{ opacity: 0.6, fontSize: '0.7rem', borderLeft: '1px solid var(--line)', paddingLeft: '0.5rem', marginLeft: '0.2rem' }}>
                      Best: {streak.longest}d
                    </span>
                  )}
                  <span style={{ fontSize: '0.7rem', color: 'var(--nebula-soft)', marginLeft: '0.2rem' }}>
                    ✦ Active focus
                  </span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-[#c4a6ff]" style={{ color: 'var(--nebula-soft)' }} />
                  <span style={{ opacity: 0.85 }}>
                    Write today's manifestation to start a streak
                  </span>
                  {streak.longest > 0 && (
                    <span style={{ opacity: 0.6, fontSize: '0.7rem', borderLeft: '1px solid var(--line)', paddingLeft: '0.5rem', marginLeft: '0.2rem' }}>
                      Best: {streak.longest}d
                    </span>
                  )}
                </>
              )}
            </div>

            <svg id="mindverse" viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="headFade" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#3d2f66" stopOpacity="0.95" />
                  <stop offset="55%" stopColor="#5b3fa0" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M110,455 C108,370 100,340 108,300 C114,240 150,190 200,190 C250,190 286,240 292,300 C300,340 292,370 290,455 Z"
                fill="url(#headFade)"
              />
              <circle cx="200" cy="150" r="82" fill="url(#headFade)" />
              <g id="galaxyLayer" ref={galaxyLayerRef}></g>
            </svg>
            <div className="wordmark">Visherai</div>
            <p className="tagline">
              Write what you want to become true. One line a day, sent out into the dark, held where you can watch it gather light.
            </p>
            <div className="cta-row">
              <button
                className="btn btn-primary"
                onClick={() => document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Begin today's entry
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => document.getElementById('research')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How this works
              </button>
            </div>
          </header>

          {/* JOURNAL SECTION */}
          <section id="journal">
            <span className="section-label">Daily practice</span>
            <h2>Say it like it's already yours.</h2>
            <p className="lede">
              Write in the present tense, as if it has already arrived. No length requirement — one honest sentence outweighs a page written on autopilot.
            </p>

            <div className="page-stage page-stack" style={{ perspective: '1200px' }}>
              <div 
                className="paper-page overflow-hidden relative"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const width = rect.width;
                  const height = rect.height;
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  const xNorm = (x / width) - 0.5;
                  const yNorm = (y / height) - 0.5;
                  
                  // Smoothly tilt card based on cursor coordinates
                  const rX = -yNorm * 7; // Tilt up/down
                  const rY = xNorm * 7;  // Tilt left/right
                  
                  setPaperTilt({ rotateX: rX, rotateY: rY });
                  setPaperMousePos({ x, y });
                }}
                onMouseEnter={() => setIsHoveringPaper(true)}
                onMouseLeave={() => {
                  setIsHoveringPaper(false);
                  setPaperTilt({ rotateX: 0, rotateY: 0 });
                }}
                style={{
                  transform: isHoveringPaper 
                    ? `rotateX(${paperTilt.rotateX}deg) rotateY(${paperTilt.rotateY}deg) rotate(-0.4deg) scale(1.02)` 
                    : `rotateX(0deg) rotateY(0deg) rotate(-0.4deg) scale(1)`,
                  transition: isHoveringPaper ? 'transform 0.05s ease-out, box-shadow 0.1s ease-out' : 'transform 0.4s ease-out, box-shadow 0.4s ease-out',
                  transformStyle: 'preserve-3d',
                  boxShadow: isHoveringPaper 
                    ? '0 35px 80px rgba(0,0,0,0.65), 0 5px 15px rgba(139, 92, 246, 0.08)' 
                    : '0 25px 60px rgba(0,0,0,0.5), 0 2px 0 rgba(0,0,0,0.05)',
                }}
              >
                <div className="seal relative z-10">✦</div>
                <div className="page-head relative z-10">
                  <span className="page-date" id="todayDate">
                    {todayDateStr}
                  </span>
                  <span className="page-prompt">"I am..." / "I have..." / "Thank you for..."</span>
                </div>
                <textarea
                  id="entryInput"
                  className="relative z-10"
                  placeholder="I am walking into the room and it already feels like mine..."
                  value={entryText}
                  onChange={(e) => setEntryText(e.target.value)}
                ></textarea>
                <div className="page-footer relative z-10">
                  <span className="word-count" id="wordCount">
                    {words} word{words === 1 ? '' : 's'}
                  </span>
                  <span className="status-msg" id="statusMsg">
                    {statusMsg}
                  </span>
                </div>
                <div className="page-actions relative z-10 flex flex-wrap items-center justify-between gap-3">
                  <button className="btn btn-primary" id="saveBtn" onClick={handleSaveEntry} disabled={isSaving}>
                    Send it out
                  </button>
                  {entries.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => setIsBreathingActive(true)}
                        className="text-[11px] text-[#c4a6ff] hover:text-[#dfaf3f] flex items-center gap-1.5 font-mono px-3.5 py-2 bg-[#120a1c] hover:bg-[#1a0f28] border border-[#d4af37]/20 rounded-lg transition-all duration-200 hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] active:scale-95 cursor-pointer"
                      >
                        <span>✦</span> 1-Min Neural booster
                      </button>
                      <button 
                        onClick={() => {
                          setAnchorTrigger('');
                          setAnchorAction('');
                          setIsActionBridgeActive(true);
                        }}
                        className="text-[11px] text-[#dfaf3f] hover:text-white flex items-center gap-1.5 font-mono px-3.5 py-2 bg-[#141008] hover:bg-[#1f1a0d] border border-[#d4af37]/30 rounded-lg transition-all duration-200 hover:shadow-[0_0_15px_rgba(223,175,63,0.15)] active:scale-95 cursor-pointer"
                      >
                        <span>✦</span> Action Bridge (WOOP)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {entries.length > 0 && entries[entries.length - 1]?.actionAnchor && (
              <div className="max-w-2xl mx-auto mt-8 border border-[#d4af37]/35 rounded-xl bg-gradient-to-r from-[#141008] to-[#0d0914] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-fade-in">
                <div className="w-10 h-10 rounded-full border border-[#dfaf3f]/30 flex items-center justify-center text-[#dfaf3f] text-sm shrink-0 bg-[#dfaf3f]/5 animate-pulse">
                  ✦
                </div>
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-mono tracking-widest text-[#dfaf3f] uppercase block">ACTIVE NEURAL ACTION ANCHOR</span>
                  <p className="text-sm font-serif italic text-white/95">
                    "If I feel <strong className="text-[#a78bfa]">{entries[entries.length - 1].actionAnchor?.trigger}</strong>, then I will <strong className="text-[#22d3ee]">{entries[entries.length - 1].actionAnchor?.action}</strong>."
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setAnchorTrigger(entries[entries.length - 1].actionAnchor?.trigger || '');
                    setAnchorAction(entries[entries.length - 1].actionAnchor?.action || '');
                    setIsActionBridgeActive(true);
                  }}
                  className="text-[10px] font-mono text-[#c4a6ff] hover:text-white border border-[#c4a6ff]/20 hover:border-[#dfaf3f] rounded px-2.5 py-1 transition-colors cursor-pointer shrink-0"
                >
                  Edit Anchor
                </button>
              </div>
            )}

            {/* CONSTELLATION SVG */}
            <div className="constellation-wrap">
              <div className="constellation-title">Your constellation — every entry becomes a star</div>
              <div style={{ position: 'relative' }}>
                <svg id="constellation" viewBox="0 0 760 420" xmlns="http://www.w3.org/2000/svg" ref={constellationSvgRef}>
                  {/* Draw Lines */}
                  {positions.map((pos, idx) => {
                    if (idx === 0) return null;
                    const prevPos = positions[idx - 1];
                    return (
                      <line
                        key={`line-${idx}`}
                        x1={prevPos.x}
                        y1={prevPos.y}
                        x2={pos.x}
                        y2={pos.y}
                        stroke="rgba(196,166,255,0.28)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Draw Stars */}
                  {entries.map((entry, idx) => {
                    const pos = positions[idx];
                    if (!pos) return null;
                    const isLatest = idx === entries.length - 1;

                    return (
                      <g
                        key={`star-g-${idx}`}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => handleStarMouseEnter(entry, pos, isLatest)}
                        onMouseLeave={handleStarMouseLeave}
                        onClick={() => handleOpenSharing(entry)}
                      >
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={isLatest ? 13 : 9}
                          fill={isLatest ? 'rgba(243,211,138,0.25)' : 'rgba(139,92,246,0.22)'}
                        />
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={isLatest ? 5 : 3.6}
                          fill={isLatest ? '#f3d38a' : '#e6e1ff'}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Star Tooltip */}
                <div
                  className="star-tip"
                  id="starTip"
                  style={{
                    opacity: tooltip.visible ? 1 : 0,
                    left: `${tooltip.left}px`,
                    top: `${tooltip.top}px`,
                    pointerEvents: 'none',
                    position: 'absolute',
                  }}
                >
                  <strong style={{ color: '#c4a6ff', fontFamily: "'Fraunces', serif", fontStyle: 'italic' }}>
                    {tooltip.date}
                  </strong>
                  <br />
                  <span className="text-starlight block mt-1 mb-2">{tooltip.text}</span>
                  {tooltip.actionAnchor && (
                    <div className="mt-2 pt-2 border-t border-[rgba(196,166,255,0.12)] mb-2">
                      <span className="text-[9px] font-mono tracking-wider text-[#dfaf3f] block uppercase mb-1">Neural Action Bridge</span>
                      <p className="text-[11px] text-white/90 leading-relaxed italic">
                        "If I feel <strong className="text-[#a78bfa]">{tooltip.actionAnchor.trigger}</strong>, then I will <strong className="text-[#22d3ee]">{tooltip.actionAnchor.action}</strong>."
                      </p>
                    </div>
                  )}
                  <div className="text-[10px] text-[#f3d38a] font-medium tracking-wider flex items-center gap-1 border-t border-[rgba(196,166,255,0.15)] pt-1">
                    <span>✦</span> Click star to design &amp; save
                  </div>
                </div>
              </div>

              {entries.length === 0 && (
                <div className="empty-sky" id="emptySky">
                  Nothing written yet. Your first entry will light the first star.
                </div>
              )}
            </div>



            {/* DAILY REMINDER CARD */}
            <div className="reminder-card">
              <div className="reminder-left">
                <h3>Daily reminder</h3>
                <p>
                  One notification, once a day, while this tab is open. Not a phone alert — just a nudge if Visherai is open somewhere in your browser.
                </p>
              </div>
              <div className="reminder-right">
                <input
                  type="time"
                  id="reminderTime"
                  value={reminderTime}
                  onChange={handleReminderTimeChange}
                />
                <button className="btn btn-ghost" id="reminderBtn" onClick={handleToggleReminder}>
                  {reminderEnabled ? 'Turn off' : 'Enable reminder'}
                </button>
              </div>
              {reminderStatus && (
                <div className="reminder-status" id="reminderStatus">
                  {reminderStatus}
                </div>
              )}
            </div>
          </section>

          {/* RESEARCH SECTION */}
          <section id="research" className="research-section">
            <span className="section-label">The honest version</span>
            <h2>What's actually happening when you manifest</h2>
            <p className="lede">
              "Manifestation" is an old, spiritual word for a few things psychology and neuroscience can explain in plainer terms. None of it requires the universe to rearrange itself — it works because <em>you</em> change, and that changes what you notice, attempt, and follow through on.
            </p>

            {/* PERSONALIZED INSIGHT CARD */}
            <div className="insight-card" id="insightCard">
              <span className="insight-tag">Based on what you wrote</span>
              <div id="insightContent">
                {insightLoading && <p className="insight-loading">Reading what you wrote…</p>}
                
                {insightError && <p className="insight-empty">{insightError}</p>}
                
                {!insightLoading && !insightError && !insight && (
                  <p className="insight-empty">
                    Write and send out today's entry, and this section will reflect back which of these principles is doing the most work in it.
                  </p>
                )}

                {!insightLoading && !insightError && insight && (
                  <>
                    <div className="insight-theme">{insight.theme}</div>
                    <div className="insight-body">
                      <strong style={{ color: 'var(--nebula-soft)' }}>{insight.principle}.</strong> {insight.insight}
                    </div>
                    <div className="insight-action">
                      <strong>Try today:</strong> {insight.action}
                    </div>
                    <div className="mt-5 pt-4 border-t border-[rgba(196,166,255,0.12)] flex flex-wrap gap-2 items-center justify-between">
                      <span className="text-[10px] font-mono text-[#c4a6ff]/70 tracking-wider">NEURAL WIRING PRACTICES</span>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => setIsBreathingActive(true)}
                          className="bg-[#120a1c] hover:bg-[#dfaf3f] text-[#c4a6ff] hover:text-black border border-[#d4af37]/30 px-3.5 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200 flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(212,175,55,0.15)] active:scale-95 cursor-pointer"
                        >
                          <span>✦</span> 1-Min Rehearsal
                        </button>
                        <button 
                          onClick={() => {
                            setAnchorTrigger('');
                            setAnchorAction('');
                            setIsActionBridgeActive(true);
                          }}
                          className="bg-[#141008] hover:bg-[#dfaf3f] text-[#dfaf3f] hover:text-black border border-[#d4af37]/40 px-3.5 py-1.5 rounded-lg text-[11px] font-mono transition-all duration-200 flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(223,175,63,0.15)] active:scale-95 cursor-pointer"
                        >
                          <span>✦</span> Build Action Bridge (WOOP)
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="principle-grid">
              <div className="principle">
                <div className="glyph">i</div>
                <h3>Selective attention</h3>
                <p>
                  Your brain filters an overwhelming amount of sensory input and only lets a fraction reach conscious awareness — it prioritizes whatever you've told it matters. Write "I am opening a bakery" daily, and your mind starts flagging vacant storefronts, small-business grants, and conversations about ovens that it used to filter out as noise.
                </p>
              </div>
              <div className="principle">
                <div className="glyph">ii</div>
                <h3>Self-fulfilling prophecy</h3>
                <p>
                  Expectations shape behavior. Believing you'll do well in an interview tends to make you sit taller, speak slower, and recover faster from an awkward question — which genuinely changes the outcome. Believing you'll fail tends to produce the opposite. The belief itself doesn't move the world; it moves you first.
                </p>
              </div>
              <div className="principle">
                <div className="glyph">iii</div>
                <h3>Self-efficacy &amp; growth mindset</h3>
                <p>
                  Research on mindset shows that people who believe an ability can be built, rather than fixed, put in more effort and recover better from setbacks. Writing a goal as already true is a way of practicing that belief daily until it's sturdy enough to survive a bad week.
                </p>
              </div>
              <div className="principle">
                <div className="glyph">iv</div>
                <h3>Mental rehearsal</h3>
                <p>
                  Vividly imagining an action activates overlapping brain regions to actually doing it — which is why athletes visualize before competing. It sharpens intention and reduces hesitation. On its own, though, imagined success can feel enough like the real thing to quietly lower your drive to pursue it.
                </p>
              </div>
            </div>

            <div className="honest-box">
              <h4>The part most manifestation content leaves out</h4>
              <p>
                Writing "it is already mine" and stopping there is where things fall apart. The research is consistent: visualization paired with realism — naming the obstacle in your way and deciding what you'll do about it — outperforms visualization alone. Belief opens the door; it still takes a hand to walk through it. Use Visherai for the belief. Bring your own follow-through for the rest.
              </p>
            </div>
          </section>

          {/* STORAGE & PRIVACY */}
          <section id="privacy">
            <span className="section-label">Storage &amp; privacy</span>
            <h2>Where your words actually go</h2>
            <p className="lede">
              A journal only works if it feels safe to be honest in. Here's exactly what happens to what you write — no vague policy language.
            </p>

            <div className="privacy-grid">
              <div className="privacy-item">
                <h3>Stored under your name only</h3>
                <p>
                  Each entry is saved under the name you signed in with. Nothing you write is pooled with anyone else's entries or made public anywhere on this page.
                </p>
              </div>
              <div className="privacy-item">
                <h3>Nothing sold, nothing shared</h3>
                <p>
                  There's no analytics pixel or ad partner reading your entries. The words you write stay between you and the page.
                </p>
              </div>
              <div className="privacy-item">
                <h3>You can leave with nothing left behind</h3>
                <p>
                  Use the control below to permanently remove every entry saved under your name from this device's storage, any time.
                </p>
              </div>
            </div>

            <div className="danger-zone">
              <p>This deletes every star in your constellation. It can't be undone.</p>
              <button className="btn btn-danger" id="clearDataBtn" onClick={handleClearData}>
                Erase my entries
              </button>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq">
            <span className="section-label">Questions & Science</span>
            <h2>Manifestation, Privacy & Terms</h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary>What is Visherai (Vish) and how does manifestation actually work?</summary>
                <p>
                  Visherai (often referred to as <strong>Vish</strong> by our community) is a daily intention-mapping and alignment journal. 
                  Unlike magical thinking, Visherai is grounded in established cognitive psychology. When you write your intentions in the present tense, you trigger several active psychological mechanisms:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-dim text-xs">
                  <li><strong>Selective Attention (The Reticular Activating System):</strong> By defining your focus, your brain filters out noise and highlights opportunities, connections, and paths that you would otherwise miss.</li>
                  <li><strong>Self-Fulfilling Prophecy:</strong> Visualizing and writing down a positive reality changes your micro-behaviors, confidence levels, and how you present yourself to others, naturally inviting positive outcomes.</li>
                  <li><strong>Self-Efficacy:</strong> Reinforcing your capability to achieve goals breaks down the intimidation factor, leading to direct, sustained actions.</li>
                  <li><strong>Mental Rehearsal:</strong> Like an athlete visualizing a routine, writing about your desired state prepares your nervous system for the focus and calm required to execute it.</li>
                </ul>
              </details>

              <details className="faq-item">
                <summary>Privacy Policy: How is my personal data secured?</summary>
                <p>
                  At Visherai, privacy is not a feature — it is our core architecture. Your journal entries, personal goals, and manifested stars are stored <strong>privately</strong> under your designated identifier. 
                  Our system is designed with a zero-exposure data mandate:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-dim text-xs">
                  <li>We do not sell, rent, trade, or share your journal entries or personal information with any third-party advertisers or data brokers.</li>
                  <li>Your data is used solely to render your personal interactive star constellation and generate your custom psychological insights using server-side processing.</li>
                  <li>You maintain absolute ownership and control over your data. You can erase your entire history instantly with a single click using the <strong>Erase my entries</strong> button in your settings panel.</li>
                </ul>
              </details>

              <details className="faq-item">
                <summary>Terms of Service & Usage Agreement</summary>
                <p>
                  By utilizing Visherai, you agree to a respectful, self-aligned journaling practice:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-dim text-xs">
                  <li><strong>Personal Reflection Only:</strong> Visherai is provided solely for personal development, mindfulness, goal setting, and positive mental rehearsal.</li>
                  <li><strong>Intellectual Property:</strong> All text, designs, cosmic layouts, and digital Tarot bookmark generated during your session are owned fully by you for personal distribution and sharing.</li>
                  <li><strong>No Warranty:</strong> Visherai is provided "as is" without any guarantees. While we leverage cognitive principles to promote alignment, active real-world effort is the primary driver of your success.</li>
                  <li><strong>Not Medical Advice:</strong> Visherai is a mindfulness journal and does not substitute for professional counseling, therapy, or mental health support.</li>
                </ul>
              </details>

              <details className="faq-item">
                <summary>Do I need an account or password to use Visherai?</summary>
                <p>
                  No password required. Visherai identifies your cosmic alignment purely using your designated name. Type the exact same name whenever you return, and your active star constellation will compile and render instantly. This ensures frictionless entry while keeping your daily focus highly accessible.
                </p>
              </details>

              <details className="faq-item">
                <summary>What happens if I sign in under a different name next time?</summary>
                <p>
                  You will start a fresh, empty night sky under that new name. Your original constellation is never deleted; it remains securely sealed under your first name, waiting for you to sign back in with it.
                </p>
              </details>

              <details className="faq-item">
                <summary>Can I write more than one manifestation entry per day?</summary>
                <p>
                  Yes, there is no limit. You can map out separate daily areas of focus (such as career, relationship, well-being, or creativity) at any time. Each written intention expands your constellation and updates your cosmic path.
                </p>
              </details>

              <details className="faq-item">
                <summary>How does the AI Science Engine analyze my daily entries?</summary>
                <p>
                  When you submit your journal, Visherai analyzes the core focus areas of your text using custom-designed server-side processing. Instead of standard generic replies, the system extracts the specific psychological principle in play (e.g., self-efficacy, mental rehearsal) and maps out a concrete, actionable task to help you ground your intention in immediate real-world action.
                </p>
              </details>
            </div>
          </section>

          {/* FOOTER */}
          <footer>
            <div className="footer-links mb-4 text-[10px] tracking-wider text-dim space-x-4">
              <a href="#about" className="hover:text-[#dfaf3f] transition-colors">Science</a>
              <span className="opacity-30">·</span>
              <a href="#faq" className="hover:text-[#dfaf3f] transition-colors">Privacy Policy</a>
              <span className="opacity-30">·</span>
              <a href="#faq" className="hover:text-[#dfaf3f] transition-colors">Terms of Service</a>
              <span className="opacity-30">·</span>
              <a href="#faq" className="hover:text-[#dfaf3f] transition-colors">Contact Support</a>
            </div>
            <span className="mark">Visherai</span>
            Signed in as <span id="footerName">{currentUser.name}</span> ·{' '}
            <span className="switch-link" id="switchProfile" onClick={handleSwitchProfile}>
              not you? switch
            </span>
            <br />
            <br />
            <span className="text-[10.5px] opacity-70">
              © 2026 Visherai (Vish). All rights reserved. Entries are stored privately under your name. No third-party sharing or cookies are used for marketing.
            </span>
          </footer>

          {/* STORY CARD DESIGNER MODAL */}
          {sharingEntry && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020205]/95 backdrop-blur-lg overflow-y-auto">
              <div className="bg-[#08080f] border border-[#d4af37]/30 rounded-2xl w-full max-w-3xl shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col md:flex-row overflow-hidden my-auto max-h-[95vh] md:max-h-[85vh]">
                
                {/* PREVIEW CONTAINER (Left Column) */}
                <div className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center bg-radial from-[#0e0c1a] to-[#040308] border-b md:border-b-0 md:border-r border-[#d4af37]/20 select-none">
                  <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-[#dfaf3f] mb-4">Celestial Intention Card</span>
                  
                  {/* The Intention Card */}
                  <div className="relative w-[280px] h-[497px] rounded-xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex flex-col justify-between p-6 border border-[#d4af37]/30 bg-[#040308] text-[#dfaf3f]">
                    {/* Soft central gold glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.15),transparent_75%)] pointer-events-none"></div>
                    
                    {/* Starfield background dots */}
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(1px_1px_at_20px_30px,#fff,transparent),radial-gradient(1.5px_1.5px_at_120px_150px,#ffeeb5,transparent),radial-gradient(1px_1px_at_210px_70px,#fff,transparent)] pointer-events-none"></div>

                    {/* Ornate gilded double borders */}
                    <div className="absolute inset-2 border border-[#d4af37]/60 rounded pointer-events-none"></div>
                    <div className="absolute inset-3 border border-[#d4af37]/30 rounded pointer-events-none"></div>

                    {/* Corner Stars */}
                    <span className="absolute top-4 left-4 text-[8px] text-[#d4af37]">✦</span>
                    <span className="absolute top-4 right-4 text-[8px] text-[#d4af37]">✦</span>
                    <span className="absolute bottom-4 left-4 text-[8px] text-[#d4af37]">✦</span>
                    <span className="absolute bottom-4 right-4 text-[8px] text-[#d4af37]">✦</span>

                    {/* Content */}
                    <div className="z-10 text-center flex flex-col h-full justify-between py-1">
                      {/* Header */}
                      <div>
                        <span className="text-[9px] font-sans font-bold tracking-[0.35em] text-[#9a94c9] block">VISHERAI  ·  ALIGNMENT</span>
                        <span className="text-[10px] text-[#d4af37]/60 block mt-0.5">☾ ◯ ☽</span>
                      </div>

                      {/* Center Manifestation Text Display */}
                      <div className="my-auto px-2 py-4">
                        <span className="text-xl font-serif text-[#dfaf3f] leading-none block mb-2">“</span>
                        <p className="text-xs md:text-sm font-serif italic text-white/95 leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar px-1">
                          {sharingEntry.text}
                        </p>
                        <span className="text-xl font-serif text-[#dfaf3f] leading-none block mt-2">”</span>
                      </div>

                      {/* Footer labels */}
                      <div className="space-y-1">
                        <div className="w-10 h-[1px] bg-[#d4af37]/30 mx-auto mt-1"></div>
                        <span className="text-[9px] tracking-widest text-[#dfaf3f] font-semibold block uppercase">INTENTION SEALED</span>
                        <span className="text-[8px] tracking-wider text-dim block uppercase">By {currentUser?.name}</span>
                        <span className="text-[8px] font-serif italic text-[#dfaf3f]/70 block">
                          {new Date(sharingEntry.ts).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[9px] text-[#d4af37]/50 block">☽  ◯  ☾</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONTROLS PANEL (Right Column) */}
                <div className="w-full md:w-[320px] p-6 flex flex-col justify-between overflow-y-auto">
                  <div className="space-y-5">
                    <div>
                      <h4 className="font-serif font-semibold text-lg text-[#dfaf3f] tracking-wide mb-1">Sealed Intention</h4>
                      <p className="text-[11px] text-[#9a94c9]/90 leading-relaxed font-sans">
                        Your manifestation has been cleanly compiled and saved. Download your beautiful custom alignment card as a high-resolution PNG to keep close to you.
                      </p>
                    </div>

                    <div className="bg-[#0c0c16] border border-[#d4af37]/20 rounded-lg p-4 space-y-2.5 font-mono text-[10px] text-[#c4a6ff]">
                      <div className="flex justify-between">
                        <span className="opacity-70">CREATOR:</span>
                        <span className="text-[#dfaf3f] truncate max-w-[150px]">{currentUser?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">FOCUS TYPE:</span>
                        <span className="text-[#dfaf3f]">COSMIC INTENTION</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-70">DATE RECORDED:</span>
                        <span className="text-[#dfaf3f]">
                          {new Date(sharingEntry.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Share Option */}
                    <div className="border border-[#d4af37]/15 rounded-lg p-3 bg-[#0a0614]/50 space-y-2.5">
                      <span className="text-[10px] font-mono tracking-wider text-[#d4af37] block">✦ SHARE APP LINK</span>
                      <button 
                        onClick={handleShareToStory}
                        className="w-full bg-[#120a1c] hover:bg-[#1a0f28] text-[#c4a6ff] hover:text-white border border-[#d4af37]/30 text-[11px] font-mono py-1.5 px-3 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        {typeof navigator.share === 'function' ? 'Share App Link' : (linkCopied ? 'Link Copied!' : 'Copy Share Link')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-6 border-t border-[#d4af37]/20 mt-6">
                    <button 
                      className="w-full bg-gradient-to-r from-[#dfaf3f] to-[#bfa035] hover:from-[#fcd34d] hover:to-[#dfaf3f] text-[#040308] font-semibold text-xs py-2.5 rounded-lg shadow-lg shadow-yellow-500/10 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                      onClick={() => handleDownloadCard(sharingEntry)}
                    >
                      <span>✦</span> Download Intention Card (PNG)
                    </button>
                    <button 
                      className="w-full bg-white/[0.03] hover:bg-white/[0.08] text-dim hover:text-white border border-[#d4af37]/10 text-xs py-2 rounded-lg transition-all"
                      onClick={() => setSharingEntry(null)}
                    >
                      Close Card
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* 1-MINUTE NEURAL INTEGRATION BOOSTER MODAL */}
          {isBreathingActive && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#020205]/98 backdrop-blur-2xl text-white select-none animate-fade-in">
              
              {/* Top Bar Controls */}
              <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[#dfaf3f] text-sm">✦</span>
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#9a94c9]">1-Minute Neural Rehearsal</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      const newMuted = !isMuted;
                      setIsMuted(newMuted);
                      try {
                        localStorage.setItem('visherai:muted', String(newMuted));
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="text-xs font-mono text-dim hover:text-white border border-white/10 rounded-full px-3.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5"
                    title={isMuted ? "Enable sound" : "Mute sound"}
                  >
                    <span>{isMuted ? '🔇 Sound Off' : '🔊 Sound On'}</span>
                  </button>
                  <button 
                    onClick={() => setIsBreathingActive(false)}
                    className="text-xs font-mono text-dim hover:text-white border border-white/10 rounded-full px-3.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    Skip Exercise
                  </button>
                </div>
              </div>

              {/* Main Breathing visual core */}
              <div className="flex-1 flex flex-col items-center justify-center max-w-xl text-center space-y-12">
                
                {/* Active Intention Reminder */}
                <div className="space-y-2 px-4">
                  <span className="text-[10px] font-mono text-[#dfaf3f] tracking-[0.3em] uppercase block">ACTIVE REHEARSAL FOCUS</span>
                  <p className="text-lg md:text-2xl font-serif italic text-white/90 leading-relaxed drop-shadow-[0_2px_10px_rgba(139,92,246,0.3)]">
                    “ {entries[entries.length - 1]?.text || "Your written focus will appear here..."} ”
                  </p>
                </div>

                {/* Breathing Circle Container */}
                <div className="relative w-72 h-72 flex items-center justify-center">
                  
                  {/* Outer static gold ring */}
                  <div className="absolute inset-0 rounded-full border border-[#d4af37]/20"></div>
                  
                  {/* Outer dotted pulsing ring */}
                  <div className="absolute -inset-4 rounded-full border border-dashed border-[#9a94c9]/10 animate-spin" style={{ animationDuration: '60s' }}></div>

                  {/* Breathing dynamic core */}
                  <div 
                    className="w-40 h-40 rounded-full border-2 flex flex-col items-center justify-center"
                    style={{
                      transform: breathingPhase === 'inhale' ? 'scale(1.5)' : breathingPhase === 'hold' ? 'scale(1.5)' : 'scale(1.0)',
                      borderColor: breathingPhase === 'inhale' ? '#22d3ee' : breathingPhase === 'hold' ? '#dfaf3f' : '#a78bfa',
                      boxShadow: breathingPhase === 'inhale' 
                        ? '0 0 40px rgba(34, 211, 238, 0.4)' 
                        : breathingPhase === 'hold' 
                        ? '0 0 50px rgba(223, 175, 63, 0.6)' 
                        : '0 0 20px rgba(167, 139, 250, 0.2)',
                      transition: 'transform 4s cubic-bezier(0.4, 0, 0.2, 1), border-color 1.5s ease, box-shadow 1.5s ease',
                    }}
                  >
                    {/* Time Counter */}
                    <span className="text-4xl font-mono tracking-wider font-light tabular-nums text-white">
                      00:{breathingSecondsLeft < 10 ? '0' : ''}{breathingSecondsLeft}
                    </span>
                    <span className="text-[9px] font-mono text-[#9a94c9] uppercase tracking-wider mt-1">
                      {breathingSecondsLeft}s left
                    </span>
                  </div>

                </div>

                {/* Text prompts & actions */}
                <div className="space-y-3">
                  <div className="h-8">
                    {breathingPhase === 'inhale' && (
                      <span className="text-xl font-medium tracking-wide text-[#22d3ee] animate-pulse">
                        ✦ Breathe In the Focus...
                      </span>
                    )}
                    {breathingPhase === 'hold' && (
                      <span className="text-xl font-medium tracking-wide text-[#dfaf3f] animate-pulse">
                        ✦ Hold and Wire It In...
                      </span>
                    )}
                    {breathingPhase === 'exhale' && (
                      <span className="text-xl font-medium tracking-wide text-[#a78bfa] animate-pulse">
                        ✦ Exhale all Resistance...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9a94c9] max-w-sm mx-auto leading-relaxed">
                    Focused breathing triggers alpha waves and lowers cognitive noise, making your written intentions significantly more likely to stick in your memory.
                  </p>
                </div>

              </div>

              {/* Progress bar timeline at bottom */}
              <div className="w-full max-w-md bg-white/[0.05] h-1 rounded-full overflow-hidden mb-6">
                <div 
                  className="bg-gradient-to-r from-[#a78bfa] via-[#22d3ee] to-[#dfaf3f] h-full transition-all duration-1000"
                  style={{ width: `${((60 - breathingSecondsLeft) / 60) * 100}%` }}
                ></div>
              </div>

            </div>
          )}

          {/* ACTION ANCHOR BRIDGE BUILDER MODAL */}
          {isActionBridgeActive && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#020205]/98 backdrop-blur-2xl text-white select-none animate-fade-in">
              {/* Header Controls */}
              <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[#dfaf3f] text-sm">✦</span>
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#9a94c9]">Neural Action Anchor Bridge (WOOP Method)</span>
                </div>
                <button 
                  onClick={() => setIsActionBridgeActive(false)}
                  className="text-xs font-mono text-dim hover:text-white border border-white/10 rounded-full px-3 py-1 bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Core Builder */}
              <div className="flex-1 flex flex-col items-center justify-center max-w-lg w-full text-center space-y-8 px-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-[#dfaf3f] tracking-[0.3em] uppercase block">THE RESEARCH PRINCIPLE</span>
                  <h3 className="text-xl md:text-2xl font-serif text-white/95">Overcoming Visualization Bias</h3>
                  <p className="text-xs text-[#9a94c9] leading-relaxed max-w-sm mx-auto">
                    Psychologist Gabriele Oettingen proved that positive thinking alone lowers motivation. Pairing your wish with a concrete obstacle and a micro-plan increases follow-through success rates by up to 300%.
                  </p>
                </div>

                {/* Formula display */}
                <div className="w-full bg-[#120a1c]/60 border border-[#d4af37]/20 rounded-xl p-5 text-left space-y-3 shadow-lg shadow-purple-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#dfaf3f]/5 to-transparent pointer-events-none"></div>
                  
                  {/* Step 1: Manifestation Wish */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-[#dfaf3f] tracking-wider uppercase block">1. Today's Intention (WISH)</span>
                    <p className="text-sm font-serif italic text-white/80 line-clamp-2">
                      “ {entries[entries.length - 1]?.text || "No active intention written today."} ”
                    </p>
                  </div>

                  {/* Step 2: Obstacle Input */}
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
                    <label htmlFor="obstacleInput" className="text-[9px] font-mono text-[#a78bfa] tracking-wider uppercase block">
                      2. What obstacle or distraction might get in your way today?
                    </label>
                    <input 
                      id="obstacleInput"
                      type="text" 
                      placeholder="e.g., procrastination, feeling tired, social media scrolling" 
                      value={anchorTrigger}
                      onChange={(e) => setAnchorTrigger(e.target.value)}
                      className="w-full bg-[#040308] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a78bfa] transition-all font-sans"
                    />
                  </div>

                  {/* Step 3: Plan Input */}
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
                    <label htmlFor="planInput" className="text-[9px] font-mono text-[#22d3ee] tracking-wider uppercase block">
                      3. What is one 2-minute action you will take to cross it?
                    </label>
                    <input 
                      id="planInput"
                      type="text" 
                      placeholder="e.g., open my editor and write one line, set a 10-minute timer" 
                      value={anchorAction}
                      onChange={(e) => setAnchorAction(e.target.value)}
                      className="w-full bg-[#040308] border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22d3ee] transition-all font-sans"
                    />
                  </div>
                </div>

                {/* Compiled Statement preview */}
                {anchorTrigger.trim() && anchorAction.trim() && (
                  <div className="space-y-1.5 animate-fade-in">
                    <span className="text-[9px] font-mono text-[#9a94c9] tracking-widest uppercase block">COMPILED IMPLICIT TRIGGER</span>
                    <p className="text-sm md:text-base font-serif italic text-[#dfaf3f] leading-relaxed">
                      "If I feel <strong className="text-[#a78bfa]">{anchorTrigger.trim()}</strong>, then I will <strong className="text-[#22d3ee]">{anchorAction.trim()}</strong>."
                    </p>
                  </div>
                )}

                <div className="w-full max-w-xs pt-4">
                  <button 
                    onClick={handleSaveActionAnchor}
                    className="w-full bg-gradient-to-r from-[#dfaf3f] to-[#bfa035] hover:from-[#fcd34d] hover:to-[#dfaf3f] text-[#040308] font-bold text-xs py-3 rounded-lg shadow-lg shadow-yellow-500/10 transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>✦</span> Wire and Seal Action Bridge
                  </button>
                  <button 
                    onClick={() => setIsActionBridgeActive(false)}
                    className="w-full text-xs text-dim hover:text-white mt-3 transition-colors cursor-pointer"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
