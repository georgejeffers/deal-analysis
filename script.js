import axios from 'https://cdn.jsdelivr.net/npm/axios@1.3.5/+esm';

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

export { searchEbay, analyzeWholesaleDeal };