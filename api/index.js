import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;
  try {
    const response = await axios.get(url);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
}