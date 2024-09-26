const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/search', async (req, res) => {
  try {
    const { url } = req.query;
    console.log('Received search request with URL:', url);

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await axios.get(url);
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
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while fetching data', details: error.message });
  }
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));