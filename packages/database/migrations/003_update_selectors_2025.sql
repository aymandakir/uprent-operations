-- Migration: Update CSS selectors for Funda, Pararius, and Kamernet
-- Date: 2025-01-XX
-- Description: Fix broken selectors causing 94% false gaps

-- Update Funda selectors (try multiple fallbacks)
UPDATE platform_monitors 
SET selector = '.search-result, [data-test-id*="search-result"], [data-test-id="search-result-item"], .object-list-item, li[class*="search-result"]',
    expected_min_listings = 400
WHERE name ILIKE '%funda%';

-- Update Pararius selectors
UPDATE platform_monitors 
SET selector = '.listing-search-item, .property-list-item, li[class*="listing"], section[class*="property"], [data-testid*="listing"]',
    expected_min_listings = 400
WHERE name ILIKE '%pararius%';

-- Update Kamernet selectors
UPDATE platform_monitors 
SET selector = '.listing-item, .room-card, div[class*="listing"], div[class*="room"], [data-testid*="listing"], [data-testid*="room"]',
    expected_min_listings = 250
WHERE name ILIKE '%kamernet%';

-- Verify updates
SELECT name, selector, expected_min_listings 
FROM platform_monitors 
WHERE name ILIKE '%funda%' OR name ILIKE '%pararius%' OR name ILIKE '%kamernet%'
ORDER BY name;

