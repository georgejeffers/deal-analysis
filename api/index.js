import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log('Fetching URL:', url);
    const response = await axios.get(url);
    console.log('Response received, status:', response.status);
    
    const $ = cheerio.load(response.data);
    
    const listings = [];
    let firstImageUrl = null;
    let totalListings = 0;

    // Extract total listings count
    const totalListingsText = $('.srp-controls__count-heading').text().trim();
    const match = totalListingsText.match(/(\d+(?:,\d+)*)/);
    if (match) {
      totalListings = parseInt(match[1].replace(/,/g, ''));
    }

    $('.s-item').slice(1).each((index, element) => {
      const price = $(element).find('.s-item__price').text().replace(/[^0-9.]/g, '');
      let link = $(element).find('.s-item__link').attr('href');
      const dateElement = $(element).find('.s-item__caption, .s-item__caption--signal POSITIVE');
      const dateText = dateElement.text().replace('Sold ', '');
      const date = parseEbayDate(dateText);

      if (index === 1) {
        firstImageUrl = $(element).find('.s-item__image-wrapper img').attr('src');
      }

      if (price && link && date) {
        listings.push({ price: parseFloat(price), date, link });
      }
    });

    const averagePrice = calculateAveragePrice(listings);
    const averageSaleSpeed = calculateAverageSaleSpeed(listings);

    const result = {
      listings: listings.slice(0, 10),
      firstImageUrl,
      averagePrice,
      averageSaleSpeed,
      totalListings,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in API route:', error);
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    }
    res.status(500).json({ 
      error: 'An error occurred while fetching data', 
      details: error.message,
      stack: error.stack
    });
  }
}

function parseEbayDate(dateText) {
  // ... (keep the existing parseEbayDate function)
}

function calculateAveragePrice(listings) {
  // ... (keep the existing calculateAveragePrice function)
}

function calculateAverageSaleSpeed(listings) {
  // ... (keep the existing calculateAverageSaleSpeed function)
}