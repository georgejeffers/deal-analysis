import axios from 'https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm';

// Remove these lines as they're no longer needed
// const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
// const axios = isBrowser ? window.axios : null;

function trimEbayUrl(url) {
    const match = url.match(/(ebay\.co\.uk\/itm\/\d+)/);
    return match ? `https://${match[0]}` : url;
}

async function searchEbay({ searchTerm, size, condition }) {
  try {
    // URL for sold listings
    let soldUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(
      searchTerm.replace(/ /g, "+")
    )}&LH_Sold=1&LH_Complete=1&LH_PrefLoc=1&_sop=13`;

    // URL for active listings
    let activeUrl = `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(
      searchTerm.replace(/ /g, "+")
    )}&LH_PrefLoc=1&_sop=13`;

    if (condition === "used") {
      soldUrl += "&LH_ItemCondition=3000";
      activeUrl += "&LH_ItemCondition=3000";
    } else if (condition === "new") {
      soldUrl += "&LH_ItemCondition=1000";
      activeUrl += "&LH_ItemCondition=1000";
    }

    if (size && size !== "any") {
      if (size.match(/^(5|6|7|8|9|10|11|12)$/)) {
        const sizeParam = `&UK+Shoe+Size=${size}&UK%2520Shoe%2520Size=${size}`;
        soldUrl += sizeParam;
        activeUrl += sizeParam;
      } else if (size.match(/^[SMLXL]+$/i)) {
        const sizeParam = `&Size=${size.toUpperCase()}`;
        soldUrl += sizeParam;
        activeUrl += sizeParam;
      }
    }

    console.log('Sending request to server for sold listings:', soldUrl);
    console.log('Sending request to server for active listings:', activeUrl);

    const [soldResponse, activeResponse] = await Promise.all([
      axios.get(`/api/search`, { params: { url: soldUrl } }),
      axios.get(`/api/search`, { params: { url: activeUrl } })
    ]);

    console.log('Raw server response for sold listings:', soldResponse.data);
    console.log('Raw server response for active listings:', activeResponse.data);

    const soldData = soldResponse.data;
    const activeListingsCount = activeResponse.data.totalListings;

    if (soldData.listings.length === 0) {
      throw new Error('No sold listings found. Please try a different search term.');
    }

    return {
      ...soldData,
      competitionNumber: activeListingsCount
    };
  } catch (error) {
    console.error("Error fetching eBay data:", error);
    throw error;
  }
}

async function findSold(url) {
    try {
        const corsProxy = 'https://cors-anywhere.herokuapp.com/';
        const response = await axios.get(corsProxy + url);
        const html = response.data;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const listings = [];
        let firstImageUrl = null;

        doc.querySelectorAll(".s-item").forEach((element, index) => {
            if (index < 12) {
                const price = element.querySelector(".s-item__price")?.textContent;
                let link = element.querySelector(".s-item__link")?.getAttribute("href");
                link = trimEbayUrl(link);
                const dateElement = element.querySelector(".s-item__caption, .s-item__caption--signal POSITIVE");
                const dateText = dateElement?.textContent;
                const date = dateText ? parseEbayDate(dateText) : null;

                if (index === 2) {
                    firstImageUrl = element.querySelector(".s-item__image-wrapper.image-treatment img")?.getAttribute("src");
                }

                if (price && link && date) {
                    listings.push({ price, date, link });
                }
            }
        });

        const averagePrice = calculateAveragePrice(listings);
        const averageSaleSpeed = calculateAverageSaleSpeed(listings);

        return {
            listings: listings.slice(0, 10),
            firstImageUrl,
            averagePrice,
            averageSaleSpeed,
        };
    } catch (error) {
        console.error("Error fetching eBay data:", error);
        return {
            listings: [],
            firstImageUrl: null,
            averagePrice: null,
            averageSaleSpeed: null,
        };
    }
}

function calculateAveragePrice(listings) {
    const prices = listings.map((listing) =>
        parseFloat(listing.price.replace(/[^0-9.-]+/g, ""))
    );
    const total = prices.reduce((acc, price) => acc + price, 0);
    return (total / prices.length).toFixed(2);
}

function calculateAverageSaleSpeed(listings) {
    const now = new Date();
    const sortedListings = listings.sort((a, b) => new Date(b.date) - new Date(a.date));
    const timestamps = sortedListings.map(listing => new Date(listing.date).getTime());
    
    // Calculate time differences between consecutive sales
    const timeDiffs = [];
    for (let i = 1; i < timestamps.length; i++) {
        const diff = timestamps[i-1] - timestamps[i];
        if (diff > 0) timeDiffs.push(diff);
    }
    
    if (timeDiffs.length === 0) {
        return listings.length.toFixed(2); // All sales happened on the same day
    }
    
    // Calculate average time difference
    const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    
    // Convert average time difference to days
    const avgDaysBetweenSales = avgTimeDiff / (1000 * 60 * 60 * 24);
    
    // Calculate sales per day
    const salesPerDay = 1 / avgDaysBetweenSales;
    
    return salesPerDay.toFixed(2);
}

function parseEbayDate(dateText) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();

    if (dateText.includes('Sold')) {
        return now.toISOString().split('T')[0];
    }

    const [day, month] = dateText.split(' ');
    const monthIndex = months.indexOf(month);
    if (monthIndex === -1) {
        console.error('Invalid month in date:', dateText);
        return null;
    }

    // Use the next year for dates that appear to be in the future
    let year = currentYear;
    const date = new Date(year, monthIndex, parseInt(day));
    if (date < now) {
        year = currentYear + 1;
        date.setFullYear(year);
    }

    if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateText);
        return null;
    }
    return date.toISOString().split('T')[0];
}

function getMonthNumber(monthAbbr) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months.indexOf(monthAbbr.toLowerCase());
}

function analyzeWholesaleDeal(ebayData, totalCost, quantity) {
    const costPerItem = totalCost / quantity;
    const revenue = ebayData.averagePrice * quantity;
    const profit = revenue - totalCost;
    const profitPerItem = profit / quantity;
    const sellThroughTime = calculateSellThroughTime(quantity, ebayData.averageSaleSpeed, ebayData.competitionNumber);
    const competitionNumber = ebayData.competitionNumber;

    return {
        costPerItem: costPerItem.toFixed(2),
        revenue: revenue.toFixed(2),
        profit: profit.toFixed(2),
        profitPerItem: profitPerItem.toFixed(2),
        sellThroughTime,
        competitionNumber,
        averagePrice: ebayData.averagePrice,
        averageSaleSpeed: ebayData.averageSaleSpeed
    };
}

function calculateSellThroughTime(quantity, averageSaleSpeed, competitionNumber) {
    // Calculate the competition effect
    const competitionEffect = competitionNumber / (averageSaleSpeed * quantity);

    // Calculate the time to sell all items in days
    const sellThroughDays = quantity / averageSaleSpeed;

    // Calculate the adjusted sell-through time in days
    const adjustedSellThroughDays = sellThroughDays + competitionEffect;

    // Convert the adjusted time to a human-readable format
    if (adjustedSellThroughDays < 1) {
        return `${Math.round(adjustedSellThroughDays * 24)} hours`;
    } else if (adjustedSellThroughDays < 7) {
        return `${Math.round(adjustedSellThroughDays)} days`;
    } else if (adjustedSellThroughDays < 30) {
        return `${Math.round(adjustedSellThroughDays / 7)} weeks`;
    } else {
        return `${Math.round(adjustedSellThroughDays / 30)} months`;
    }
}

// Instead of making functions globally available, export them
export { searchEbay, analyzeWholesaleDeal };