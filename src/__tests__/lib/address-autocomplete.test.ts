import { buildSuggestUrl, parseSuggestions } from '@/lib/address-autocomplete';

describe('address-autocomplete', () => {
  describe('buildSuggestUrl', () => {
    it('builds a Mapbox address-autocomplete URL with the query encoded', () => {
      const url = buildSuggestUrl('1048 Farley Ave', 'tok123');
      expect(url).toContain('https://api.mapbox.com/geocoding/v5/mapbox.places/1048%20Farley%20Ave.json?');
      expect(url).toContain('access_token=tok123');
      expect(url).toContain('autocomplete=true');
      expect(url).toContain('types=address');
      expect(url).toContain('country=us');
    });
  });

  describe('parseSuggestions', () => {
    const sample = {
      features: [
        {
          id: 'address.123',
          place_name: '1048 Farley Ave, Mountain View, California 94043, United States',
          text: 'Farley Avenue',
          address: '1048',
          center: [-122.08, 37.39],
          context: [
            { id: 'postcode.1', text: '94043' },
            { id: 'place.1', text: 'Mountain View' },
            { id: 'region.1', short_code: 'US-CA', text: 'California' },
            { id: 'country.1', short_code: 'us', text: 'United States' },
          ],
        },
      ],
    };

    it('normalizes a Mapbox feature into address parts + coordinates', () => {
      const [s] = parseSuggestions(sample);
      expect(s.address).toBe('1048 Farley Avenue');
      expect(s.city).toBe('Mountain View');
      expect(s.state).toBe('CA');
      expect(s.zip).toBe('94043');
      expect(s.lat).toBe(37.39);
      expect(s.lng).toBe(-122.08);
      expect(s.label).toContain('Mountain View');
    });

    it('returns [] for missing/empty features', () => {
      expect(parseSuggestions(null)).toEqual([]);
      expect(parseSuggestions({})).toEqual([]);
      expect(parseSuggestions({ features: [] })).toEqual([]);
    });

    it('skips features without coordinates', () => {
      expect(parseSuggestions({ features: [{ text: 'Nowhere St', context: [] }] })).toEqual([]);
    });

    it('falls back to region text when no short_code is present', () => {
      const [s] = parseSuggestions({
        features: [
          {
            text: 'Main St',
            center: [-100, 40],
            context: [{ id: 'region.1', text: 'Nebraska' }],
          },
        ],
      });
      expect(s.state).toBe('Nebraska');
    });
  });
});
