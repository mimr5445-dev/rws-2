import type { ArDictionary } from './ar';

// المفردات الإنجليزية بنفس المفاتيح. أي نقص يُفشل الاختبار tests/unit/i18n.test.ts.
export const en: Record<keyof ArDictionary, string> = {
  'app.name': 'Studio',
  'app.tagline': 'Analytic motion studio over real maps',
  'app.version': 'Version',
  'app.skipToContent': 'Skip to content',

  'panel.library': 'Library',
  'panel.properties': 'Properties',
  'panel.timeline': 'Timeline',
  'panel.map': 'Preview',

  'library.title': 'Asset library',
  'library.search': 'Search assets',
  'library.all': 'All',
  'library.units': 'Units',
  'library.markers': 'Markers',
  'library.structures': 'Structures',
  'library.zones': 'Zones',
  'library.labels': 'Labels',
  'library.empty': 'The library is empty for now. Assets load in phase 12.',

  'properties.title': 'Properties',
  'properties.empty': 'Select an item on the map or in the timeline to see its properties.',

  'timeline.tracks': 'Tracks',
  'timeline.title': 'Timeline',
  'timeline.empty': 'No tracks yet. Add an entity on the map to begin.',
  'timeline.toggle': 'Show or collapse the timeline',

  'transport.play': 'Play',
  'transport.pause': 'Pause',
  'transport.stop': 'Stop',
  'transport.rewind': 'Go to start',
  'transport.currentTime': 'Current time',
  'transport.duration': 'Duration',

  'map.placeholder': 'Map and preview area',
  'map.hint': 'The map is built in phase 2. This is the final layout shell.',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  'map.fit': 'Fit',

  'project.title': 'Project',
  'project.untitled': 'Untitled project',
  'project.new': 'New project',
  'project.open': 'Open',
  'project.export': 'Export',
  'project.list': 'Projects list',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.arabic': 'Arabic',
  'settings.english': 'English',
  'settings.numbers': 'Numerals',
  'settings.numbersLatn': 'Latin (0-9)',
  'settings.numbersArab': 'Arabic-Indic (٠-٩)',
  'settings.quality': 'Preview quality',
  'settings.qualityLow': 'Low',
  'settings.qualityMedium': 'Medium',
  'settings.qualityHigh': 'High',

  'status.ready': 'Ready',
  'status.offline': 'Works offline',
  'status.autosave': 'Autosave',

  'a11y.openLibrary': 'Open library',
  'a11y.closeLibrary': 'Close library',
  'a11y.openProperties': 'Open properties',
  'a11y.closeProperties': 'Close properties',
  'a11y.mainMap': 'Preview map',
  'a11y.language': 'Change language',
  'a11y.main': 'Main content',
  'a11y.nav': 'Navigation',
  'a11y.zoom': 'Camera tools',
};
