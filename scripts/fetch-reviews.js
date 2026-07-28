const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml'); // Installed during GitHub Actions run

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = process.env.PLACE_ID || 'ChIJHx1hPhi9em0RKp1Lxy5Hbmw';
const REVIEWS_FILE_PATH = path.join(__dirname, '../_data/reviews.yml');

if (!API_KEY) {
  console.error('ERROR: GOOGLE_PLACES_API_KEY environment variable is required.');
  process.exit(1);
}

// 1. Fallback Fetch: Queries the New Places Details API (No sorting support, but supports redirected IDs)
function fetchReviewsNewApi() {
  const options = {
    hostname: 'places.googleapis.com',
    path: `/v1/places/${PLACE_ID}`,
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'reviews'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(parsed.reviews || []);
          } else {
            reject(new Error(`New API Error (Status ${res.statusCode}): ${parsed.error ? parsed.error.message : data}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// 2. Resolve Place ID using Legacy Text Search by querying the exact business name
function resolvePlaceIdLegacySearch() {
  const query = encodeURIComponent("Sunde Surface Cleaning");
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${API_KEY}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 && parsed.status === 'OK' && parsed.results && parsed.results.length > 0) {
            resolve(parsed.results[0].place_id);
          } else {
            reject(new Error(`Legacy Search Status: ${parsed.status}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// 3. Fetch reviews from Google Places API (Legacy using resolved Place ID and newest sort)
function fetchReviewsLegacyApi(canonicalId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${canonicalId}&fields=reviews&reviews_sort=newest&key=${API_KEY}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 && (parsed.status === 'OK' || parsed.status === 'ZERO_RESULTS')) {
            resolve((parsed.result && parsed.result.reviews) || []);
          } else {
            reject(new Error(`Legacy Details Status: ${parsed.status}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// 4. Read existing reviews from reviews.yml
function readExistingReviews() {
  try {
    if (fs.existsSync(REVIEWS_FILE_PATH)) {
      const fileContents = fs.readFileSync(REVIEWS_FILE_PATH, 'utf8');
      const loaded = yaml.load(fileContents);
      return Array.isArray(loaded) ? loaded : [];
    }
  } catch (error) {
    console.warn('Warning: Could not read existing reviews file, starting fresh.', error.message);
  }
  return [];
}

// 5. Main execution block
async function main() {
  let googleReviews = [];
  let isLegacyFetched = false;

  try {
    console.log('Attempting to fetch newest reviews using Legacy API...');
    try {
      const activePlaceId = await resolvePlaceIdLegacySearch();
      console.log(`Resolved active Place ID via Legacy Search: ${activePlaceId}`);
      googleReviews = await fetchReviewsLegacyApi(activePlaceId);
      console.log(`Successfully fetched ${googleReviews.length} newest reviews from Legacy API.`);
      isLegacyFetched = true;
    } catch (legacyError) {
      console.warn(`Warning: Legacy API chain failed (${legacyError.message}). Falling back to New Details API (Relevance sort).`);
    }

    // Fallback: If Legacy fetch failed or returned nothing, query the New details API
    if (!isLegacyFetched || googleReviews.length === 0) {
      console.log('Executing fallback Reviews query (New Places Details API)...');
      googleReviews = await fetchReviewsNewApi();
      console.log(`Successfully fetched ${googleReviews.length} relevant reviews from New Places API.`);
    }

    const existingReviews = readExistingReviews();
    console.log(`Loaded ${existingReviews.length} existing reviews from reviews.yml.`);

    // Map Google Reviews format to our Jekyll Schema
    const mappedReviews = googleReviews.map(r => {
      // Handle mapping differently based on which API response we are processing
      if (r.authorAttribution || r.googleMapsUri) {
        // New API structure
        const reviewObj = {
          name: r.authorAttribution ? r.authorAttribution.displayName : 'Anonymous',
          stars: r.rating,
          verified: true,
          googleLink: r.googleMapsUri || `https://search.google.com/local/reviews?placeid=${PLACE_ID}`,
          date: r.publishTime || new Date().toISOString()
        };
        const textVal = r.text ? r.text.text : '';
        if (textVal) {
          reviewObj.text = textVal;
        }
        return reviewObj;
      } else {
        // Legacy API structure
        const reviewObj = {
          name: r.author_name || 'Anonymous',
          stars: r.rating,
          verified: true,
          googleLink: r.author_url || `https://search.google.com/local/reviews?placeid=${PLACE_ID}`,
          date: r.time ? new Date(r.time * 1000).toISOString() : new Date().toISOString()
        };
        if (r.text) {
          reviewObj.text = r.text;
        }
        return reviewObj;
      }
    });

    // Merge reviews (prevent duplicates based on author name and text snippet)
    const mergedReviews = [...existingReviews];
    let addedCount = 0;

    for (const newReview of mappedReviews) {
      const isDuplicate = existingReviews.some(
        ex => ex.name.toLowerCase() === newReview.name.toLowerCase() && 
              (ex.text || '').substring(0, 50) === (newReview.text || '').substring(0, 50)
      );

      if (!isDuplicate) {
        mergedReviews.push(newReview); // Add to the array (sorting will handle order)
        addedCount++;
      }
    }

    // Sort all merged reviews (with date first, newest first)
    mergedReviews.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA; // Descending order (newest first)
    });

    console.log(`Merged reviews. Added ${addedCount} new reviews and sorted chronologically.`);

    // Write back to _data/reviews.yml
    const yamlStr = yaml.dump(mergedReviews, {
      lineWidth: -1, // Don't wrap text lines
      quotingType: '"',
      forceQuotes: false
    });

    fs.writeFileSync(REVIEWS_FILE_PATH, yamlStr, 'utf8');
    console.log('Successfully updated _data/reviews.yml.');

  } catch (error) {
    console.error('Fatal execution error:', error.message);
    process.exit(1);
  }
}

main();
