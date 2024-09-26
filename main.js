import { searchEbay, analyzeWholesaleDeal } from './script.js';

export async function performAnalysis() {
    const searchTerm = document.getElementById('itemName').value;
    const size = document.getElementById('size').value;
    const condition = document.getElementById('condition').value;
    const totalCost = parseFloat(document.getElementById('totalCost').value);
    const quantity = parseInt(document.getElementById('quantity').value);

    try {
        const ebayData = await searchEbay({ searchTerm, size, condition });
        const analysis = analyzeWholesaleDeal(ebayData, totalCost, quantity);
        // Display the analysis results (implement this part based on your UI)
        console.log(analysis);
        document.getElementById('results').innerHTML = JSON.stringify(analysis, null, 2);
    } catch (error) {
        console.error('Error during analysis:', error);
        document.getElementById('results').innerHTML = `Error: ${error.message}`;
    }
}