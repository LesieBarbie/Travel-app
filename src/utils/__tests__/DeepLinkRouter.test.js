import DeepLinkRouter, {
  Destination,
  DestinationType,
  MockDeepLinkRouter,
} from '../../navigation/DeepLinkRouter';

describe('DeepLinkRouter — parseURL', () => {
  let router;

  beforeEach(() => {
    router = new DeepLinkRouter();
  });

  // ============================================================
  // 1. Базові маршрути
  // ============================================================
  test('parseURL("travelmap://country/123") returns Country("123")', () => {
    const result = router.parseURL('travelmap://country/123');
    expect(result).toEqual({ type: DestinationType.COUNTRY, id: '123' });
  });

  test('parseURL("travelmap://catalog?filter=new") returns Catalog("new")', () => {
    const result = router.parseURL('travelmap://catalog?filter=new');
    expect(result).toEqual({ type: DestinationType.CATALOG, filter: 'new' });
  });

  test('parseURL("travelmap://catalog") returns Catalog(null) — optional param missing', () => {
    const result = router.parseURL('travelmap://catalog');
    expect(result).toEqual({ type: DestinationType.CATALOG, filter: null });
  });

  test('parseURL("travelmap://invite/ABC") returns Invite("ABC")', () => {
    const result = router.parseURL('travelmap://invite/ABC');
    expect(result).toEqual({ type: DestinationType.INVITE, token: 'ABC' });
  });

  // ============================================================
  // 2. HTTPS схема — обробляється так само, як кастомна
  // ============================================================
  test('parseURL("https://travelmap.app/country/999") returns Country("999")', () => {
    const result = router.parseURL('https://travelmap.app/country/999');
    expect(result).toEqual({ type: DestinationType.COUNTRY, id: '999' });
  });

  test('parseURL HTTPS catalog with filter works the same', () => {
    const result = router.parseURL('https://travelmap.app/catalog?filter=visited');
    expect(result).toEqual({ type: DestinationType.CATALOG, filter: 'visited' });
  });

  // ============================================================
  // 3. Невалідні / порожні URL — null без exception
  // ============================================================
  test('parseURL("travelmap://unknown/route") returns null', () => {
    const result = router.parseURL('travelmap://unknown/route');
    expect(result).toBeNull();
  });

  test('parseURL("") returns null without throwing', () => {
    expect(() => router.parseURL('')).not.toThrow();
    expect(router.parseURL('')).toBeNull();
  });

  test('parseURL(null) and undefined return null without throwing', () => {
    expect(router.parseURL(null)).toBeNull();
    expect(router.parseURL(undefined)).toBeNull();
  });

  // ============================================================
  // 4. Регіон — складніший маршрут
  // ============================================================
  test('parseURL country/region returns Region with both params', () => {
    const result = router.parseURL('travelmap://country/276/region/Bayern');
    expect(result).toEqual({
      type: DestinationType.REGION,
      countryId: '276',
      name: 'Bayern',
    });
  });

  // ============================================================
  // 5. handle() делегує navigate
  // ============================================================
  test('handle("travelmap://country/123") calls navigate(Country("123"))', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    router.handle('travelmap://country/123');
    expect(navigateSpy).toHaveBeenCalledWith({
      type: DestinationType.COUNTRY,
      id: '123',
    });
  });

  test('handle("travelmap://invalid") does NOT call navigate', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    router.handle('travelmap://invalid');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  // ============================================================
  // 6. currentDestination оновлюється після navigate
  // ============================================================
  test('after navigate(Country("123")) currentDestination equals Country("123")', () => {
    router.navigate(Destination.Country('123'));
    expect(router.currentDestination).toEqual({
      type: DestinationType.COUNTRY,
      id: '123',
    });
  });

  // ============================================================
  // 7. buildURL — обернений процес parseURL
  // ============================================================
  test('buildURL(Country("123")) generates correct travelmap URL', () => {
    const url = DeepLinkRouter.buildURL(Destination.Country('123'));
    expect(url).toBe('travelmap://country/123');
  });

  // ============================================================
  // 8. MockDeepLinkRouter делегує до реального
  // ============================================================
  test('MockDeepLinkRouter.handle delegates to real router', () => {
    const realRouter = new DeepLinkRouter();
    const navigateSpy = jest.spyOn(realRouter, 'navigate');
    const mock = new MockDeepLinkRouter(realRouter);

    mock.handle('travelmap://country/555');

    expect(mock.handledUrls).toContain('travelmap://country/555');
    expect(navigateSpy).toHaveBeenCalled();
  });
});