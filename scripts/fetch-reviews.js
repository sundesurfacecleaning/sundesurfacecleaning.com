const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml'); // Installed during GitHub Actions run

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const REVIEWS_FILE_PATH = path.join(__dirname, '../_data/reviews.yml');
const BUSINESS_FILE_PATH = path.join(__dirname, '../_data/business.yml');

if (!API_KEY) {
  console.error('ERROR: GOOGLE_PLACES_API_KEY environment variable is required.');
  process.exit(1);
}

// 1. Get CID from business.yml or fallback
function getBusinessCid() {
  try {
    if (fs.existsSync(BUSINESS_FILE_PATH)) {
      const fileContents = fs.readFileSync(BUSINESS_FILE_PATH, 'utf8');
      const loaded = yaml.load(fileContents);
      if (loaded && loaded.cid) {
        return loaded.cid;
      }
    }
  } catch (error) {
    console.warn('Warning: Could not read business.yml for CID, using default.', error.message);
  }
  return '9498524464705765795'; // Static fallback CID
}

// 2. Fetch reviews from Google Places API (Legacy using CID and newest sort)
function fetchGoogleReviews(cid) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?cid=${cid}&fields=reviews&reviews_sort=newest&key=${API_KEY}`;

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
            reject(new Error(`API Error (Status ${parsed.status || res.statusCode}): ${parsed.error_message || data}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// 3. Read existing reviews from reviews.yml
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

// 4. Main execution block
async function main() {
  try {
    const cid = getBusinessCid();
    console.log(`Using Business CID: ${cid}`);

    console.log('Fetching latest Google Reviews...');
    const googleReviews = await fetchGoogleReviews(cid);
    console.log(`Successfully fetched ${googleReviews.length} reviews from Google.`);

    const existingReviews = readExistingReviews();
    console.log(`Loaded ${existingReviews.length} existing reviews from reviews.yml.`);

    // Map Google Reviews format to our Jekyll Schema (omit empty text field)
    const mappedReviews = googleReviews.map(r => {
      const reviewObj = {
        name: r.author_name || 'Anonymous',
        stars: r.rating,
        verified: true,
        googleLink: r.author_url || `https://maps.google.com/?cid=${cid}`
      };
      if (r.text) {
        reviewObj.text = r.text;
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
