import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getJSON = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
            body += chunk;
        });
        res.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
    }).on("error", reject);
});

const getText = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
            body += chunk;
        });
        res.on("end", () => resolve(body));
    }).on("error", reject);
});

function isHindering(nature) {
    return ['Brave', 'Relaxed', 'Quiet', 'Sassy'].includes(nature);
}

function isBoosting(nature) {
    return ['Timid', 'Hasty', 'Jolly', 'Naive'].includes(nature);
}

function getSpeedStat(base, nature, speedEvPoints) {
    let finalSpeed = base + 20 + speedEvPoints;
    if (speedEvPoints === 0 && isHindering(nature)) {
        finalSpeed = base + 5;
    }
    if (isHindering(nature)) return Math.floor(finalSpeed * 0.9);
    if (isBoosting(nature)) return Math.floor(finalSpeed * 1.1);
    return Math.floor(finalSpeed * 1.0);
}

function standardizeName(name) {
    let s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (s.endsWith('-')) s = s.slice(0, -1);
    
    // Smogon to Pokeapi specific fixes
    if (s === 'meowscarada') return 'meowscarada';
    if (s.startsWith('urshifu-rapid')) return 'urshifu-rapid-strike';
    if (s === 'urshifu') return 'urshifu-single-strike';
    if (s.startsWith('ogerpon-hearthflame')) return 'ogerpon-hearthflame-mask';
    if (s.startsWith('ogerpon-wellspring')) return 'ogerpon-wellspring-mask';
    if (s.startsWith('ogerpon-cornerstone')) return 'ogerpon-cornerstone-mask';
    if (s === 'ogerpon') return 'ogerpon-teal-mask';
    if (s.startsWith('indeedee-f')) return 'indeedee-female';
    if (s === 'indeedee') return 'indeedee-male';
    if (s.startsWith('basculegion-f')) return 'basculegion-female';
    if (s === 'basculegion') return 'basculegion-male';
    if (s.startsWith('ho-oh')) return 'ho-oh';
    if (s.startsWith('iron-bundle')) return 'iron-bundle';
    
    // Forms
    if (s.includes('alola')) return s.replace('alola', 'alola');
    if (s.includes('galar')) return s.replace('galar', 'galar');
    if (s.includes('hisui')) return s.replace('hisui', 'hisui');
    
    return s;
}

async function run() {
    console.log("Fetching PokeAPI all pokemon list...");
    const pokeData = await getJSON("https://pokeapi.co/api/v2/pokemon?limit=2000");
    const pokeNames = pokeData.results.map(p => p.name);
    
    console.log("Fetching Smogon stats directories...");
    const html = await getText("https://www.smogon.com/stats/");
    const months = [...html.matchAll(/href="([0-9]{4}-[0-9]{2}\/)"/g)].map(m => m[1]);
    const latestMonth = months[months.length - 1];
    
    console.log(`Latest month: ${latestMonth}`);
    const monthHtml = await getText(`https://www.smogon.com/stats/${latestMonth}`);
    
    // Find latest bo1 gen9championsvgc format
    const formatRegex = /href="(gen9championsvgc[^"]*)"/g;
    const allFormats = [...monthHtml.matchAll(formatRegex)].map(m => m[1]);
    const bo1Formats = allFormats.filter(f => !f.includes('bo3') && f.endsWith('.txt'));
    
    bo1Formats.sort();
    const targetFormat = bo1Formats.findLast(f => f.includes('-0.txt')) || bo1Formats[bo1Formats.length - 1];
    
    console.log(`Target format: ${targetFormat}`);
    
    console.log("Fetching usage data...");
    const statsText = await getText(`https://www.smogon.com/stats/${latestMonth}${targetFormat}`);
    
    const lines = statsText.split('\n');
    const pokemonList = [];
    
    for (let i = 5; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('+ ---- +')) break;
        
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 4) continue;
        
        const rank = parseInt(parts[1]);
        const name = parts[2];
        const usagePct = parseFloat(parts[3].replace('%', ''));
        
        if (usagePct < 0.1) continue;
        
        let apiName = standardizeName(name);
        
        if (!pokeNames.includes(apiName)) {
            if (apiName.includes('-therian')) apiName = apiName;
            else if (apiName.includes('camo')) apiName = apiName;
            else if (pokeNames.includes(apiName + '-incarnate')) apiName = apiName + '-incarnate';
            else {
                console.warn(`Could not find PokeAPI match for: ${name} (tried ${apiName})`);
            }
        }
        
        pokemonList.push({
            name,
            apiName,
            usagePct,
            rank
        });
    }
    
    console.log(`Parsed ${pokemonList.length} pokemon. Fetching chaos data...`);
    
    const chaosUrl = `https://www.smogon.com/stats/${latestMonth}chaos/${targetFormat.replace('.txt', '.json')}`;
    let chaosData;
    try {
        chaosData = await getJSON(chaosUrl);
        console.log(`Successfully fetched chaos data.`);
    } catch(e) {
        console.error("Failed to fetch chaos data:", e);
        return;
    }
    
    console.log("Fetching individual stats from PokeAPI...");
    const finalData = [];
    
    for (let i = 0; i < pokemonList.length; i++) {
        const p = pokemonList[i];
        if (i % 20 === 0) console.log(`Progress: ${i} / ${pokemonList.length}`);
        
        try {
            const apiData = await getJSON(`https://pokeapi.co/api/v2/pokemon/${p.apiName}`);
            
            const speedStat = apiData.stats.find(s => s.stat.name === 'speed').base_stat;
            const sprite = apiData.sprites.front_default || apiData.sprites.other['official-artwork'].front_default;
            
            let neutralSpeed = speedStat + 20;
            let medianSpeed = speedStat + 20;
            let averageSpeed = speedStat + 20;
            
            let chaosMonData = chaosData.data[p.name];
            if (chaosMonData && chaosMonData.Spreads) {
                let totalCount = 0;
                let sum = 0;
                let distinctSpeeds = {};
                
                for (const [spreadStr, count] of Object.entries(chaosMonData.Spreads)) {
                    const parts = spreadStr.split(':');
                    if(parts.length < 2) continue;
                    const nature = parts[0];
                    const evs = parts[1].split('/');
                    if(evs.length < 6) continue;
                    const speedEvPoints = parseInt(evs[5]);
                    
                    const finalSpeed = getSpeedStat(speedStat, nature, speedEvPoints);
                    distinctSpeeds[finalSpeed] = (distinctSpeeds[finalSpeed] || 0) + count;
                    totalCount += count;
                    sum += finalSpeed * count;
                }
                
                if (totalCount > 0) {
                    averageSpeed = Math.round(sum / totalCount);
                    
                    let sortedSpeeds = Object.keys(distinctSpeeds).map(Number).sort((a,b) => a - b);
                    let currentCount = 0;
                    const mid = totalCount / 2;
                    for (let s of sortedSpeeds) {
                        currentCount += distinctSpeeds[s];
                        if (currentCount >= mid) {
                            medianSpeed = s;
                            break;
                        }
                    }
                }
            }

            finalData.push({
                name: p.name,
                apiName: p.apiName,
                usagePct: p.usagePct,
                rank: p.rank,
                sprite,
                baseSpeed: speedStat,
                neutralSpeed: neutralSpeed,
                medianSpeed: medianSpeed,
                averageSpeed: averageSpeed
            });
        } catch (e) {
            console.warn(`Failed to fetch PokeAPI data for ${p.apiName}: ${e.message}`);
        }
    }
    
    const outputPath = path.join(__dirname, '..', 'public', 'pokemon-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
    console.log(`Saved ${finalData.length} pokemon to ${outputPath}`);
}

run().catch(console.error);
