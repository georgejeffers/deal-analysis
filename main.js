import { searchEbay, analyzeWholesaleDeal } from './script.js';

// Function to perform the analysis (adjust as needed based on your HTML structure)
async function performAnalysis() {
    const searchTerm = document.getElementById('searchTerm').value;
    const size = document.getElementById('size').value;
    const condition = document.getElementById('condition').value;
    const totalCost = parseFloat(document.getElementById('totalCost').value);
    const quantity = parseInt(document.getElementById('quantity').value);

    try {
        const ebayData = await searchEbay({ searchTerm, size, condition });
        const analysis = analyzeWholesaleDeal(ebayData, totalCost, quantity);
        // Display the analysis results (implement this part based on your UI)
        console.log(analysis);
    } catch (error) {
        console.error('Error during analysis:', error);
        // Display error message to the user
    }
}

// Attach the performAnalysis function to the window object so it can be called from HTML
window.performAnalysis = performAnalysis;