export const translations = {
  // Header
  appTitle: "نظام مراقبة العدادات",
  live: "مباشر",
  auto: "تلقائي",
  
  // Overview Screen
  organizationOverview: "نظرة عامة على المؤسسة",
  totalOccupancy: "إجمالي الإشغال",
  divisions: "الأقسام",
  locations: "المواقع",
  cameras: "الكاميرات",
  camerasOnline: "الكاميرات المتصلة",
  floors: "الطوابق",
  
  // Division Screen
  divisionStatus: "حالة الأقسام",
  peak: "الذروة",
  
  // Location Screen
  locationOverview: "نظرة عامة على المواقع",
  current: "الحالي",
  capacity: "السعة",
  
  // Alerts Screen
  activeAlerts: "التنبيهات النشطة",
  allSystemsNormal: "جميع الأنظمة طبيعية",
  noActiveAlerts: "لا توجد تنبيهات نشطة",
  critical: "حرج",
  high: "عالي",
  medium: "متوسط",
  low: "منخفض",
  alerts: "تنبيهات",
  
  // Trends Screen
  analyticsTrends: "التحليلات والاتجاهات",
  hourOccupancyPattern: "نمط الإشغال على مدار 24 ساعة",
  peakOccupancy: "ذروة الإشغال",
  average: "المتوسط",
  currentUtilization: "الاستخدام الحالي",
  
  // Chart Labels
  realTimeOccupancyTrends: "اتجاهات الإشغال في الوقت الفعلي",
  divisionOccupancyTrends: "اتجاهات إشغال القسم",
  locationOccupancyTrends: "اتجاهات إشغال الموقع",
  floorComparison: "مقارنة الطوابق",
  locationComparison: "مقارنة المواقع",
  divisionComparison: "مقارنة الأقسام",
  
  // Status
  online: "متصل",
  offline: "غير متصل",
  maintenance: "صيانة",
  
  // Time periods
  today: "اليوم",
  thisWeek: "هذا الأسبوع",
  thisMonth: "هذا الشهر",
  
  // Common
  of: "من",
  totalCameras: "إجمالي الكاميرات",
  floorStatus: "حالة الطابق",
  cameraStatus: "حالة الكاميرا",
  address: "العنوان",
  description: "الوصف",
  lastUpdated: "آخر تحديث",
  
  // Navigation
  overview: "نظرة عامة",
  trends: "الاتجاهات",
  
  // Messages
  systemNormal: "النظام يعمل بطريقة طبيعية",
  dataNotAvailable: "البيانات غير متوفرة",
  loading: "جاري التحميل..."
};

export type TranslationKey = keyof typeof translations;