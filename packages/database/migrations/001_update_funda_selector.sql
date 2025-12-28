-- Migration: Update Funda selector to use data-test-id attribute
-- Date: 2025-01-01
-- Description: Funda updated their HTML structure to use data-test-id attributes for listing cards

-- Update the selector for Funda Amsterdam
UPDATE platform_monitors 
SET selector = '[data-test-id="search-result-item"]'
WHERE name = 'Funda';

-- Alternative selectors to try if the above doesn't work:
-- 1. '.search-result'
-- 2. '.object-list-item'  
-- 3. 'li[data-test-id*="search"]'

-- To test selectors, use the /api/test-selector endpoint:
-- POST http://localhost:3001/api/test-selector
-- Body: { "url": "https://www.funda.nl/huur/amsterdam/", "selector": "[data-test-id=\"search-result-item\"]" }

