import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Extract data from the HTML using cheerio
    const listings = [];
    $('.s-item').each((index, element) => {
      if (index < 12) {
        const price = $(element).find('.s-item__price').text();
        const link = $(element).find('.s-item__link').attr('href');
        const dateElement = $(element).find('.s-item__caption, .s-item__caption--signal POSITIVE');
        const dateText = dateElement.text();
        
        if (price && link && dateText) {
          listings.push({ price, link, date: dateText });
        }
      }
    });

    const totalListings = $('.srp-controls__count-heading').text().match(/\d+/)[0];

    res.status(200).json({ listings, totalListings });
  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ error: 'An error occurred', details: error.message });
  }
}