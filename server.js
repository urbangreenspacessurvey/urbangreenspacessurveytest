const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new sqlite3.Database('survey.db');

// Create tables with all the new question fields
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        language TEXT,
        consent1 TEXT, consent2 TEXT, consent3 TEXT, consent4 TEXT,
        picture_response INTEGER,
        pa1 INTEGER, pa2 INTEGER, pa3 INTEGER, pa4 INTEGER, pa5 INTEGER, pa6 INTEGER, pa7 INTEGER,
        pa8 INTEGER, pa9 INTEGER, pa10 INTEGER, pa11 INTEGER, pa12 INTEGER, pa13 INTEGER, pa14 INTEGER,
        nostalgia1 INTEGER, nostalgia2 INTEGER, nostalgia3 INTEGER, nostalgia4 INTEGER,
        pwb1 INTEGER, pwb2 INTEGER, pwb3 INTEGER, pwb4 INTEGER, pwb5 INTEGER, pwb6 INTEGER,
        pwb7 INTEGER, pwb8 INTEGER, pwb9 INTEGER, pwb10 INTEGER, pwb11 INTEGER, pwb12 INTEGER,
        pwb13 INTEGER, pwb14 INTEGER, pwb15 INTEGER, pwb16 INTEGER, pwb17 INTEGER, pwb18 INTEGER,
        soj1 INTEGER, soj2 INTEGER, soj3 INTEGER, soj4 INTEGER, soj5 INTEGER, soj6 INTEGER,
        soj7 INTEGER, soj8 INTEGER, soj9 INTEGER, soj10 INTEGER, soj11 INTEGER,
        wildlife1 INTEGER, wildlife2 INTEGER, wildlife3 INTEGER, wildlife4 INTEGER, wildlife5 INTEGER, wildlife6 INTEGER,
        wildlife7 INTEGER, wildlife8 INTEGER, wildlife9 INTEGER,
        first_visit TEXT, site_background TEXT, wildlife_sharing TEXT, future_vision TEXT, contact_info TEXT,
        distance TEXT, age TEXT, gender TEXT, education TEXT, visit_frequency TEXT,
        important_places TEXT, important_drawings TEXT, wildlife_encounters TEXT,
        important_places_data TEXT, wildlife_encounters_data TEXT, drawings_data TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS map_markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        survey_id INTEGER,
        map_type TEXT,
        latitude REAL,
        longitude REAL,
        marker_type TEXT,
        wildlife_type TEXT,
        emotion TEXT,
        experience_text TEXT,
        geojson_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (survey_id) REFERENCES surveys (id)
    )`);
    
    // Migration: Add picture_response column if it doesn't exist
    db.run(`ALTER TABLE surveys ADD COLUMN picture_response INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding picture_response column:', err);
        }
    });
    
    // Migration: Add experience_text column to map_markers if it doesn't exist
    db.run(`ALTER TABLE map_markers ADD COLUMN experience_text TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding experience_text column:', err);
        }
    });
    
    // Migration: Add important_places_data column to surveys if it doesn't exist
    db.run(`ALTER TABLE surveys ADD COLUMN important_places_data TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding important_places_data column:', err);
        }
    });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/database', (req, res) => {
    db.all(`SELECT * FROM surveys ORDER BY id DESC`, (err, surveys) => {
        if (err) {
            console.error('Error fetching surveys:', err);
            return res.status(500).send('Database error: ' + err.message);
        }
        
        console.log('Raw survey data from database:', surveys);
        
        db.all(`SELECT * FROM map_markers ORDER BY survey_id, id`, (err, markers) => {
            if (err) {
                console.error('Error fetching markers:', err);
                return res.status(500).send('Database error');
            }
            
            let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Survey Database</title><style>
            body{font-family:Arial,sans-serif;margin:20px;background:#f5f5f5}
            .container{max-width:1600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 5px 15px rgba(0,0,0,0.1)}
            h1{color:#2c5530;text-align:center;border-bottom:3px solid #2d8a47;padding-bottom:10px}
            .download-btn{background:#2d8a47;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;margin:20px auto}
            .table-container{overflow:auto;max-height:800px;border:1px solid #ddd;border-radius:8px}
            table{width:100%;border-collapse:collapse;min-width:4200px}
            th{background:#2d8a47;color:white;padding:8px 4px;text-align:center;position:sticky;top:0;z-index:10;font-size:0.9em;min-width:40px}
            td{padding:6px 4px;border-bottom:1px solid #eee;border-right:1px solid #eee;vertical-align:top;font-size:0.9em}
            tr:nth-child(even){background:#f8f9fa}
            tr:hover{background:#e8f5e8}
            .number-col{text-align:center;font-weight:bold;min-width:35px;max-width:45px}
            .long-text{max-width:200px;word-wrap:break-word;font-size:0.8em}
            .map-data{max-width:300px;font-size:0.8em;word-wrap:break-word}
            .marker-count{background:#2d8a47;color:white;padding:2px 6px;border-radius:3px;font-size:0.8em}
            </style></head><body><div class="container"><h1>🌿 Green Spaces Survey Database</h1>
            <div style="text-align:center;margin:20px 0">
            <a href="/download-csv" class="download-btn">⬇️ Download CSV</a></div>`;
            
            if (surveys.length === 0) {
                html += '<div style="text-align:center;padding:50px">No survey data available yet.</div>';
            } else {
                html += '<div class="table-container"><table><thead><tr>' +
                '<th>ID</th><th>Date</th><th>Lang</th><th>Pic_Resp</th>' +
                '<th>PA1</th><th>PA2</th><th>PA3</th><th>PA4</th><th>PA5</th><th>PA6</th><th>PA7</th><th>PA8</th><th>PA9</th><th>PA10</th><th>PA11</th><th>PA12</th><th>PA13</th><th>PA14</th><th>PA_Avg</th>' +
                '<th>N1</th><th>N2</th><th>N3</th><th>N4</th><th>N_Avg</th>' +
                '<th>PWB1</th><th>PWB2</th><th>PWB3</th><th>PWB4</th><th>PWB5</th><th>PWB6</th><th>PWB7</th><th>PWB8</th><th>PWB9</th><th>PWB10</th><th>PWB11</th><th>PWB12</th><th>PWB13</th><th>PWB14</th><th>PWB15</th><th>PWB16</th><th>PWB17</th><th>PWB18</th><th>PWB_Avg</th>' +
                '<th>SOJ1</th><th>SOJ2</th><th>SOJ3</th><th>SOJ4</th><th>SOJ5</th><th>SOJ6</th><th>SOJ7</th><th>SOJ8</th><th>SOJ9</th><th>SOJ10</th><th>SOJ11</th><th>SOJ_Avg</th>' +
                '<th>WF1</th><th>WF2</th><th>WF3</th><th>WF4</th><th>WF5</th><th>WF6</th><th>WF7</th><th>WF8</th><th>WF9</th><th>WF_Avg</th>' +
                '<th>Age</th><th>Gender</th><th>Education</th><th>Distance</th><th>Visit_Freq</th>' +
                '<th>First_Visit</th><th>Background</th><th>Wildlife_Share</th><th>Future</th><th>Contact</th>' +
                '<th>Important_Places</th><th>Wildlife_Encounters</th><th>Drawings</th>' +
                '</tr></thead><tbody>';
                
                surveys.forEach(survey => {
                    // Calculate averages
                    const paValues = [survey.pa1, survey.pa2, survey.pa3, survey.pa4, survey.pa5, survey.pa6, survey.pa7, survey.pa8, survey.pa9, survey.pa10, survey.pa11, survey.pa12, survey.pa13, survey.pa14].filter(v => v != null);
                    const paAvg = paValues.length > 0 ? (paValues.reduce((a, b) => a + b, 0) / paValues.length).toFixed(2) : '';
                    
                    const nostalgiaValues = [survey.nostalgia1, survey.nostalgia2, survey.nostalgia3, survey.nostalgia4].filter(v => v != null);
                    const nostalgiaAvg = nostalgiaValues.length > 0 ? (nostalgiaValues.reduce((a, b) => a + b, 0) / nostalgiaValues.length).toFixed(2) : '';
                    
                    const pwbValues = [survey.pwb1, survey.pwb2, survey.pwb3, survey.pwb4, survey.pwb5, survey.pwb6, survey.pwb7, survey.pwb8, survey.pwb9, survey.pwb10, survey.pwb11, survey.pwb12, survey.pwb13, survey.pwb14, survey.pwb15, survey.pwb16, survey.pwb17, survey.pwb18].filter(v => v != null);
                    const pwbAvg = pwbValues.length > 0 ? (pwbValues.reduce((a, b) => a + b, 0) / pwbValues.length).toFixed(2) : '';
                    
                    const sojValues = [survey.soj1, survey.soj2, survey.soj3, survey.soj4, survey.soj5, survey.soj6, survey.soj7, survey.soj8, survey.soj9, survey.soj10, survey.soj11].filter(v => v != null);
                    const sojAvg = sojValues.length > 0 ? (sojValues.reduce((a, b) => a + b, 0) / sojValues.length).toFixed(2) : '';
                    
                    const wildlifeValues = [survey.wildlife1, survey.wildlife2, survey.wildlife3, survey.wildlife4, survey.wildlife5, survey.wildlife6, survey.wildlife7, survey.wildlife8, survey.wildlife9].filter(v => v != null);
                    const wildlifeAvg = wildlifeValues.length > 0 ? (wildlifeValues.reduce((a, b) => a + b, 0) / wildlifeValues.length).toFixed(2) : '';
                    
                    const date = new Date(survey.created_at).toLocaleString();
                    const importantPlacesData = survey.important_places_data || '';
                    const wildlifeData = survey.wildlife_encounters_data || '';
                    const drawingsData = survey.drawings_data || '';
                    
                    html += `<tr>
                        <td class="number-col">${survey.id}</td>
                        <td>${date}</td>
                        <td>${survey.language || ''}</td>
                        <td class="number-col">${survey.picture_response || ''}</td>
                        <td class="number-col">${survey.pa1 || ''}</td>
                        <td class="number-col">${survey.pa2 || ''}</td>
                        <td class="number-col">${survey.pa3 || ''}</td>
                        <td class="number-col">${survey.pa4 || ''}</td>
                        <td class="number-col">${survey.pa5 || ''}</td>
                        <td class="number-col">${survey.pa6 || ''}</td>
                        <td class="number-col">${survey.pa7 || ''}</td>
                        <td class="number-col">${survey.pa8 || ''}</td>
                        <td class="number-col">${survey.pa9 || ''}</td>
                        <td class="number-col">${survey.pa10 || ''}</td>
                        <td class="number-col">${survey.pa11 || ''}</td>
                        <td class="number-col">${survey.pa12 || ''}</td>
                        <td class="number-col">${survey.pa13 || ''}</td>
                        <td class="number-col">${survey.pa14 || ''}</td>
                        <td class="number-col">${paAvg}</td>
                        <td class="number-col">${survey.nostalgia1 || ''}</td>
                        <td class="number-col">${survey.nostalgia2 || ''}</td>
                        <td class="number-col">${survey.nostalgia3 || ''}</td>
                        <td class="number-col">${survey.nostalgia4 || ''}</td>
                        <td class="number-col">${nostalgiaAvg}</td>
                        <td class="number-col">${survey.pwb1 || ''}</td>
                        <td class="number-col">${survey.pwb2 || ''}</td>
                        <td class="number-col">${survey.pwb3 || ''}</td>
                        <td class="number-col">${survey.pwb4 || ''}</td>
                        <td class="number-col">${survey.pwb5 || ''}</td>
                        <td class="number-col">${survey.pwb6 || ''}</td>
                        <td class="number-col">${survey.pwb7 || ''}</td>
                        <td class="number-col">${survey.pwb8 || ''}</td>
                        <td class="number-col">${survey.pwb9 || ''}</td>
                        <td class="number-col">${survey.pwb10 || ''}</td>
                        <td class="number-col">${survey.pwb11 || ''}</td>
                        <td class="number-col">${survey.pwb12 || ''}</td>
                        <td class="number-col">${survey.pwb13 || ''}</td>
                        <td class="number-col">${survey.pwb14 || ''}</td>
                        <td class="number-col">${survey.pwb15 || ''}</td>
                        <td class="number-col">${survey.pwb16 || ''}</td>
                        <td class="number-col">${survey.pwb17 || ''}</td>
                        <td class="number-col">${survey.pwb18 || ''}</td>
                        <td class="number-col">${pwbAvg}</td>
                        <td class="number-col">${survey.soj1 || ''}</td>
                        <td class="number-col">${survey.soj2 || ''}</td>
                        <td class="number-col">${survey.soj3 || ''}</td>
                        <td class="number-col">${survey.soj4 || ''}</td>
                        <td class="number-col">${survey.soj5 || ''}</td>
                        <td class="number-col">${survey.soj6 || ''}</td>
                        <td class="number-col">${survey.soj7 || ''}</td>
                        <td class="number-col">${survey.soj8 || ''}</td>
                        <td class="number-col">${survey.soj9 || ''}</td>
                        <td class="number-col">${survey.soj10 || ''}</td>
                        <td class="number-col">${survey.soj11 || ''}</td>
                        <td class="number-col">${sojAvg}</td>
                        <td class="number-col">${survey.wildlife1 || ''}</td>
                        <td class="number-col">${survey.wildlife2 || ''}</td>
                        <td class="number-col">${survey.wildlife3 || ''}</td>
                        <td class="number-col">${survey.wildlife4 || ''}</td>
                        <td class="number-col">${survey.wildlife5 || ''}</td>
                        <td class="number-col">${survey.wildlife6 || ''}</td>
                        <td class="number-col">${survey.wildlife7 || ''}</td>
                        <td class="number-col">${survey.wildlife8 || ''}</td>
                        <td class="number-col">${survey.wildlife9 || ''}</td>
                        <td class="number-col">${wildlifeAvg}</td>
                        <td>${survey.age || ''}</td>
                        <td>${survey.gender || ''}</td>
                        <td>${survey.education || ''}</td>
                        <td>${survey.distance || ''}</td>
                        <td>${survey.visit_frequency || ''}</td>
                        <td class="long-text">${survey.first_visit || ''}</td>
                        <td class="long-text">${survey.site_background || ''}</td>
                        <td class="long-text">${survey.wildlife_sharing || ''}</td>
                        <td class="long-text">${survey.future_vision || ''}</td>
                        <td class="long-text">${survey.contact_info || ''}</td>
                        <td class="map-data">${importantPlacesData}</td>
                        <td class="map-data">${wildlifeData}</td>
                        <td class="map-data">${drawingsData}</td>
                    </tr>`;
                });
                
                html += '</tbody></table></div>';
            }
            
            html += '</div></body></html>';
            res.send(html);
        });
    });
});

app.get('/download-csv', (req, res) => {
    db.all(`SELECT * FROM surveys ORDER BY id DESC`, (err, surveys) => {
        if (err) {
            console.error('Error fetching surveys for CSV:', err);
            return res.status(500).send('Error generating CSV');
        }
        
        const headers = [
            'Survey_ID', 'Submission_Date', 'Language', 'Picture_Response',
            'PA1', 'PA2', 'PA3', 'PA4', 'PA5', 'PA6', 'PA7', 'PA8', 'PA9', 'PA10',
            'PA11', 'PA12', 'PA13', 'PA14', 'PA_Average',
            'Nostalgia1', 'Nostalgia2', 'Nostalgia3', 'Nostalgia4', 'Nostalgia_Average',
            'PWB1', 'PWB2', 'PWB3', 'PWB4', 'PWB5', 'PWB6', 'PWB7', 'PWB8', 'PWB9', 'PWB10',
            'PWB11', 'PWB12', 'PWB13', 'PWB14', 'PWB15', 'PWB16', 'PWB17', 'PWB18', 'PWB_Average',
            'SOJ1', 'SOJ2', 'SOJ3', 'SOJ4', 'SOJ5', 'SOJ6', 'SOJ7', 'SOJ8', 'SOJ9', 'SOJ10',
            'SOJ11', 'SOJ_Average',
            'Wildlife1', 'Wildlife2', 'Wildlife3', 'Wildlife4', 'Wildlife5', 'Wildlife6', 'Wildlife7', 'Wildlife8', 'Wildlife9', 'Wildlife_Average',
            'Age', 'Gender', 'Education', 'Distance', 'Visit_Frequency',
            'First_Visit', 'Site_Background', 'Wildlife_Sharing', 'Future_Vision', 'Total_Map_Markers',
            'Important_Places_Data', 'Wildlife_Encounters_Data', 'Drawings_Data'
        ];
        
        let csvContent = headers.join(',') + '\n';
        
        surveys.forEach(survey => {
            let importantPlaces = [], importantDrawings = [], wildlifeEncounters = [];
            
            try {
                importantPlaces = survey.important_places ? JSON.parse(survey.important_places) : [];
                importantDrawings = survey.important_drawings ? JSON.parse(survey.important_drawings) : [];
                wildlifeEncounters = survey.wildlife_encounters ? JSON.parse(survey.wildlife_encounters) : [];
            } catch (e) {}
            
            // Calculate averages
            const paValues = [survey.pa1, survey.pa2, survey.pa3, survey.pa4, survey.pa5, survey.pa6, survey.pa7, survey.pa8, survey.pa9, survey.pa10, survey.pa11, survey.pa12, survey.pa13, survey.pa14].filter(v => v != null);
            const paAvg = paValues.length > 0 ? (paValues.reduce((a, b) => a + b, 0) / paValues.length).toFixed(2) : '';
            
            const nostalgiaValues = [survey.nostalgia1, survey.nostalgia2, survey.nostalgia3, survey.nostalgia4].filter(v => v != null);
            const nostalgiaAvg = nostalgiaValues.length > 0 ? (nostalgiaValues.reduce((a, b) => a + b, 0) / nostalgiaValues.length).toFixed(2) : '';
            
            const pwbValues = [survey.pwb1, survey.pwb2, survey.pwb3, survey.pwb4, survey.pwb5, survey.pwb6, survey.pwb7, survey.pwb8, survey.pwb9, survey.pwb10, survey.pwb11, survey.pwb12, survey.pwb13, survey.pwb14, survey.pwb15, survey.pwb16, survey.pwb17, survey.pwb18].filter(v => v != null);
            const pwbAvg = pwbValues.length > 0 ? (pwbValues.reduce((a, b) => a + b, 0) / pwbValues.length).toFixed(2) : '';
            
            const sojValues = [survey.soj1, survey.soj2, survey.soj3, survey.soj4, survey.soj5, survey.soj6, survey.soj7, survey.soj8, survey.soj9, survey.soj10, survey.soj11].filter(v => v != null);
            const sojAvg = sojValues.length > 0 ? (sojValues.reduce((a, b) => a + b, 0) / sojValues.length).toFixed(2) : '';
            
                    const wildlifeValues = [survey.wildlife1, survey.wildlife2, survey.wildlife3, survey.wildlife4, survey.wildlife5, survey.wildlife6, survey.wildlife7, survey.wildlife8, survey.wildlife9].filter(v => v != null);
        const wildlifeAvg = wildlifeValues.length > 0 ? (wildlifeValues.reduce((a, b) => a + b, 0) / wildlifeValues.length).toFixed(2) : '';
            
            const date = new Date(survey.created_at).toLocaleString();
            
            const row = [
                survey.id,
                date,
                survey.language || '',
                survey.picture_response || '',
                survey.pa1 || '', survey.pa2 || '', survey.pa3 || '', survey.pa4 || '', survey.pa5 || '', survey.pa6 || '', survey.pa7 || '', survey.pa8 || '', survey.pa9 || '', survey.pa10 || '',
                survey.pa11 || '', survey.pa12 || '', survey.pa13 || '', survey.pa14 || '', paAvg,
                survey.nostalgia1 || '', survey.nostalgia2 || '', survey.nostalgia3 || '', survey.nostalgia4 || '', nostalgiaAvg,
                survey.pwb1 || '', survey.pwb2 || '', survey.pwb3 || '', survey.pwb4 || '', survey.pwb5 || '', survey.pwb6 || '', survey.pwb7 || '', survey.pwb8 || '', survey.pwb9 || '', survey.pwb10 || '',
                survey.pwb11 || '', survey.pwb12 || '', survey.pwb13 || '', survey.pwb14 || '', survey.pwb15 || '', survey.pwb16 || '', survey.pwb17 || '', survey.pwb18 || '', pwbAvg,
                survey.soj1 || '', survey.soj2 || '', survey.soj3 || '', survey.soj4 || '', survey.soj5 || '', survey.soj6 || '', survey.soj7 || '', survey.soj8 || '', survey.soj9 || '', survey.soj10 || '',
                survey.soj11 || '', sojAvg,
                survey.wildlife1 || '', survey.wildlife2 || '', survey.wildlife3 || '', survey.wildlife4 || '', survey.wildlife5 || '', survey.wildlife6 || '', survey.wildlife7 || '', survey.wildlife8 || '', survey.wildlife9 || '', wildlifeAvg,
                survey.age || '', survey.gender || '', survey.education || '', survey.distance || '', survey.visit_frequency || '',
                survey.first_visit ? `"${survey.first_visit.replace(/"/g, '""')}"` : '',
                survey.site_background ? `"${survey.site_background.replace(/"/g, '""')}"` : '',
                survey.wildlife_sharing ? `"${survey.wildlife_sharing.replace(/"/g, '""')}"` : '',
                survey.future_vision ? `"${survey.future_vision.replace(/"/g, '""')}"` : '',
                importantPlaces.length + importantDrawings.length + wildlifeEncounters.length,
                survey.important_places_data || '',
                survey.wildlife_encounters_data || '',
                survey.drawings_data || ''
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="survey_data.csv"');
        res.send(csvContent);
    });
});

app.post('/submit-survey', (req, res) => {
    const data = req.body;
    console.log('Received survey data:', data);
    
    // Parse and format map data before insertion
    let wildlifeEncounters = [];
    let importantDrawings = [];
    
    try {
        wildlifeEncounters = data.wildlife_encounters ? JSON.parse(data.wildlife_encounters) : [];
        importantDrawings = data.important_drawings ? JSON.parse(data.important_drawings) : [];
    } catch (e) {
        console.error('Error parsing map data for storage:', e);
        wildlifeEncounters = [];
        importantDrawings = [];
    }
    
    const formatImportantPlaces = (places) => {
        if (!places || places.length === 0) return '';
        return places.map(p => `${p.type || 'Place'}:${(p.experience || '').substring(0, 50)}${(p.experience || '').length > 50 ? '...' : ''}(${p.lat},${p.lng})`).join(';');
    };
    
    const formatWildlifeEncounters = (encounters) => {
        if (!encounters || encounters.length === 0) return '';
        return encounters.map(e => `${e.wildlife}:${e.emotion}(${e.lat},${e.lng})`).join(';');
    };
    
    const formatDrawings = (drawings) => {
        if (!drawings || drawings.length === 0) return '';
        return drawings.map(drawing => {
            if (drawing.geometry && drawing.geometry.coordinates) {
                const coords = drawing.geometry.coordinates;
                if (coords.length > 0) {
                    // Calculate average coordinates
                    const avgLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
                    const avgLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
                    return `LineString(${avgLat},${avgLng})`;
                }
            }
            return 'LineString(unknown)';
        }).join(';');
    };
    
    let importantPlaces = [];
    try {
        importantPlaces = data.important_places ? JSON.parse(data.important_places) : [];
    } catch (e) {
        console.error('Error parsing important places for storage:', e);
        importantPlaces = [];
    }
    
    const importantPlacesData = formatImportantPlaces(importantPlaces);
    const wildlifeEncountersData = formatWildlifeEncounters(wildlifeEncounters);
    const drawingsData = formatDrawings(importantDrawings);

    const insertSurvey = `INSERT INTO surveys (
        language, consent1, consent2, consent3, consent4, picture_response,
        pa1, pa2, pa3, pa4, pa5, pa6, pa7, pa8, pa9, pa10, pa11, pa12, pa13, pa14,
        nostalgia1, nostalgia2, nostalgia3, nostalgia4,
        pwb1, pwb2, pwb3, pwb4, pwb5, pwb6, pwb7, pwb8, pwb9, pwb10, pwb11, pwb12, pwb13, pwb14, pwb15, pwb16, pwb17, pwb18,
        soj1, soj2, soj3, soj4, soj5, soj6, soj7, soj8, soj9, soj10, soj11,
        wildlife1, wildlife2, wildlife3, wildlife4, wildlife5, wildlife6, wildlife7, wildlife8, wildlife9,
        first_visit, site_background, wildlife_sharing, future_vision, contact_info,
        distance, age, gender, education, visit_frequency,
        important_places, important_drawings, wildlife_encounters,
        important_places_data, wildlife_encounters_data, drawings_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        data.language || 'en',
        data.consent1, data.consent2, data.consent3, data.consent4, data.picture_response,
        data.pa1, data.pa2, data.pa3, data.pa4, data.pa5, data.pa6, data.pa7, data.pa8, data.pa9, data.pa10, data.pa11, data.pa12, data.pa13, data.pa14,
        data.nostalgia1, data.nostalgia2, data.nostalgia3, data.nostalgia4,
        data.pwb1, data.pwb2, data.pwb3, data.pwb4, data.pwb5, data.pwb6, data.pwb7, data.pwb8, data.pwb9, data.pwb10, data.pwb11, data.pwb12, data.pwb13, data.pwb14, data.pwb15, data.pwb16, data.pwb17, data.pwb18,
        data.soj1, data.soj2, data.soj3, data.soj4, data.soj5, data.soj6, data.soj7, data.soj8, data.soj9, data.soj10, data.soj11,
        data.wildlife1, data.wildlife2, data.wildlife3, data.wildlife4, data.wildlife5, data.wildlife6, data.wildlife7, data.wildlife8, data.wildlife9,
        data.first_visit, data.site_background, data.wildlife_sharing, data.future_vision, data.contact_info,
        data.distance, data.age, data.gender, data.education, data.visit_frequency,
        data.important_places || '[]',
        data.important_drawings || '[]', 
        data.wildlife_encounters || '[]',
        importantPlacesData,
        wildlifeEncountersData,
        drawingsData
    ];
    
    db.run(insertSurvey, values, function(err) {
        if (err) {
            console.error('Error inserting survey:', err);
            return res.status(500).json({ error: 'Error saving survey data' });
        }
        
        const surveyId = this.lastID;
        console.log('Survey inserted successfully with ID:', surveyId);
        
        // Insert map markers if they exist
        const insertMarkers = () => {
            // Use the already parsed data
            
            const allMarkers = [
                ...importantPlaces.map(place => ({
                    survey_id: surveyId,
                    map_type: 'important_place',
                    latitude: place.lat,
                    longitude: place.lng,
                    marker_type: place.type,
                    experience_text: place.experience || null,
                    geojson_data: JSON.stringify(place)
                })),
                ...wildlifeEncounters.map(encounter => ({
                    survey_id: surveyId,
                    map_type: 'wildlife_encounter',
                    latitude: encounter.lat,
                    longitude: encounter.lng,
                    wildlife_type: encounter.wildlife,
                    emotion: encounter.emotion,
                    geojson_data: JSON.stringify(encounter)
                })),
                ...importantDrawings.map(drawing => ({
                    survey_id: surveyId,
                    map_type: 'drawing',
                    latitude: null,
                    longitude: null,
                    geojson_data: JSON.stringify(drawing)
                }))
            ];
            
            if (allMarkers.length > 0) {
                const insertMarker = `INSERT INTO map_markers (survey_id, map_type, latitude, longitude, marker_type, wildlife_type, emotion, experience_text, geojson_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                allMarkers.forEach(marker => {
                    db.run(insertMarker, [
                        marker.survey_id,
                        marker.map_type,
                        marker.latitude,
                        marker.longitude,
                        marker.marker_type || null,
                        marker.wildlife_type || null,
                        marker.emotion || null,
                        marker.experience_text || null,
                        marker.geojson_data
                    ], (err) => {
                        if (err) {
                            console.error('Error inserting marker:', err);
                        }
                    });
                });
            }
        };
        
        insertMarkers();
        
        res.json({ 
            success: true, 
            message: 'Survey submitted successfully!',
            surveyId: surveyId
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
