import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type EntryType = 'pushups' | 'pullups' | 'plank' | 'handstand';
type Tab = 'today' | 'trends' | 'settings';
type Theme = 'dark' | 'light';
type Language = 'zh' | 'en';
type TrendRange = 7 | 30;
type QuickTarget = {
  index: number;
  type: Extract<EntryType, 'pushups' | 'pullups'>;
};

type Entry = {
  id: string;
  date: string;
  type: EntryType;
  amount: number;
  createdAt: number;
};

type ExerciseMeta = {
  label: string;
  unit: string;
  defaultValue: number;
  color: string;
  glow: string;
  kind: 'count' | 'time';
};

const databaseName = 'workout-tracker-h5';
const databaseVersion = 1;
const entryStoreName = 'workout_entries';
const quickAmountsStorageKey = 'workout-tracker-h5-quick-amounts';
const themeStorageKey = 'workout-tracker-h5-theme';
const languageStorageKey = 'workout-tracker-h5-language';
const appVersion = 'v0.2.7';

const text = {
  zh: {
    workout: 'Workout',
    todayTitle: '今日训练',
    trainingDays: '训练天数',
    consecutive: '连续',
    days: '天',
    quickLog: '快捷记录',
    longPress: '长按自定义',
    quickAdd: '快速增加',
    timedTraining: '计时训练',
    startTimer: '开始计时',
    save: '保存',
    saveTimer: '完成',
    recentLogs: '最近记录',
    emptyLogs: '暂无记录',
    delete: '删除',
    trends: '趋势',
    totalDays: '训练天数',
    streakDays: '连续天数',
    todayReps: '今日次数',
    timedMinutes: '计时分钟',
    recentDays: '最近',
    trendTitle: '训练走势',
    settings: '设置',
    currentTheme: '当前外观',
    currentLanguage: '当前语言',
    darkMode: '深色模式',
    lightMode: '浅色模式',
    localData: '数据保存在本机 IndexedDB，手机访问时即存于手机本地',
    longPressTip: '长按快捷按钮可自定义数量',
    timerTip: '保存计时后会写入最近记录',
    appearance: '外观模式',
    switchLight: '切换浅色',
    switchDark: '切换深色',
    language: '语言',
    switchEnglish: 'Switch English',
    switchChinese: '切换中文',
    generateData: '随机生成 15-60 天测试数据',
    clearToday: '清除当天数据',
    initData: '初始化数据',
    version: '版本',
    editQuick: '编辑快捷按钮',
    quickAmount: '每次增加数量',
    saveQuick: '保存快捷数量',
    details: '训练详情',
    count: '次数',
    timed: '计时',
    today: '今日',
    noTodayData: '今天还没有训练数据',
    todayCleared: '已清除当天数据',
    initConfirm: '确定初始化数据吗？这会清空这台设备上的所有训练数据，此操作不可撤销。',
    clearTodayConfirm: (count: number) => `确定清除今天的 ${count} 条训练数据吗？历史数据不会受影响。`,
    generateConfirm: (days: number, count: number) => `将追加 ${days} 天、${count} 条随机测试数据，用于测试历史统计。继续吗？`,
    generated: (days: number, count: number) => `已生成 ${days} 天 ${count} 条测试数据`
  },
  en: {
    workout: 'Workout',
    todayTitle: 'Today',
    trainingDays: 'Days',
    consecutive: 'Streak',
    days: 'd',
    quickLog: 'Quick Log',
    longPress: 'Long press',
    quickAdd: 'Quick add',
    timedTraining: 'Timer',
    startTimer: 'Start',
    save: 'Save',
    saveTimer: 'Done',
    recentLogs: 'Recent Logs',
    emptyLogs: 'No records',
    delete: 'Delete',
    trends: 'Trends',
    totalDays: 'Days',
    streakDays: 'Streak',
    todayReps: 'Today Reps',
    timedMinutes: 'Minutes',
    recentDays: 'Last',
    trendTitle: 'Training Trend',
    settings: 'Settings',
    currentTheme: 'Theme',
    currentLanguage: 'Language',
    darkMode: 'Dark',
    lightMode: 'Light',
    localData: 'Data is saved locally in this browser with IndexedDB',
    longPressTip: 'Long press quick buttons to customize amounts',
    timerTip: 'Saved timers are added to recent logs',
    appearance: 'Appearance',
    switchLight: 'Switch Light',
    switchDark: 'Switch Dark',
    language: 'Language',
    switchEnglish: 'Switch English',
    switchChinese: '切换中文',
    generateData: 'Generate 15-60 Days Test Data',
    clearToday: 'Clear Today',
    initData: 'Initialize Data',
    version: 'Version',
    editQuick: 'Edit Quick Button',
    quickAmount: 'Amount per tap',
    saveQuick: 'Save Quick Amount',
    details: 'Details',
    count: 'Reps',
    timed: 'Timed',
    today: 'Today',
    noTodayData: 'No training data today',
    todayCleared: 'Today cleared',
    initConfirm: 'Initialize data? This will clear all workout records on this device.',
    clearTodayConfirm: (count: number) => `Clear ${count} records from today? History will not be affected.`,
    generateConfirm: (days: number, count: number) => `Append ${days} days and ${count} random records for testing?`,
    generated: (days: number, count: number) => `Generated ${days} days and ${count} records`
  }
} satisfies Record<Language, Record<string, string | ((...args: number[]) => string)>>;

const exerciseMeta: Record<EntryType, ExerciseMeta> = {
  pushups: {
    label: '俯卧撑',
    unit: '次',
    defaultValue: 20,
    color: '#4f7cff',
    glow: 'shadow-blue-500/20',
    kind: 'count'
  },
  pullups: {
    label: '引体向上',
    unit: '次',
    defaultValue: 6,
    color: '#45d67b',
    glow: 'shadow-emerald-500/20',
    kind: 'count'
  },
  plank: {
    label: '平板支撑',
    unit: '分钟',
    defaultValue: 90,
    color: '#b85cff',
    glow: 'shadow-purple-500/20',
    kind: 'time'
  },
  handstand: {
    label: '倒立',
    unit: '分钟',
    defaultValue: 45,
    color: '#ff9f2f',
    glow: 'shadow-amber-500/20',
    kind: 'time'
  }
};

const order: EntryType[] = ['pushups', 'pullups', 'plank', 'handstand'];
const countTypes: QuickTarget['type'][] = ['pushups', 'pullups'];
const defaultQuickAmounts: Record<QuickTarget['type'], number[]> = {
  pushups: [10, 20],
  pullups: [3, 5]
};

const pad = (value: number) => String(value).padStart(2, '0');
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const dateKey = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const todayKey = () => dateKey(new Date());

const dateFromKey = (key: string) => new Date(`${key}T00:00:00.000Z`);

const formatTrainingDate = (key: string, language: Language) =>
  dateFromKey(key).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${pad(minutes)}:${pad(rest)}`;
};

const formatAmount = (type: EntryType, amount: number) => {
  const meta = exerciseMeta[type];
  return meta.kind === 'time' ? formatDuration(amount) : amount.toLocaleString('zh-CN');
};

const formatUnit = (type: EntryType) => (exerciseMeta[type].kind === 'time' ? '分钟' : exerciseMeta[type].unit);

const toTrendPercent = (value: number, best: number) => (best > 0 ? Math.round((value / best) * 100) : 0);

const formatTrendPercent = (value: number | string) => `${Math.round(Number(value) || 0)}%`;

const getAmountTextClass = (type: EntryType, amount: number) => {
  const text = formatAmount(type, amount);
  if (type === 'plank' || type === 'handstand') {
    return text.length > 5 ? 'text-[16px]' : 'text-[18px]';
  }
  return text.length > 3 ? 'text-[17px]' : 'text-[20px]';
};

const loadQuickAmounts = () => {
  try {
    const raw = localStorage.getItem(quickAmountsStorageKey);
    if (!raw) return defaultQuickAmounts;
    const parsed = JSON.parse(raw) as Partial<Record<QuickTarget['type'], number[]>>;
    return {
      pushups: parsed.pushups?.slice(0, 2).map(Number).filter(Number.isFinite) ?? defaultQuickAmounts.pushups,
      pullups: parsed.pullups?.slice(0, 2).map(Number).filter(Number.isFinite) ?? defaultQuickAmounts.pullups
    };
  } catch {
    return defaultQuickAmounts;
  }
};

const loadTheme = (): Theme => {
  try {
    return localStorage.getItem(themeStorageKey) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

const loadLanguage = (): Language => {
  try {
    return localStorage.getItem(languageStorageKey) === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
};

const navLabels: Record<Language, Record<Tab, string>> = {
  zh: {
    today: '今日',
    trends: '趋势',
    settings: '设置'
  },
  en: {
    today: 'Today',
    trends: 'Trends',
    settings: 'Settings'
  }
};

const exerciseLabels: Record<Language, Record<EntryType, string>> = {
  zh: {
    pushups: '俯卧撑',
    pullups: '引体向上',
    plank: '平板支撑',
    handstand: '倒立'
  },
  en: {
    pushups: 'Push-ups',
    pullups: 'Pull-ups',
    plank: 'Plank',
    handstand: 'Handstand'
  }
};

const exerciseUnits: Record<Language, Record<'count' | 'time', string>> = {
  zh: {
    count: '次',
    time: '分钟'
  },
  en: {
    count: 'reps',
    time: 'min'
  }
};

const NavIcon = ({ type }: { type: Tab }) => {
  if (type === 'today') {
    return (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden="true">
        <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'trends') {
    return (
      <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden="true">
        <path d="M5 19V9M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M4 19.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.55" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2.5h-4L9.6 5a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
};

const ExerciseIcon = ({ type }: { type: EntryType }) => {
  const color = exerciseMeta[type].color;

  if (type === 'pushups') {
    return (
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden="true">
        <circle cx="37" cy="13" r="4" fill={color} />
        <path d="M8 31.5L18.5 26L28.5 26.5L36 18.5" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 26L22.5 36" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <path d="M29 27L37.5 34" stroke={color} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'pullups') {
    return (
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden="true">
        <path d="M9 9H39M14 9V16M34 9V16" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d="M16 19L24 16L32 19" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 17V36" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d="M19 27L14 37M29 27L34 37" stroke={color} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'plank') {
    return (
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden="true">
        <circle cx="15" cy="25" r="4" fill={color} />
        <path d="M19 25H32L39 29" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 25L23 35" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <path d="M38 29L42 35" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <path d="M8 37H40" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden="true">
      <circle cx="24" cy="10" r="4" fill={color} />
      <path d="M24 15V29" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M14 20L24 27L34 20" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 31L13 41M29 31L35 41" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <path d="M11 42H37" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
};

const requestToPromise = <T,>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openWorkoutDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(entryStoreName)) {
        const store = db.createObjectStore(entryStoreName, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readEntriesFromDatabase = async () => {
  const db = await openWorkoutDatabase();
  try {
    const transaction = db.transaction(entryStoreName, 'readonly');
    const store = transaction.objectStore(entryStoreName);
    return await requestToPromise<Entry[]>(store.getAll());
  } finally {
    db.close();
  }
};

const saveEntryToDatabase = async (entry: Entry) => {
  const db = await openWorkoutDatabase();
  try {
    const transaction = db.transaction(entryStoreName, 'readwrite');
    const store = transaction.objectStore(entryStoreName);
    await requestToPromise(store.put(entry));
  } finally {
    db.close();
  }
};

const deleteEntryFromDatabase = async (id: string) => {
  const db = await openWorkoutDatabase();
  try {
    const transaction = db.transaction(entryStoreName, 'readwrite');
    const store = transaction.objectStore(entryStoreName);
    await requestToPromise(store.delete(id));
  } finally {
    db.close();
  }
};

const clearEntriesFromDatabase = async () => {
  const db = await openWorkoutDatabase();
  try {
    const transaction = db.transaction(entryStoreName, 'readwrite');
    const store = transaction.objectStore(entryStoreName);
    await requestToPromise(store.clear());
  } finally {
    db.close();
  }
};

const deleteEntriesByDateFromDatabase = async (date: string) => {
  const db = await openWorkoutDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(entryStoreName, 'readwrite');
      const store = transaction.objectStore(entryStoreName);
      const dateIndex = store.index('date');
      const request = dateIndex.openCursor(IDBKeyRange.only(date));

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

const saveEntriesToDatabase = async (entries: Entry[]) => {
  if (entries.length === 0) return;

  const db = await openWorkoutDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(entryStoreName, 'readwrite');
      const store = transaction.objectStore(entryStoreName);

      entries.forEach((entry) => store.put(entry));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

const randomAmountForType = (type: EntryType) => {
  if (type === 'pushups') return randomInt(8, 45);
  if (type === 'pullups') return randomInt(2, 12);
  if (type === 'plank') return randomInt(30, 210);
  return randomInt(10, 120);
};

const createRandomHistoryEntries = () => {
  const days = randomInt(15, 60);
  const now = Date.now();
  const generated: Entry[] = [];

  Array.from({ length: days }, (_, dayIndex) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (days - 1 - dayIndex));
    const records = randomInt(2, 6);

    Array.from({ length: records }, (_, recordIndex) => {
      const type = order[randomInt(0, order.length - 1)];
      const createdAt = new Date(date);
      createdAt.setUTCHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59), randomInt(0, 999));

      generated.push({
        id: `test-${now}-${dayIndex}-${recordIndex}-${type}`,
        date: dateKey(createdAt),
        type,
        amount: randomAmountForType(type),
        createdAt: createdAt.getTime()
      });
    });
  });

  return generated;
};

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [toast, setToast] = useState<{ text: string } | null>(null);
  const [detailType, setDetailType] = useState<EntryType | null>(null);
  const [quickTarget, setQuickTarget] = useState<QuickTarget | null>(null);
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [language, setLanguage] = useState<Language>(() => loadLanguage());
  const [trendRange, setTrendRange] = useState<TrendRange>(7);
  const [quickAmounts, setQuickAmounts] = useState(defaultQuickAmounts);
  const [customValue, setCustomValue] = useState('');
  const [timerType, setTimerType] = useState<EntryType>('plank');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const toastTimer = useRef<number | null>(null);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  useEffect(() => {
    let ignore = false;

    setQuickAmounts(loadQuickAmounts());
    readEntriesFromDatabase()
      .then((storedEntries) => {
        if (!ignore) {
          setEntries(storedEntries);
        }
      })
      .catch((error) => {
        console.error('Failed to read workout database', error);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(quickAmountsStorageKey, JSON.stringify(quickAmounts));
  }, [quickAmounts]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
  }, [language]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = window.setInterval(() => {
      setTimerSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const today = todayKey();
  const copy = text[language];
  const labelFor = (type: EntryType) => exerciseLabels[language][type];
  const unitFor = (type: EntryType) => exerciseUnits[language][exerciseMeta[type].kind];
  const todayEntries = useMemo(() => entries.filter((entry) => entry.date === today), [entries, today]);

  const summary = useMemo(
    () =>
      todayEntries.reduce<Record<EntryType, number>>(
        (acc, entry) => {
          acc[entry.type] += entry.amount;
          return acc;
        },
        { pushups: 0, pullups: 0, plank: 0, handstand: 0 }
      ),
    [todayEntries]
  );

  const logs = useMemo(() => [...entries].sort((a, b) => b.createdAt - a.createdAt), [entries]);

  const dailySummaries = useMemo(() => {
    return entries.reduce<Record<string, Record<EntryType, number>>>((acc, entry) => {
      acc[entry.date] ??= { pushups: 0, pullups: 0, plank: 0, handstand: 0 };
      acc[entry.date][entry.type] += entry.amount;
      return acc;
    }, {});
  }, [entries]);

  const trendBests = useMemo(() => {
    return Object.values(dailySummaries).reduce<Record<EntryType, number>>(
      (acc, daySummary) => {
        order.forEach((type) => {
          acc[type] = Math.max(acc[type], daySummary[type]);
        });
        return acc;
      },
      { pushups: 0, pullups: 0, plank: 0, handstand: 0 }
    );
  }, [dailySummaries]);

  const trainingDays = useMemo(() => Object.keys(dailySummaries).length, [dailySummaries]);

  const streakDays = useMemo(() => {
    const trainedDates = new Set(Object.keys(dailySummaries));
    let cursor = new Date();
    let streak = 0;

    while (trainedDates.has(dateKey(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    return streak;
  }, [dailySummaries]);

  const trendData = useMemo(() => {
    return Array.from({ length: trendRange }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (trendRange - 1 - index));
      const key = dateKey(date);
      const daySummary = dailySummaries[key] ?? { pushups: 0, pullups: 0, plank: 0, handstand: 0 };
      return {
        date: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
        pushups: toTrendPercent(daySummary.pushups, trendBests.pushups),
        pullups: toTrendPercent(daySummary.pullups, trendBests.pullups),
        plank: toTrendPercent(daySummary.plank, trendBests.plank),
        handstand: toTrendPercent(daySummary.handstand, trendBests.handstand)
      };
    });
  }, [dailySummaries, trendBests, trendRange]);

  const totalMinutes = Math.round((summary.plank + summary.handstand) / 60);
  const totalReps = summary.pushups + summary.pullups;

  async function addRecord(type: EntryType, amount: number) {
    const entry = { id: `${Date.now()}-${type}`, date: today, type, amount, createdAt: Date.now() };
    await saveEntryToDatabase(entry);
    setEntries((current) => [entry, ...current]);
  }

  async function deleteRecord(id: string) {
    await deleteEntryFromDatabase(id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setToast(null);
  }

  async function clearAllRecords() {
    const confirmed = window.confirm(copy.initConfirm as string);
    if (!confirmed) return;
    await clearEntriesFromDatabase();
    setEntries([]);
    setToast(null);
  }

  async function clearTodayRecords() {
    const todayRecordCount = todayEntries.length;
    if (todayRecordCount === 0) {
      setToast({ text: copy.noTodayData as string });
      window.clearTimeout(toastTimer.current ?? undefined);
      toastTimer.current = window.setTimeout(() => setToast(null), 2400);
      return;
    }

    const confirmed = window.confirm((copy.clearTodayConfirm as (count: number) => string)(todayRecordCount));
    if (!confirmed) return;
    await deleteEntriesByDateFromDatabase(today);
    setEntries((current) => current.filter((entry) => entry.date !== today));
    setToast({ text: copy.todayCleared as string });
    window.clearTimeout(toastTimer.current ?? undefined);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }

  async function generateRandomHistory() {
    const generated = createRandomHistoryEntries();
    const generatedDays = new Set(generated.map((entry) => entry.date)).size;
    const confirmed = window.confirm((copy.generateConfirm as (days: number, count: number) => string)(generatedDays, generated.length));
    if (!confirmed) return;

    await saveEntriesToDatabase(generated);
    setEntries((current) => [...generated, ...current]);
    setToast({ text: (copy.generated as (days: number, count: number) => string)(generatedDays, generated.length) });
    window.clearTimeout(toastTimer.current ?? undefined);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }

  function startLongPress(type: QuickTarget['type'], index: number) {
    longPressFired.current = false;
    window.clearTimeout(pressTimer.current ?? undefined);
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setQuickTarget({ type, index });
      setCustomValue(String(quickAmounts[type][index]));
    }, 520);
  }

  function endQuickStep(type: QuickTarget['type'], amount: number) {
    window.clearTimeout(pressTimer.current ?? undefined);
    if (!longPressFired.current) {
      addRecord(type, amount);
    }
  }

  function saveTimer() {
    if (timerSeconds < 1) return;
    addRecord(timerType, timerSeconds);
    setTimerSeconds(0);
    setTimerRunning(false);
  }

  function saveCustom() {
    if (quickTarget) {
      const parsed = Number(customValue);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      const nextAmount = Math.max(1, Math.round(parsed));
      setQuickAmounts((current) => ({
        ...current,
        [quickTarget.type]: current[quickTarget.type].map((amount, index) =>
          index === quickTarget.index ? nextAmount : amount
        )
      }));
      setQuickTarget(null);
      return;
    }

  }

  const renderToday = () => (
    <>
      <header className="px-4 pb-4 pt-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{copy.workout as string}</p>
            <h1 className="mt-1 text-[29px] font-bold leading-none tracking-normal text-white">{copy.todayTitle as string}</h1>
            <p className="mt-2 text-[13px] font-medium leading-none text-zinc-500">
              {formatTrainingDate(today, language)}
            </p>
          </div>
          <div className="shrink-0 pb-0.5 text-right">
            <p className="text-[10px] font-semibold leading-none text-zinc-500">{copy.trainingDays as string}</p>
            <p className="mt-1 text-[21px] font-bold leading-none text-orange-300 tabular-nums">{trainingDays}{copy.days as string}</p>
            <p className="mt-1 text-[10px] font-medium leading-none text-zinc-600">{copy.consecutive as string} {streakDays}{copy.days as string}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-2 px-4">
        {order.map((type) => {
          const meta = exerciseMeta[type];
          return (
            <motion.button
              layout
              key={type}
              onClick={() => setDetailType(type)}
              className="min-w-0 overflow-hidden rounded-[18px] border border-white/10 bg-zinc-900/90 px-2 py-3 text-center"
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-[14px] [&_svg]:h-6 [&_svg]:w-6"
                style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
              >
                <ExerciseIcon type={type} />
              </div>
              <p className="h-7 overflow-hidden text-[10px] font-semibold leading-[14px] text-zinc-300">{labelFor(type)}</p>
              <p className={`mt-1 truncate font-bold leading-none text-white tabular-nums ${getAmountTextClass(type, summary[type])}`}>
                {formatAmount(type, summary[type])}
              </p>
              <p className="mt-1 text-[10px] leading-none text-zinc-400">{unitFor(type)}</p>
            </motion.button>
          );
        })}
      </section>

      <section className="mt-6 px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-bold leading-none text-white">{copy.quickLog as string}</h2>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-zinc-500">{copy.longPress as string}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {countTypes.map((type) => {
            const meta = exerciseMeta[type];
            return (
              <div
                key={type}
                className="rounded-[20px] border border-white/10 bg-zinc-900/80 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[13px] [&_svg]:h-6 [&_svg]:w-6" style={{ backgroundColor: `${meta.color}18` }}>
                    <ExerciseIcon type={type} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold leading-none" style={{ color: meta.color }}>
                      {labelFor(type)}
                    </p>
                    <p className="mt-1 text-[9px] font-medium leading-none text-zinc-600">{copy.quickAdd as string}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {quickAmounts[type].map((step, index) => (
                    <motion.button
                      key={`${type}-${index}`}
                      whileTap={{ scale: 0.94 }}
                      onPointerDown={() => startLongPress(type, index)}
                      onPointerUp={() => endQuickStep(type, step)}
                      onPointerCancel={() => window.clearTimeout(pressTimer.current ?? undefined)}
                      onContextMenu={(event) => event.preventDefault()}
                      className="flex h-10 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.055] px-2 text-center"
                      style={{ color: meta.color }}
                    >
                      <span className="translate-y-[-1px] text-[11px] font-semibold leading-none opacity-75">+</span>
                      <span className="ml-0.5 text-[16px] font-bold leading-none tabular-nums">
                        {meta.kind === 'time' ? formatDuration(step) : step}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
          {(['plank', 'handstand'] as EntryType[]).map((type) => {
            const meta = exerciseMeta[type];
            const isActiveTimer = timerType === type;
            return (
              <div
                key={type}
                className="rounded-[20px] border border-white/10 bg-zinc-900/80 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[13px] [&_svg]:h-6 [&_svg]:w-6" style={{ backgroundColor: `${meta.color}18` }}>
                    <ExerciseIcon type={type} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold leading-none" style={{ color: meta.color }}>
                      {labelFor(type)}
                    </p>
                    <p className="mt-1 text-[9px] font-medium leading-none text-zinc-600">{copy.timedTraining as string}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (!isActiveTimer) {
                        setTimerType(type);
                        setTimerSeconds(0);
                        setTimerRunning(true);
                        return;
                      }
                      if (timerSeconds > 0) {
                        saveTimer();
                        return;
                      }
                      setTimerRunning(true);
                    }}
                    className="relative flex h-10 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.055] px-3 text-center"
                  >
                    <span
                      className={`${isActiveTimer && timerSeconds > 0 ? 'text-[16px]' : 'text-[13px]'} font-bold leading-none tabular-nums`}
                      style={{ color: meta.color }}
                    >
                      {isActiveTimer && timerSeconds > 0 ? formatDuration(timerSeconds) : copy.startTimer as string}
                    </span>
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-4 px-4 pb-28">
        <div className="rounded-[28px] border border-white/10 bg-zinc-950/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[18px] font-bold leading-none text-white">{copy.recentLogs as string}</h2>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-zinc-500">{logs.length}</span>
          </div>
          <div className="space-y-1">
            {logs.length === 0 ? (
              <div className="rounded-2xl px-2 py-6 text-center text-sm font-medium text-zinc-600">{copy.emptyLogs as string}</div>
            ) : null}
            {logs.slice(0, 6).map((entry) => (
              <div
                key={entry.id}
                className="flex w-full items-center justify-between gap-3 rounded-[18px] px-2 py-2.5 text-left"
              >
                <button onClick={() => setDetailType(entry.type)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] [&_svg]:h-6 [&_svg]:w-6"
                    style={{
                      backgroundColor: `${exerciseMeta[entry.type].color}22`,
                      color: exerciseMeta[entry.type].color
                    }}
                  >
                    <ExerciseIcon type={entry.type} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold leading-none text-white">{labelFor(entry.type)}</p>
                    <p className="mt-1.5 text-[10px] font-medium leading-none text-zinc-500">
                      {new Date(entry.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' })}{' '}
                      {new Date(entry.createdAt).toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2.5">
                  <p className="min-w-[54px] text-right text-[14px] font-bold leading-none text-white tabular-nums">
                    +{formatAmount(entry.type, entry.amount)}
                  </p>
                  <button
                    onClick={() => deleteRecord(entry.id)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-zinc-400"
                  >
                    {copy.delete as string}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const renderTrends = () => (
    <div className="px-5 pb-28 pt-7">
      <h1 className="text-center text-xl font-bold text-white">{copy.trends as string}</h1>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-[26px] bg-zinc-900 p-4">
          <p className="text-sm text-zinc-500">{copy.totalDays as string}</p>
          <p className="mt-3 text-4xl font-bold text-white">{trainingDays}</p>
        </div>
        <div className="rounded-[26px] bg-zinc-900 p-4">
          <p className="text-sm text-zinc-500">{copy.streakDays as string}</p>
          <p className="mt-3 text-4xl font-bold text-white">{streakDays}</p>
        </div>
        <div className="rounded-[26px] bg-zinc-900 p-4">
          <p className="text-sm text-zinc-500">{copy.todayReps as string}</p>
          <p className="mt-3 text-4xl font-bold text-white">{totalReps}</p>
        </div>
        <div className="rounded-[26px] bg-zinc-900 p-4">
          <p className="text-sm text-zinc-500">{copy.timedMinutes as string}</p>
          <p className="mt-3 text-4xl font-bold text-white">{totalMinutes}</p>
        </div>
      </div>
      <div className="mt-4 rounded-[30px] bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {copy.recentDays as string} {trendRange} {copy.days as string}
            </p>
            <h2 className="mt-1 text-[22px] font-bold leading-none text-white">{copy.trendTitle as string}</h2>
          </div>
          <div className="flex rounded-full bg-white/[0.06] p-1">
            {([7, 30] as TrendRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTrendRange(range)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${trendRange === range ? 'bg-white text-black' : 'text-zinc-500'}`}
              >
                {range}{copy.days as string}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {order.map((type) => (
            <div key={type} className="flex items-center gap-2 text-[10px] font-semibold text-zinc-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: exerciseMeta[type].color }} />
              {labelFor(type)}
            </div>
          ))}
        </div>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 6, left: -28, bottom: 0 }}>
              <CartesianGrid stroke={isLightTheme ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.07)'} vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isLightTheme ? '#64748b' : '#71717a', fontSize: 11, fontWeight: 600 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={formatTrendPercent}
                tick={{ fill: isLightTheme ? '#64748b' : '#71717a', fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value) => formatTrendPercent(value as number | string)}
                contentStyle={{
                  background: isLightTheme ? 'rgba(255,255,255,0.96)' : '#18181b',
                  border: isLightTheme ? '1px solid rgba(15,23,42,0.1)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 18,
                  boxShadow: '0 18px 45px rgba(0,0,0,0.18)'
                }}
                labelStyle={{ color: isLightTheme ? '#111827' : '#fff', fontWeight: 700 }}
                itemStyle={{ fontWeight: 700 }}
              />
              {order.map((type) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={labelFor(type)}
                  stroke={exerciseMeta[type].color}
                  strokeWidth={2.2}
                  dot={{ r: trendRange === 7 ? 3 : 0, strokeWidth: 0, fill: exerciseMeta[type].color }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="px-5 pb-28 pt-7">
      <h1 className="text-center text-xl font-bold text-white">{copy.settings as string}</h1>
      <div className="mt-6 space-y-3">
        {[
          `${copy.currentTheme as string}: ${theme === 'dark' ? copy.darkMode as string : copy.lightMode as string}`,
          `${copy.currentLanguage as string}: ${language === 'zh' ? '中文' : 'English'}`,
          copy.localData as string,
          copy.longPressTip as string,
          copy.timerTip as string
        ].map((item) => (
          <div key={item} className="rounded-[24px] bg-zinc-900 px-4 py-4 text-sm font-medium text-zinc-300">
            {item}
          </div>
        ))}
      </div>
      <button
        onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
        className="mt-5 flex w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-bold text-white"
      >
        <span>{copy.appearance as string}</span>
        <span className="rounded-full bg-white px-4 py-2 text-xs text-black">
          {theme === 'dark' ? copy.switchLight as string : copy.switchDark as string}
        </span>
      </button>
      <button
        onClick={() => setLanguage((value) => (value === 'zh' ? 'en' : 'zh'))}
        className="mt-3 flex w-full items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-bold text-white"
      >
        <span>{copy.language as string}</span>
        <span className="rounded-full bg-white px-4 py-2 text-xs text-black">
          {language === 'zh' ? copy.switchEnglish as string : copy.switchChinese as string}
        </span>
      </button>
      <button
        onClick={generateRandomHistory}
        className="mt-5 w-full rounded-full border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-bold text-white"
      >
        {copy.generateData as string}
      </button>
      <div className="mt-8 space-y-3">
        <button
          onClick={clearTodayRecords}
          className="w-full rounded-full border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-bold text-white"
        >
          {copy.clearToday as string}
        </button>
        <button
          onClick={clearAllRecords}
          className="w-full rounded-full bg-white px-5 py-4 text-sm font-bold text-black"
        >
          {copy.initData as string}
        </button>
      </div>
      <p className="mt-6 text-center text-[11px] font-semibold text-zinc-700">{copy.version as string} {appVersion}</p>
    </div>
  );

  const isLightTheme = theme === 'light';

  return (
    <div className={`min-h-[100dvh] bg-black text-white ${isLightTheme ? 'theme-light' : 'theme-dark'}`}>
      <main className="mx-auto min-h-[100dvh] max-w-md bg-[radial-gradient(circle_at_50%_-10%,rgba(80,80,80,0.34),transparent_36%),#050505]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {activeTab === 'today' && renderToday()}
            {activeTab === 'trends' && renderTrends()}
            {activeTab === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-[22px] border border-white/10 bg-zinc-900/90 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-white">{toast.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(detailType || quickTarget) && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setDetailType(null);
              setQuickTarget(null);
            }}
          >
            <motion.div
              className={
                quickTarget
                  ? 'absolute left-4 right-4 top-[16dvh] mx-auto max-w-sm rounded-[30px] border border-white/10 bg-zinc-950 px-5 pb-[calc(env(safe-area-inset-bottom)+22px)] pt-4 shadow-2xl'
                  : 'absolute bottom-0 left-0 right-0 mx-auto max-w-md rounded-t-[34px] border border-white/10 bg-zinc-950 px-5 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-4 shadow-2xl'
              }
              initial={quickTarget ? { opacity: 0, y: 18, scale: 0.98 } : { y: 360 }}
              animate={quickTarget ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
              exit={quickTarget ? { opacity: 0, y: 18, scale: 0.98 } : { y: 360 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />
              {quickTarget ? (
                <>
                  <p className="text-sm text-zinc-500">{copy.editQuick as string}</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">{labelFor(quickTarget.type)}</h2>
                  <label className="mt-5 block text-sm text-zinc-500">{copy.quickAmount as string}</label>
                  <input
                    autoFocus
                    value={customValue}
                    onChange={(event) => setCustomValue(event.target.value)}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-[24px] border border-white/10 bg-white/[0.06] px-4 py-4 text-3xl font-bold text-white outline-none"
                  />
                  <button onClick={saveCustom} className="mt-5 w-full rounded-full bg-white py-4 text-sm font-bold text-black">
                    {copy.saveQuick as string}
                  </button>
                </>
              ) : detailType ? (
                <>
                  <p className="text-sm text-zinc-500">{copy.details as string}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">{labelFor(detailType)}</h2>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: `${exerciseMeta[detailType].color}22`,
                        color: exerciseMeta[detailType].color
                      }}
                    >
                      {exerciseMeta[detailType].kind === 'time' ? copy.timed as string : copy.count as string}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-1 gap-3">
                    <div className="rounded-[24px] bg-white/[0.06] p-4">
                      <p className="text-xs text-zinc-500">{copy.today as string}</p>
                      <p className="mt-2 text-3xl font-bold text-white">{formatAmount(detailType, summary[detailType])}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-md items-center justify-around px-6 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3">
          {[
            { key: 'today' as Tab, label: navLabels[language].today },
            { key: 'trends' as Tab, label: navLabels[language].trends },
            { key: 'settings' as Tab, label: navLabels[language].settings }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => switchTab(item.key)}
              className={`flex min-w-20 flex-col items-center gap-1 text-[11px] font-semibold ${
                activeTab === item.key ? 'text-blue-400' : 'text-zinc-600'
              }`}
            >
              <NavIcon type={item.key} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;
