/**
 * @jest-environment node
 */

const {
  detectLanguage,
  resolveReplyLanguage,
  classifyKeyword,
  t,
} = require('@/lib/jenny-language');

describe('jenny-language', () => {
  describe('detectLanguage', () => {
    it('detects Spanish from accented characters', () => {
      expect(detectLanguage('¿Cuánto cuesta el servicio?')).toBe('es');
    });

    it('detects Spanish from common words', () => {
      expect(detectLanguage('hola necesito una cita para mañana')).toBe('es');
    });

    it('defaults to English for plain English text', () => {
      expect(detectLanguage('Hi, I need a quote for lawn mowing')).toBe('en');
    });

    it('defaults to English on empty input', () => {
      expect(detectLanguage('')).toBe('en');
    });
  });

  describe('resolveReplyLanguage', () => {
    it('forces English when company setting is en', () => {
      expect(resolveReplyLanguage('es', 'en')).toBe('en');
    });

    it('forces Spanish when company setting is es', () => {
      expect(resolveReplyLanguage('en', 'es')).toBe('es');
    });

    it('mirrors the customer when setting is both', () => {
      expect(resolveReplyLanguage('es', 'both')).toBe('es');
      expect(resolveReplyLanguage('en', 'both')).toBe('en');
    });

    it('mirrors the customer when setting is undefined', () => {
      expect(resolveReplyLanguage('es')).toBe('es');
    });
  });

  describe('classifyKeyword', () => {
    it('recognizes STOP variants', () => {
      expect(classifyKeyword('STOP')).toBe('stop');
      expect(classifyKeyword('unsubscribe')).toBe('stop');
      expect(classifyKeyword('baja')).toBe('stop');
    });

    it('recognizes START and HELP', () => {
      expect(classifyKeyword('start')).toBe('start');
      expect(classifyKeyword('HELP')).toBe('help');
      expect(classifyKeyword('ayuda')).toBe('help');
    });

    it('returns null for ordinary messages', () => {
      expect(classifyKeyword('I need a plumber tomorrow')).toBeNull();
    });
  });

  describe('t (string bundles)', () => {
    it('returns Spanish strings for es', () => {
      expect(t('es').missedCallText('Mi Compañía')).toContain('Lamentamos');
    });

    it('returns English strings for en', () => {
      expect(t('en').missedCallText('My Co')).toContain('Sorry we missed');
    });

    it('builds a localized booking confirmation', () => {
      const msg = t('es').bookingConfirmed({
        name: 'Ana', service: 'Jardinería', date: 'lun, jun 22', time: '9:00 AM', company: 'Verde',
      });
      expect(msg).toContain('Ana');
      expect(msg).toContain('Verde');
    });
  });
});
