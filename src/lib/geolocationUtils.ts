const GOOGLE_MAPS_API_KEY = 'AIzaSyAVamyyQXuecYqP-WyQsVuNdi5mEwUnSGc';

// Browser Geolocation with timeout
function getDeviceLocation(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Device location request timed out'));
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  });
}

// IP-based geolocation fallback
async function getIPLocation(): Promise<{ lat: number; lng: number }> {
  const providers = [
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      parse: (data: any) => ({ lat: data.latitude, lng: data.longitude })
    },
    {
      name: 'geolocation-db',
      url: 'https://geolocation-db.com/json/',
      parse: (data: any) => ({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) })
    },
  ];

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return provider.parse(data);
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error('IP geolocation failed');
}

// Get precise location - tries device first, then IP as fallback
export async function getCurrentLocation(): Promise<{ lat: number; lng: number; accuracy?: number }> {
  console.log('[Geolocation] Starting location acquisition...');

  try {
    console.log('[Geolocation] Attempting device geolocation...');
    const deviceLocation = await getDeviceLocation();
    console.log(`[Geolocation] Device location: ${deviceLocation.lat}, ${deviceLocation.lng} (accuracy: ${deviceLocation.accuracy.toFixed(0)}m)`);
    return deviceLocation;
  } catch (deviceError) {
    console.warn('[Geolocation] Device location unavailable:', (deviceError as Error).message);
    console.log('[Geolocation] Falling back to IP geolocation...');

    try {
      const ipLocation = await getIPLocation();
      console.log(`[Geolocation] IP location: ${ipLocation.lat}, ${ipLocation.lng}`);
      return ipLocation;
    } catch (ipError) {
      console.error('[Geolocation] All methods failed');
      throw new Error('Unable to determine location. Please enable device location or check internet connection.');
    }
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{
  line1: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}> {
  try {
    console.log('[ReverseGeocode] Converting coordinates to address...');

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!res.ok) {
      throw new Error(`Geocoding API error: ${res.status}`);
    }

    const data = await res.json();

    if (data.status === 'ZERO_RESULTS') {
      console.warn('[ReverseGeocode] No address found for coordinates');
      return {
        line1: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        neighborhood: '',
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
        postal_code: '',
      };
    }

    if (!data.results || data.results.length === 0) {
      throw new Error('No geocoding results');
    }

    // Sort results to find the most accurate one
    // Priority: ROOFTOP > RANGE_INTERPOLATED > GEOMETRIC_CENTER
    // Priority: subpremise > premise > street_address > route
    const result = data.results.sort((a: any, b: any) => {
      const getScore = (r: any) => {
        let score = 0;
        const types = r.types || [];
        const locationType = r.geometry?.location_type;

        // Base score from location type accuracy
        if (locationType === 'ROOFTOP') score += 20;
        else if (locationType === 'RANGE_INTERPOLATED') score += 10;
        else if (locationType === 'GEOMETRIC_CENTER') score += 5;

        // Bonus for specific address types
        if (types.includes('subpremise')) score += 5;      // e.g. Apartment, Unit (Very specific)
        else if (types.includes('premise')) score += 4;    // e.g. Building
        else if (types.includes('street_address')) score += 3; // Precise street address
        else if (types.includes('route')) score += 2;          // Street name
        else if (types.includes('intersection')) score += 1;

        return score;
      };

      return getScore(b) - getScore(a);
    })[0];

    const getPart = (types: string[]) => {
      const component = result.address_components.find((c: any) =>
        types.some(type => c.types.includes(type))
      );
      return component?.long_name || component?.short_name || '';
    };

    const address = {
      line1: result.formatted_address.split(',')[0].trim(),
      neighborhood: getPart(['neighborhood', 'sublocality_level_1', 'sublocality']),
      city: getPart(['locality', 'administrative_area_level_2', 'administrative_area_level_3']),
      state: getPart(['administrative_area_level_1']),
      country: getPart(['country']),
      postal_code: getPart(['postal_code']),
    };

    console.log('[ReverseGeocode] Address extracted:', address);
    return address;
  } catch (error) {
    console.error('[ReverseGeocode] Error:', error);
    throw error;
  }
}

export async function getAddressFromLocation(): Promise<{
  lat: number;
  lng: number;
  line1: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}> {
  try {
    console.log('[AddressTracking] Getting delivery address...');

    // Get location (device or IP fallback)
    const location = await getCurrentLocation();

    // Reverse geocode coordinates to street address
    const address = await reverseGeocode(location.lat, location.lng);

    const fullAddress = {
      lat: location.lat,
      lng: location.lng,
      ...address,
    };

    console.log('[AddressTracking] Delivery address obtained successfully');
    return fullAddress;
  } catch (error) {
    console.error('[AddressTracking] Failed:', error);
    throw error;
  }
}
