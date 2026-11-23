import { CountryProfile } from './countryTypes';
import { buildTriBandFlagSvg, buildVerticalTriBandFlagSvg, createSeedCountry } from './countrySeedHelpers';

export const SEED_COUNTRIES_B: CountryProfile[] = [
  createSeedCountry({
    iso3: 'GBR',
    nameAr: 'المملكة المتحدة',
    nameEn: 'United Kingdom',
    flag: {
      mode: 'svg',
      emoji: '🇬🇧',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#1e3a8a"/><line x1="0" y1="0" x2="90" y2="60" stroke="#f8fafc" stroke-width="10"/><line x1="90" y1="0" x2="0" y2="60" stroke="#f8fafc" stroke-width="10"/><rect width="90" height="16" y="22" fill="#f8fafc"/><rect width="16" height="60" x="37" fill="#f8fafc"/><rect width="90" height="10" y="25" fill="#dc2626"/><rect width="10" height="60" x="40" fill="#dc2626"/></svg>'
    },
    capitalAr: 'لندن',
    capitalEn: 'London',
    areaKm2: 243610,
    population: 68000000,
    regimeType: 'ملكية برلمانية (إطار تجريبي)',
    leader: {
      name: 'العاهل — ملف تجريبي',
      title: 'رأس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس مجلس الوزراء'
    },
    stability: {
      politicalStability: 79,
      internalStability: 80,
      internationalInfluence: 84
    },
    economy: {
      economicPower: 83,
      gdpBillionUsd: 3350,
      annualBudgetBillionUsd: 1380,
      currencyCode: 'GBP',
      primaryResources: ['الخدمات المالية', 'الطاقة البحرية', 'الصناعات الدوائية', 'التقنية الفائقة']
    },
    military: {
      overallPower: 78,
      landForces: 71,
      navalForces: 83,
      airForces: 80,
      activePersonnel: 148000,
      doctrine: 'قوة بحرية وجوية استطلاعية وحاملات مرافقة (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'defense_pact' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' }
      ],
      rivalries: [
        { targetIso3: 'RUS', name: 'روسيا', type: 'sanctions' }
      ],
      diplomaticStance: 'تحالف أطلسي وتعاون أمني بحري'
    },
    mediaAndPublic: {
      publicOpinion: 68,
      mediaInfluence: 86,
      narrativeSummary: 'تأثير إعلامي دولي عالٍ عبر الشبكات الناطقة بالإنجليزية (تجريبي).'
    },
    mapColor: '#0369a1',
    summary: 'مركز مالي وبحري في شمال الأطلسي بقدرات استطلاعية وإعلامية عابرة للقارات (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'FRA',
    nameAr: 'فرنسا',
    nameEn: 'France',
    flag: {
      mode: 'svg',
      emoji: '🇫🇷',
      svg: buildVerticalTriBandFlagSvg('#1d4ed8', '#f8fafc', '#dc2626')
    },
    capitalAr: 'باريس',
    capitalEn: 'Paris',
    areaKm2: 551695,
    population: 68200000,
    regimeType: 'جمهورية شبه رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس الحكومة'
    },
    stability: {
      politicalStability: 75,
      internalStability: 73,
      internationalInfluence: 85
    },
    economy: {
      economicPower: 82,
      gdpBillionUsd: 3050,
      annualBudgetBillionUsd: 1620,
      currencyCode: 'EUR',
      primaryResources: ['الطاقة النووية', 'الطيران والفضاء', 'الزراعة', 'الصناعات الفاخرة']
    },
    military: {
      overallPower: 81,
      landForces: 77,
      navalForces: 82,
      airForces: 83,
      activePersonnel: 205000,
      doctrine: 'استقلالية دفاعية وانتشار متوسطي وبحري (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'DEU', name: 'ألمانيا', type: 'alliance', notes: 'المحور الأوروبي' },
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'alliance' },
        { targetIso3: 'EGY', name: 'جمهورية مصر العربية', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'محور أوروبي وحضور متوسطي وأطلسي'
    },
    mediaAndPublic: {
      publicOpinion: 65,
      mediaInfluence: 81,
      narrativeSummary: 'دبلوماسية ثقافية وإعلامية أوروبية نشطة في المتوسط وأفريقيا (تجريبي).'
    },
    mapColor: '#2563eb',
    summary: 'قوة أوروبية ذات قاعدة صناعية دفاعية وطاقة نووية وحضور بحري في المتوسط والمحيطات (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'DEU',
    nameAr: 'ألمانيا',
    nameEn: 'Germany',
    flag: {
      mode: 'svg',
      emoji: '🇩🇪',
      svg: buildTriBandFlagSvg('#0f172a', '#dc2626', '#facc15')
    },
    capitalAr: 'برلين',
    capitalEn: 'Berlin',
    areaKm2: 357588,
    population: 84500000,
    regimeType: 'جمهورية برلمانية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'الرئيس الاتحادي — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'المستشار الاتحادي — ملف تجريبي',
      headTitle: 'رئيس الحكومة'
    },
    stability: {
      politicalStability: 83,
      internalStability: 82,
      internationalInfluence: 84
    },
    economy: {
      economicPower: 89,
      gdpBillionUsd: 4450,
      annualBudgetBillionUsd: 2100,
      currencyCode: 'EUR',
      primaryResources: ['الهندسة الميكانيكية', 'السيارات', 'الكيماويات', 'الطاقة المتجددة']
    },
    military: {
      overallPower: 74,
      landForces: 75,
      navalForces: 65,
      airForces: 76,
      activePersonnel: 183000,
      doctrine: 'دفاع إقليمي أوروبي وبنية لوجستية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' },
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'alliance' }
      ],
      rivalries: [],
      diplomaticStance: 'تكامل صناعي أوروبي ودبلوماسية تجارية'
    },
    mediaAndPublic: {
      publicOpinion: 74,
      mediaInfluence: 78,
      narrativeSummary: 'تركيز على الاستقرار الصناعي والتحول في قطاع الطاقة (تجريبي).'
    },
    mapColor: '#475569',
    summary: 'المحرك الصناعي والمالي الأكبر في وسط أوروبا بشبكة نقل وإمداد عالية الكفاءة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'JPN',
    nameAr: 'اليابان',
    nameEn: 'Japan',
    flag: {
      mode: 'svg',
      emoji: '🇯🇵',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#f8fafc"/><circle cx="45" cy="30" r="16" fill="#dc2626"/></svg>'
    },
    capitalAr: 'طوكيو',
    capitalEn: 'Tokyo',
    areaKm2: 377975,
    population: 124500000,
    regimeType: 'ملكية دستورية برلمانية (إطار تجريبي)',
    leader: {
      name: 'الإمبراطور — ملف تجريبي',
      title: 'رمز الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس مجلس الوزراء'
    },
    stability: {
      politicalStability: 86,
      internalStability: 89,
      internationalInfluence: 82
    },
    economy: {
      economicPower: 88,
      gdpBillionUsd: 4250,
      annualBudgetBillionUsd: 1650,
      currencyCode: 'JPY',
      primaryResources: ['الروبوتات وأشباه الموصلات', 'السيارات', 'الصناعات البحرية', 'الابتكار التقني']
    },
    military: {
      overallPower: 79,
      landForces: 72,
      navalForces: 84,
      airForces: 82,
      activePersonnel: 247000,
      doctrine: 'دفاع بحري وجوي متقدم للجزر (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'defense_pact' },
        { targetIso3: 'IND', name: 'الهند', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'أمن الممرات البحرية في غرب الهادئ'
    },
    mediaAndPublic: {
      publicOpinion: 78,
      mediaInfluence: 80,
      narrativeSummary: 'تأثير ثقافي وتقني واسع مع تركيز على استقرار شرق آسيا (تجريبي).'
    },
    mapColor: '#0284c7',
    summary: 'قوة بحرية وتقنية متقدمة في المحيط الهادئ بأسطول حديث وبنية صناعية دقيقة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'IND',
    nameAr: 'الهند',
    nameEn: 'India',
    flag: {
      mode: 'svg',
      emoji: '🇮🇳',
      svg: buildTriBandFlagSvg('#f97316', '#f8fafc', '#15803d', '<circle cx="45" cy="30" r="7" fill="none" stroke="#1e3a8a" stroke-width="2"/>')
    },
    capitalAr: 'نيودلهي',
    capitalEn: 'New Delhi',
    areaKm2: 3287263,
    population: 1425000000,
    regimeType: 'جمهورية برلمانية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس الوزراء — ملف تجريبي',
      headTitle: 'رئيس الوزراء'
    },
    stability: {
      politicalStability: 76,
      internalStability: 72,
      internationalInfluence: 83
    },
    economy: {
      economicPower: 85,
      gdpBillionUsd: 3800,
      annualBudgetBillionUsd: 980,
      currencyCode: 'INR',
      primaryResources: ['البرمجيات والخدمات الرقمية', 'الأدوية', 'الزراعة', 'التصنيع المتنامي']
    },
    military: {
      overallPower: 84,
      landForces: 86,
      navalForces: 80,
      airForces: 83,
      activePersonnel: 1455000,
      doctrine: 'تأمين المحيط الهندي والحدود الجبلية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'ARE', name: 'الإمارات العربية المتحدة', type: 'trade' },
        { targetIso3: 'JPN', name: 'اليابان', type: 'trade' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' }
      ],
      rivalries: [
        { targetIso3: 'CHN', name: 'الصين', type: 'tension', notes: 'منافسة إقليمية وبحرية' }
      ],
      diplomaticStance: 'تعددية استراتيجية في المحيط الهندي'
    },
    mediaAndPublic: {
      publicOpinion: 74,
      mediaInfluence: 77,
      narrativeSummary: 'خطاب يركز على النمو السكاني والتقني وتأمين ممرات المحيط الهندي (تجريبي).'
    },
    mapColor: '#ea580c',
    summary: 'أكبر كتلة سكانية على المحيط الهندي بنمو تقني وصناعي سريع وأسطول محيطي متصاعد (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'BRA',
    nameAr: 'البرازيل',
    nameEn: 'Brazil',
    flag: {
      mode: 'svg',
      emoji: '🇧🇷',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#15803d"/><polygon points="45,8 80,30 45,52 10,30" fill="#facc15"/><circle cx="45" cy="30" r="12" fill="#1e3a8a"/></svg>'
    },
    capitalAr: 'برازيليا',
    capitalEn: 'Brasilia',
    areaKm2: 8515767,
    population: 215000000,
    regimeType: 'جمهورية فيدرالية رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة والحكومة'
    },
    government: {
      headOfGovernment: 'مجلس الوزراء الاتحادي — ملف تجريبي',
      headTitle: 'القيادة التنفيذية'
    },
    stability: {
      politicalStability: 71,
      internalStability: 70,
      internationalInfluence: 75
    },
    economy: {
      economicPower: 77,
      gdpBillionUsd: 2150,
      annualBudgetBillionUsd: 780,
      currencyCode: 'BRL',
      primaryResources: ['المنتجات الزراعية', 'النفط البحري', 'خام الحديد', 'الطاقة الكهرومائية']
    },
    military: {
      overallPower: 68,
      landForces: 71,
      navalForces: 66,
      airForces: 67,
      activePersonnel: 360000,
      doctrine: 'تأمين الأمازون والسواحل الأطلسية الجنوبية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'CHN', name: 'الصين', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'قيادة إقليمية في أمريكا الجنوبية وتجارة الغذاء والطاقة'
    },
    mediaAndPublic: {
      publicOpinion: 67,
      mediaInfluence: 70,
      narrativeSummary: 'تركيز على الأمن الغذائي والطاقة المتجددة وحوض الأمازون (تجريبي).'
    },
    mapColor: '#16a34a',
    summary: 'الركيزة الاقتصادية والجغرافية الأكبر في أمريكا الجنوبية بموارد زراعية ومعدنية واسعة (بيانات محاكاة تجريبية).'
  })
];
