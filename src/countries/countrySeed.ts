export * from './countrySeedHelpers';
import { buildTriBandFlagSvg, buildVerticalTriBandFlagSvg, createSeedCountry } from './countrySeedHelpers';
import { SEED_COUNTRIES_B } from './countrySeedB';
import { COUNTRY_SCHEMA_VERSION, CountryProfile } from './countryTypes';

export const SEED_COUNTRIES: CountryProfile[] = [
  createSeedCountry({
    iso3: 'SAU',
    nameAr: 'المملكة العربية السعودية',
    nameEn: 'Saudi Arabia',
    flag: {
      mode: 'svg',
      emoji: '🇸🇦',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#15803d"/><rect x="18" y="18" width="54" height="10" rx="2" fill="#f8fafc" opacity="0.9"/><rect x="20" y="38" width="50" height="4" rx="2" fill="#f8fafc"/><polygon points="66,35 74,40 66,45" fill="#f8fafc"/></svg>'
    },
    capitalAr: 'الرياض',
    capitalEn: 'Riyadh',
    areaKm2: 2149690,
    population: 36400000,
    regimeType: 'ملكية مركزية (إطار تجريبي)',
    leader: {
      name: 'القيادة العليا — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'مجلس الوزراء — ملف تجريبي',
      headTitle: 'رئاسة مجلس الوزراء',
      cabinetLabel: 'الحكومة المركزية'
    },
    stability: {
      politicalStability: 82,
      internalStability: 84,
      internationalInfluence: 78
    },
    economy: {
      economicPower: 80,
      gdpBillionUsd: 1060,
      annualBudgetBillionUsd: 330,
      currencyCode: 'SAR',
      primaryResources: ['النفط الخام', 'الغاز الطبيعي', 'البتروكيماويات', 'الطاقة الشمسية', 'الفوسفات']
    },
    military: {
      overallPower: 74,
      landForces: 72,
      navalForces: 64,
      airForces: 81,
      activePersonnel: 257000,
      doctrine: 'ردع جوي وبحري متعدد المسارح (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'ARE', name: 'الإمارات العربية المتحدة', type: 'alliance', notes: 'تنسيق استراتيجي واقتصادي' },
        { targetIso3: 'EGY', name: 'جمهورية مصر العربية', type: 'defense_pact', notes: 'أمن البحر الأحمر' },
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'trade', notes: 'شراكة طاقة ودفاع' }
      ],
      rivalries: [
        { name: 'توترات إقليمية مفتوحة', type: 'tension', notes: 'قابل للتخصيص حسب السيناريو' }
      ],
      diplomaticStance: 'توازن إقليمي وتحالفات طاقة'
    },
    mediaAndPublic: {
      publicOpinion: 79,
      mediaInfluence: 76,
      narrativeSummary: 'تركيز إعلامي على مشروعات التحول الاقتصادي وأمن الممرات البحرية (تجريبي).'
    },
    mapColor: '#15803d',
    summary: 'قوة إقليمية محورية في شبه الجزيرة العربية وممر البحر الأحمر والخليج، تتميز بثقل في أسواق الطاقة وقدرات جوية متقدمة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'EGY',
    nameAr: 'جمهورية مصر العربية',
    nameEn: 'Egypt',
    flag: {
      mode: 'svg',
      emoji: '🇪🇬',
      svg: buildTriBandFlagSvg('#dc2626', '#f8fafc', '#0f172a', '<circle cx="45" cy="30" r="5" fill="#d97706"/>')
    },
    capitalAr: 'القاهرة',
    capitalEn: 'Cairo',
    areaKm2: 1002450,
    population: 109000000,
    regimeType: 'جمهورية رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'رئيس مجلس الوزراء — ملف تجريبي',
      headTitle: 'رئيس الوزراء',
      cabinetLabel: 'الحكومة التنفيذية'
    },
    stability: {
      politicalStability: 68,
      internalStability: 70,
      internationalInfluence: 72
    },
    economy: {
      economicPower: 64,
      gdpBillionUsd: 400,
      annualBudgetBillionUsd: 115,
      currencyCode: 'EGP',
      primaryResources: ['قناة السويس', 'الغاز الطبيعي', 'الزراعة', 'السياحة', 'المعادن']
    },
    military: {
      overallPower: 76,
      landForces: 82,
      navalForces: 71,
      airForces: 75,
      activePersonnel: 440000,
      doctrine: 'تأمين الممر الملاحي والدفاع المشترك (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'SAU', name: 'المملكة العربية السعودية', type: 'defense_pact', notes: 'أمن البحر الأحمر' },
        { targetIso3: 'ARE', name: 'الإمارات العربية المتحدة', type: 'alliance', notes: 'استثمارات وتنسيق إقليمي' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'trade', notes: 'شراكة بحرية وتسليح' }
      ],
      rivalries: [
        { name: 'نزاعات الموارد المائية', type: 'tension', notes: 'ملف قابل للتخصيص في السيناريو' }
      ],
      diplomaticStance: 'محورية شرق المتوسط والبحر الأحمر'
    },
    mediaAndPublic: {
      publicOpinion: 66,
      mediaInfluence: 74,
      narrativeSummary: 'تغطية تركز على البنية التحتية وأمن قناة السويس والدور الدبلوماسي الإقليمي (تجريبي).'
    },
    mapColor: '#b45309',
    summary: 'دولة محورية تتحكم في قناة السويس وتربط بين المتوسط والبحر الأحمر مع كتلة سكانية وبشرية كبيرة (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'ARE',
    nameAr: 'الإمارات العربية المتحدة',
    nameEn: 'United Arab Emirates',
    flag: {
      mode: 'svg',
      emoji: '🇦🇪',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="20" y="0" fill="#15803d"/><rect width="90" height="20" y="20" fill="#f8fafc"/><rect width="90" height="20" y="40" fill="#0f172a"/><rect width="24" height="60" x="0" fill="#dc2626"/></svg>'
    },
    capitalAr: 'أبوظبي',
    capitalEn: 'Abu Dhabi',
    areaKm2: 83600,
    population: 9900000,
    regimeType: 'اتحاد دستوري (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الاتحاد'
    },
    government: {
      headOfGovernment: 'رئيس مجلس الوزراء — ملف تجريبي',
      headTitle: 'رئيس مجلس الوزراء'
    },
    stability: {
      politicalStability: 88,
      internalStability: 90,
      internationalInfluence: 74
    },
    economy: {
      economicPower: 82,
      gdpBillionUsd: 510,
      annualBudgetBillionUsd: 165,
      currencyCode: 'AED',
      primaryResources: ['النفط والغاز', 'الموانئ اللوجستية', 'التجارة المالية', 'التقنية والطاقة النظيفة']
    },
    military: {
      overallPower: 66,
      landForces: 62,
      navalForces: 64,
      airForces: 76,
      activePersonnel: 65000,
      doctrine: 'قوة سريعة الانتشار ومنظومات دفاعية حديثة (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'SAU', name: 'المملكة العربية السعودية', type: 'alliance' },
        { targetIso3: 'EGY', name: 'جمهورية مصر العربية', type: 'alliance' },
        { targetIso3: 'IND', name: 'الهند', type: 'trade' }
      ],
      rivalries: [],
      diplomaticStance: 'شبكات تجارة وموانئ متعددة الأقطاب'
    },
    mediaAndPublic: {
      publicOpinion: 84,
      mediaInfluence: 71,
      narrativeSummary: 'صورة رقمية وتجارية عالية التأثير مع تركيز على الموانئ والابتكار (تجريبي).'
    },
    mapColor: '#0f766e',
    summary: 'مركز تجاري وملاحي متقدم على مضيق هرمز وخليج عُمان مع مرونة مالية عالية (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'TUR',
    nameAr: 'تركيا',
    nameEn: 'Turkey',
    flag: {
      mode: 'svg',
      emoji: '🇹🇷',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#dc2626"/><circle cx="38" cy="30" r="14" fill="#f8fafc"/><circle cx="42" cy="30" r="11" fill="#dc2626"/><polygon points="55,24 57,28 62,28 58,31 59,36 55,33 51,36 52,31 48,28 53,28" fill="#f8fafc"/></svg>'
    },
    capitalAr: 'أنقرة',
    capitalEn: 'Ankara',
    areaKm2: 783562,
    population: 85000000,
    regimeType: 'جمهورية رئاسية (إطار تجريبي)',
    leader: {
      name: 'رئيس الجمهورية — ملف تجريبي',
      title: 'رئيس الدولة'
    },
    government: {
      headOfGovernment: 'مجلس الوزراء التنفيذي — ملف تجريبي',
      headTitle: 'رئيس الهيئة التنفيذية'
    },
    stability: {
      politicalStability: 64,
      internalStability: 66,
      internationalInfluence: 76
    },
    economy: {
      economicPower: 71,
      gdpBillionUsd: 1020,
      annualBudgetBillionUsd: 290,
      currencyCode: 'TRY',
      primaryResources: ['الصناعات الدفاعية', 'التصنيع', 'الزراعة', 'مضائق البوسفور']
    },
    military: {
      overallPower: 79,
      landForces: 82,
      navalForces: 73,
      airForces: 78,
      activePersonnel: 355000,
      doctrine: 'سيطرة على المضائق ومسيّرات تكتيكية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'alliance', notes: 'شراكة دفاعية تقليدية' },
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'trade' }
      ],
      rivalries: [
        { name: 'ملفات شرق المتوسط', type: 'tension', notes: 'تحديات حدود بحرية تجريبية' }
      ],
      diplomaticStance: 'دبلوماسية توازن بين الكتل والمضائق'
    },
    mediaAndPublic: {
      publicOpinion: 62,
      mediaInfluence: 73,
      narrativeSummary: 'حضور إعلامي عابر للحدود يركز على التصنيع الدفاعي والدور الإقليمي (تجريبي).'
    },
    mapColor: '#be123c',
    summary: 'نقطة التقاء بين البحر الأسود والمتوسط تتحكم بمضائق البوسفور والدردنيل مع قاعدة صناعية دفاعية (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'USA',
    nameAr: 'الولايات المتحدة الأمريكية',
    nameEn: 'United States',
    flag: {
      mode: 'svg',
      emoji: '🇺🇸',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#f8fafc"/><rect width="90" height="10" y="0" fill="#dc2626"/><rect width="90" height="10" y="20" fill="#dc2626"/><rect width="90" height="10" y="40" fill="#dc2626"/><rect width="40" height="32" fill="#1e3a8a"/><circle cx="12" cy="10" r="2" fill="#f8fafc"/><circle cx="24" cy="10" r="2" fill="#f8fafc"/><circle cx="18" cy="18" r="2" fill="#f8fafc"/><circle cx="12" cy="24" r="2" fill="#f8fafc"/><circle cx="24" cy="24" r="2" fill="#f8fafc"/></svg>'
    },
    capitalAr: 'واشنطن العاصمة',
    capitalEn: 'Washington, D.C.',
    areaKm2: 9833517,
    population: 335000000,
    regimeType: 'جمهورية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الولايات المتحدة'
    },
    government: {
      headOfGovernment: 'الإدارة التنفيذية الفيدرالية — ملف تجريبي',
      headTitle: 'السلطة التنفيذية'
    },
    stability: {
      politicalStability: 74,
      internalStability: 71,
      internationalInfluence: 94
    },
    economy: {
      economicPower: 96,
      gdpBillionUsd: 27000,
      annualBudgetBillionUsd: 6500,
      currencyCode: 'USD',
      primaryResources: ['التكنولوجيا والبرمجيات', 'الطاقة الصخرية', 'الأسواق المالية', 'الزراعة الصناعية']
    },
    military: {
      overallPower: 96,
      landForces: 90,
      navalForces: 97,
      airForces: 98,
      activePersonnel: 1328000,
      doctrine: 'انتشار بحري وجوي عالمي بحاملات الطائرات (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'defense_pact' },
        { targetIso3: 'FRA', name: 'فرنسا', type: 'alliance' },
        { targetIso3: 'JPN', name: 'اليابان', type: 'defense_pact' },
        { targetIso3: 'DEU', name: 'ألمانيا', type: 'alliance' }
      ],
      rivalries: [
        { targetIso3: 'CHN', name: 'الصين', type: 'rivalry', notes: 'تنافس تجاري وتقني وبحري' },
        { targetIso3: 'RUS', name: 'روسيا', type: 'rivalry', notes: 'تنافس أمني واستراتيجي' }
      ],
      diplomaticStance: 'شبكة تحالفات بحرية وأمنية عابرة للمحيطات'
    },
    mediaAndPublic: {
      publicOpinion: 61,
      mediaInfluence: 92,
      narrativeSummary: 'منظومة إعلامية وتقنية عالمية التأثير مع استقطاب داخلي ملحوظ (تجريبي).'
    },
    mapColor: '#1d4ed8',
    summary: 'قوة محيطية واقتصادية كبرى ذات انتشار بحري وجوي واسع وشبكة تحالفات في الأطلسي والهادئ (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'CHN',
    nameAr: 'الصين',
    nameEn: 'China',
    flag: {
      mode: 'svg',
      emoji: '🇨🇳',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><rect width="90" height="60" fill="#dc2626"/><polygon points="18,10 20,16 26,16 21,19 23,25 18,21 13,25 15,19 10,16 16,16" fill="#facc15"/><circle cx="32" cy="12" r="2" fill="#facc15"/><circle cx="35" cy="18" r="2" fill="#facc15"/><circle cx="32" cy="24" r="2" fill="#facc15"/></svg>'
    },
    capitalAr: 'بكين',
    capitalEn: 'Beijing',
    areaKm2: 9596961,
    population: 1410000000,
    regimeType: 'جمهورية مركزية (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الجمهورية'
    },
    government: {
      headOfGovernment: 'رئيس مجلس الدولة — ملف تجريبي',
      headTitle: 'رئيس الوزراء'
    },
    stability: {
      politicalStability: 80,
      internalStability: 78,
      internationalInfluence: 90
    },
    economy: {
      economicPower: 93,
      gdpBillionUsd: 18000,
      annualBudgetBillionUsd: 4200,
      currencyCode: 'CNY',
      primaryResources: ['التصنيع الثقيل', 'المعادن النادرة', 'الإلكترونيات', 'الموانئ وسلاسل الإمداد']
    },
    military: {
      overallPower: 91,
      landForces: 90,
      navalForces: 89,
      airForces: 88,
      activePersonnel: 2035000,
      doctrine: 'منع الوصول البحري وتحديث الأساطيل (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'RUS', name: 'روسيا', type: 'trade', notes: 'شراكة طاقة وتنسيق أوراسي' },
        { targetIso3: 'BRA', name: 'البرازيل', type: 'trade', notes: 'شراكة موارد وتجارة' }
      ],
      rivalries: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'rivalry', notes: 'تنافس استراتيجي وتقني' },
        { targetIso3: 'IND', name: 'الهند', type: 'tension', notes: 'منافسة حدودية وبحرية' }
      ],
      diplomaticStance: 'مبادرات ممرات تجارية وشبكة موانئ عالمية'
    },
    mediaAndPublic: {
      publicOpinion: 75,
      mediaInfluence: 82,
      narrativeSummary: 'خطاب إعلامي يركز على النمو الصناعي والشراكات التجارية الدولية (تجريبي).'
    },
    mapColor: '#b91c1c',
    summary: 'قطب تصنيعي وبحري رئيسي في شرق آسيا يتمتع بسلاسل إمداد ضخمة ونفوذ تجاري عابر للقارات (بيانات محاكاة تجريبية).'
  }),

  createSeedCountry({
    iso3: 'RUS',
    nameAr: 'روسيا',
    nameEn: 'Russia',
    flag: {
      mode: 'svg',
      emoji: '🇷🇺',
      svg: buildTriBandFlagSvg('#f8fafc', '#1d4ed8', '#dc2626')
    },
    capitalAr: 'موسكو',
    capitalEn: 'Moscow',
    areaKm2: 17098242,
    population: 144000000,
    regimeType: 'جمهورية فيدرالية (إطار تجريبي)',
    leader: {
      name: 'رئيس الدولة — ملف تجريبي',
      title: 'رئيس الاتحاد'
    },
    government: {
      headOfGovernment: 'رئيس الحكومة — ملف تجريبي',
      headTitle: 'رئيس الوزراء'
    },
    stability: {
      politicalStability: 66,
      internalStability: 65,
      internationalInfluence: 81
    },
    economy: {
      economicPower: 69,
      gdpBillionUsd: 2050,
      annualBudgetBillionUsd: 490,
      currencyCode: 'RUB',
      primaryResources: ['الغاز الطبيعي', 'النفط', 'الحبوب', 'التيتانيوم واليورانيوم']
    },
    military: {
      overallPower: 88,
      landForces: 89,
      navalForces: 80,
      airForces: 85,
      activePersonnel: 1150000,
      doctrine: 'ردع صاروخي استراتيجي ومدرعات برية (تجريبي)'
    },
    diplomacy: {
      alliances: [
        { targetIso3: 'CHN', name: 'الصين', type: 'trade', notes: 'تعاون طاقة واقتصاد' }
      ],
      rivalries: [
        { targetIso3: 'USA', name: 'الولايات المتحدة الأمريكية', type: 'rivalry' },
        { targetIso3: 'GBR', name: 'المملكة المتحدة', type: 'sanctions' }
      ],
      diplomaticStance: 'محاور أوراسية وسياسة طاقة استراتيجية'
    },
    mediaAndPublic: {
      publicOpinion: 64,
      mediaInfluence: 74,
      narrativeSummary: 'رسائل إعلامية موجهة حول الأمن القومي وتوازن الأقطاب (تجريبي).'
    },
    mapColor: '#4338ca',
    summary: 'أكبر دولة مساحة في العالم بموارد طاقة ومعادن وفيرة وقدرات صاروخية وبرية واسعة (بيانات محاكاة تجريبية).'
  }),

  ...SEED_COUNTRIES_B
];
