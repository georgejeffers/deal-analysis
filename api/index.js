import axios from 'axios';
import * as cheerio from 'cheerio';
import axiosRetry from 'axios-retry';

const PROXY_HOST = 'p.webshare.io';
const PROXY_PORT = 80;
const PROXY_USER = 'eiejlrib-rotate';
const PROXY_PASS = 'xe8w6x4jqsdf';

// Configure axios to retry failed requests
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const proxiedUrl = url;
    console.log('Fetching URL:', proxiedUrl);
    const response = await axios.get(proxiedUrl, {
      proxy: {
        host: PROXY_HOST,
        port: PROXY_PORT,
        auth: {
          username: PROXY_USER,
          password: PROXY_PASS
        }
      },
      timeout: 10000, // Increase timeout to 10 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive'
      }
    });
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
      } else {
        console.log(`Skipping item due to missing data. Price: ${price}, Link: ${link}, Date: ${date}`);
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

    console.log('Sending response:', result);
    res.json(result);
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
  if (!dateText) return null;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = dateText.trim().split(' ');
  
  if (parts.length !== 3) {
    console.error('Invalid date format:', dateText);
    return null;
  }
  
  const [day, month, year] = parts;
  const monthIndex = months.indexOf(month);
  
  if (monthIndex === -1) {
    console.error('Invalid month in date:', dateText);
    return null;
  }
  
  const parsedDay = parseInt(day);
  const parsedYear = parseInt(year);
  const currentYear = new Date().getFullYear();
  
  // If the parsed year is in the future, subtract 1 year
  const adjustedYear = parsedYear > currentYear ? parsedYear - 1 : parsedYear;
  
  const date = new Date(adjustedYear, monthIndex, parsedDay);
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', dateText);
    return null;
  }
  return date.toISOString().split('T')[0];
}

function calculateAveragePrice(listings) {
  if (listings.length === 0) return 0;
  const total = listings.reduce((sum, listing) => sum + listing.price, 0);
  return (total / listings.length).toFixed(2);
}

function calculateAverageSaleSpeed(listings) {
  if (listings.length < 2) return 0;
  const sortedListings = listings.sort((a, b) => new Date(b.date) - new Date(a.date));
  const daysDiff = (new Date(sortedListings[0].date) - new Date(sortedListings[sortedListings.length - 1].date)) / (1000 * 60 * 60 * 24);
  return (listings.length / daysDiff).toFixed(2);
}