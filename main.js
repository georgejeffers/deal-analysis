import { searchEbay, analyzeWholesaleDeal } from './script.js';

export async function performAnalysis() {
    const itemName = document.getElementById('itemName').value;
    const size = document.getElementById('size').value;
    const condition = document.getElementById('condition').value;
    const totalCost = parseFloat(document.getElementById('totalCost').value);
    const quantity = parseInt(document.getElementById('quantity').value);

    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    try {
        console.log('Searching eBay for:', { searchTerm: itemName, size, condition });
        const ebayData = await searchEbay({ searchTerm: itemName, size, condition });
        console.log('eBay data received:', ebayData);

        if (!ebayData || ebayData.averagePrice === 0 || ebayData.averageSaleSpeed === 0) {
            throw new Error('No valid eBay data received. Please try a different search term.');
        }

        const analysis = analyzeWholesaleDeal(ebayData, totalCost, quantity);
        console.log('Analysis result:', analysis);

        resultsDiv.innerHTML = `
            <h2>Results</h2>
            <div class="results-content">
                <div class="results-item">
                    <span>Average Sale Price:</span>
                    <span>£${analysis.averagePrice}</span>
                </div>
                <div class="results-item">
                    <span>Average Sales per Day:</span>
                    <span>${analysis.averageSaleSpeed}</span>
                </div>
                <div class="results-item">
                    <span>Cost per Item:</span>
                    <span>£${analysis.costPerItem}</span>
                </div>
                <div class="results-item">
                    <span>Total Revenue:</span>
                    <span>£${analysis.revenue}</span>
                </div>
                <div class="results-item">
                    <span>Total Profit:</span>
                    <span>£${analysis.profit}</span>
                </div>
                <div class="results-item">
                    <span>Profit per Item:</span>
                    <span>£${analysis.profitPerItem}</span>
                </div>
                <div class="results-item">
                    <span>Estimated Sell-Through Time:</span>
                    <span>${analysis.sellThroughTime}</span>
                </div>
                <div class="results-item">
                    <span>Competition (Active Listings):</span>
                    <span>${analysis.competitionNumber}</span>
                </div>
            </div>
        `;
        resultsDiv.style.display = 'block';
    } catch (error) {
        console.error('Error during analysis:', error);
        resultsDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        resultsDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}