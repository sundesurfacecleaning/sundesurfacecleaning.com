const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml'); // Installed during GitHub Actions run

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = process.env.PLACE_ID;
const REVIEWS_FILE_PATH = path.join(__dirname, '../_data/reviews.yml');

if (!API_KEY || !PLACE_ID) {
  console.error('ERROR: GOOGLE_PLACES_API_KEY and PLACE_ID environment variables are required.');
  process.exit(1);
}

// 1. Fetch reviews from Google Places API (New)
function fetchGoogleReviews() {
  const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=reviews&key=${API_KEY}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(parsed.reviews || []);
          } else {
            reject(new Error(`API Error (Status ${res.statusCode}): ${parsed.error ? parsed.error.message : data}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// 2. Read existing reviews from reviews.yml
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

// 3. Main execution block
async function main() {
  try {
    console.log('Fetching latest Google Reviews...');
    const googleReviews = await fetchGoogleReviews();
    console.log(`Successfully fetched ${googleReviews.length} reviews from Google.`);

    const existingReviews = readExistingReviews();
    console.log(`Loaded ${existingReviews.length} existing reviews from reviews.yml.`);

    // Map Google Reviews format to our Jekyll Schema (omit empty text field)
    const mappedReviews = googleReviews.map(r => {
      const reviewObj = {
        name: r.authorAttribution ? r.authorAttribution.displayName : 'Anonymous',
        stars: r.rating,
        verified: true,
        googleLink: r.googleMapsUri || `https://search.google.com/local/reviews?placeid=${PLACE_ID}`
      };
      const textVal = r.text ? r.text.text : '';
      if (textVal) {
        reviewObj.text = textVal;
      }
      return reviewObj;
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
        mergedReviews.unshift(newReview); // Put newer reviews at the top
        addedCount++;
      }
    }

    console.log(`Merged reviews. Added ${addedCount} new reviews.`);

    // Write back to _data/reviews.yml
    const yamlStr = yaml.dump(mergedReviews, {
      lineWidth: -1, // Don't wrap text lines
      quotingType: '"',
      forceQuotes: false
    });

    fs.writeFileSync(REVIEWS_FILE_PATH, yamlStr, 'utf8');
    console.log('Successfully updated _data/reviews.yml.');

  } catch (error) {
    console.error('Migration execution failed:', error.message);
    process.exit(1);
  }
}

main();
