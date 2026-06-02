const fs = require('fs');

function makeAppleTeslaStyle(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    
    // Header icon background
    code = code.replace(/bg-emerald-500 text-white/g, 'bg-black text-white');
    code = code.replace(/ring-emerald-600\/50/g, 'ring-gray-300');
    code = code.replace(/text-emerald-100/g, 'text-gray-400');
    
    // Export button
    code = code.replace(/bg-\[#2e5e22\]/g, 'bg-black');
    code = code.replace(/hover:bg-\[#1b3d12\]/g, 'hover:bg-gray-800');
    
    // "Calcular" button
    // It's already bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800
    
    // Other emerald/green highlights if any
    code = code.replace(/bg-emerald-50\/30/g, 'bg-gray-50');
    code = code.replace(/text-emerald-700/g, 'text-gray-900');
    
    // Blue/emerald gradients to gray
    code = code.replace(/from-emerald-50/g, 'from-gray-50');
    code = code.replace(/to-blue-50/g, 'to-gray-100');
    code = code.replace(/from-green-50/g, 'from-gray-50');
    
    // Active tabs 
    code = code.replace(/text-gray-500 hover:text-gray-700/g, 'text-gray-500 hover:text-black hover:bg-gray-200/50');
    
    fs.writeFileSync(filePath, code);
}

makeAppleTeslaStyle('frontend/src/App.tsx');
makeAppleTeslaStyle('frontend/src/components/Simulator.tsx');
console.log('Apple/Tesla color styling applied');
