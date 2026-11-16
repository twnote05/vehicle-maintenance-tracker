/**
 * Vehicle Maintenance Tracking System for Google Sheets
 * Connected to: ตารางการซ่อมบำรุงรถ CRV G3 2.0E 4WD
 * 
 * Features:
 * - Custom menu "Vehicle Tracker" in spreadsheet UI
 * - Web app endpoint for adding maintenance records
 * - Read/Write functions for maintenance data
 * - Summary reports by vehicle and service type
 * - Automatic timestamping
 */

// ============================================================
// CONFIGURATION
// ============================================================
const SS = SpreadsheetApp.getActiveSpreadsheet();
const MAINTENANCE_SHEET = 'Maintenance_Log';  // Update if your sheet name differs
const VEHICLE_INFO_SHEET = 'VehicleInfo';     // Update if different

// Column indices for Maintenance_Log sheet (1-indexed)
// A: Date, B: Vehicle, C: Service Type, D: Mileage, E: Cost, F: Notes, G: Created At
const COL_DATE = 1;
const COL_VEHICLE = 2;
const COL_SERVICE_TYPE = 3;
const COL_MILEAGE = 4;
const COL_COST = 5;
const COL_NOTES = 6;
const COL_CREATED = 7;

// ============================================================
// onOpen - Add custom menu when spreadsheet opens
// ============================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Vehicle Tracker')
    .addItem('Add Maintenance Record', 'showAddRecordDialog')
    .addItem('View All Records', 'showAllRecords')
    .addItem('Summary by Vehicle', 'showSummaryByVehicle')
    .addItem('Summary by Service Type', 'showSummaryByServiceType')
    .addSeparator()
    .addItem('Open Web App', 'openWebApp')
    .addToUi();
}

// ============================================================
// showAddRecordDialog - Show UI for adding a new record
// ============================================================
function showAddRecordDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h3>Add Maintenance Record</h3>
      
      <label>Vehicle (select):</label>
      <select id="vehicleSelect" onchange="updateVehicleInfo()">
        <option value="">-- Select Vehicle --</option>
        ${getVehicleOptions()}
      </select>
      
      <br/><br/>
      
      <label>Service Type:</label>
      <input type="text" id="serviceType" placeholder="e.g., Oil Change, Brake Service">
      
      <label>Mileage:</label>
      <input type="number" id="mileage" min="0" step="1">
      
      <label>Cost (THB):</label>
      <input type="number" id="cost" min="0" step="10">
      
      <label>Notes (optional):</label>
      <textarea id="notes" rows="3" cols="40" placeholder="Additional notes..."></textarea>
      
      <br/><br/>
      <button onclick="submitRecord()" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer;">Submit Record</button>
      <button onclick="google.script.host.close()" style="margin-left: 10px; padding: 10px 20px; border: 1px solid #ccc; cursor: pointer;">Cancel</button>
      
      <div id="vehicleInfo" style="margin-top: 20px; padding: 10px; background: #f5f5f5; display: none;">
        <p><strong>Vehicle Info:</strong> <span id="vehicleDetails"></span></p>
      </div>
    </div>
  `);
  html.setWidth(400);
  html.setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add Maintenance Record');
}

// ============================================================
// getVehicleOptions - Generate HTML option tags for vehicles
// ============================================================
function getVehicleOptions() {
  const vehicleSheet = SS.getSheetByName(VEHICLE_INFO_SHEET);
  if (!vehicleSheet) {
    return '<option value="">Vehicle sheet not found</option>';
  }
  
  const data = vehicleSheet.getDataRange().getValues();
  let options = '';
  
  if (data.length > 1) {
    // Skip header row, get unique vehicle names
    const vehicles = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        vehicles.add(data[i][0]);
      }
    }
    for (const v of vehicles) {
      options += `<option value="${v}">${v}</option>`;
    }
  }
  
  return options;
}

// ============================================================
// updateVehicleInfo - Show vehicle details when selected
// ============================================================
function updateVehicleInfo() {
  const vehicleName = document.getElementById('vehicleSelect').value;
  const vehicleDetails = document.getElementById('vehicleDetails');
  
  if (vehicleName) {
    const vehicleSheet = SS.getSheetByName(VEHICLE_INFO_SHEET);
    if (vehicleSheet) {
      const data = vehicleSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === vehicleName) {
          // Assuming columns: Name, Model, Year, VIN, etc.
          const model = data[i][1] || '';
          const year = data[i][2] || '';
          const vin = data[i][3] || '';
          vehicleDetails.innerHTML = `Model: ${model} | Year: ${year} | VIN: ${vin}`;
          break;
        }
      }
    }
    document.getElementById('vehicleInfo').style.display = 'block';
  } else {
    document.getElementById('vehicleInfo').style.display = 'none';
  }
}

// ============================================================
// submitRecord - Submit the maintenance record to the sheet
// ============================================================
function submitRecord() {
  const vehicle = document.getElementById('vehicleSelect').value;
  const serviceType = document.getElementById('serviceType').value;
  const mileage = document.getElementById('mileage').value;
  const cost = document.getElementById('cost').value;
  const notes = document.getElementById('notes').value;
  
  if (!vehicle || !serviceType) {
    SpreadsheetApp.getUi().alert('Please fill in required fields (Vehicle and Service Type)');
    return;
  }
  
  const sheet = SS.getSheetByName(MAINTENANCE_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Maintenance log sheet not found. Please ensure the sheet name is "' + MAINTENANCE_SHEET + '"');
    return;
  }
  
  const now = new Date();
  const row = [
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
    vehicle,
    serviceType,
    parseInt(mileage) || 0,
    parseInt(cost) || 0,
    notes || '',
    now
  ];
  
  sheet.appendRow(row);
  SpreadsheetApp.getUi().alert('Maintenance record added successfully!');
  google.script.host.close();
}

// ============================================================
// showAllRecords - Display all maintenance records
// ============================================================
function showAllRecords() {
  const sheet = SS.getSheetByName(MAINTENANCE_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Maintenance log sheet not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('No records found');
    return;
  }
  
  let html = `<div style="padding: 20px; font-family: Arial, sans-serif; max-height: 500px; overflow-y: auto;">
    <h3>All Maintenance Records</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 8px; border: 1px solid #ddd;">Date</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Vehicle</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Service Type</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Mileage</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Cost (THB)</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Notes</th>
        </tr>
      </thead>
      <tbody>`;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    html += `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${row[0] || ''}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${row[1] || ''}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${row[2] || ''}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${row[3] || 0}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${row[4] || 0}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${row[5] || ''}</td>
    </tr>`;
  }
  
  html += `</tbody></table></div>`;
  
  const htmlOutput = HtmlService.createHtmlOutput(html);
  htmlOutput.setWidth(600);
  htmlOutput.setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Maintenance Records');
}

// ============================================================
// showSummaryByVehicle - Summary report by vehicle
// ============================================================
function showSummaryByVehicle() {
  const sheet = SS.getSheetByName(MAINTENANCE_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Maintenance log sheet not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('No records found');
    return;
  }
  
  // Aggregate by vehicle
  const vehicleData = {};
  
  for (let i = 1; i < data.length; i++) {
    const vehicle = data[i][1];
    const cost = (data[i][4] || 0) * 1;
    
    if (!vehicleData[vehicle]) {
      vehicleData[vehicle] = { totalCost: 0, count: 0, services: [] };
    }
    vehicleData[vehicle].totalCost += cost;
    vehicleData[vehicle].count++;
    vehicleData[vehicle].services.push(data[i][2]);
  }
  
  let html = `<div style="padding: 20px; font-family: Arial, sans-serif;">
    <h3>Maintenance Summary by Vehicle</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 8px; border: 1px solid #ddd;">Vehicle</th>
          <th style="padding: 8px; border: 1px solid #ddd;"># Services</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Total Cost (THB)</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Average Cost (THB)</th>
        </tr>
      </thead>
      <tbody>`;
  
  const vehicles = Object.keys(vehicleData).sort((a, b) => vehicleData[b].totalCost - vehicleData[a].totalCost);
  
  for (const vehicle of vehicles) {
    const v = vehicleData[vehicle];
    const avgCost = v.count > 0 ? (v.totalCost / v.count).toFixed(2) : 0;
    html += `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${vehicle}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${v.count}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${v.totalCost.toFixed(2)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${avgCost}</td>
    </tr>`;
  }
  
  html += `</tbody></table></div>`;
  
  const htmlOutput = HtmlService.createHtmlOutput(html);
  htmlOutput.setWidth(500);
  htmlOutput.setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Summary by Vehicle');
}

// ============================================================
// showSummaryByServiceType - Summary report by service type
// ============================================================
function showSummaryByServiceType() {
  const sheet = SS.getSheetByName(MAINTENANCE_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Maintenance log sheet not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('No records found');
    return;
  }
  
  // Aggregate by service type
  const serviceData = {};
  
  for (let i = 1; i < data.length; i++) {
    const service = data[i][2];
    const cost = (data[i][4] || 0) * 1;
    
    if (!serviceData[service]) {
      serviceData[service] = { totalCost: 0, count: 0 };
    }
    serviceData[service].totalCost += cost;
    serviceData[service].count++;
  }
  
  let html = `<div style="padding: 20px; font-family: Arial, sans-serif;">
    <h3>Maintenance Summary by Service Type</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 8px; border: 1px solid #ddd;">Service Type</th>
          <th style="padding: 8px; border: 1px solid #ddd;"># Services</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Total Cost (THB)</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Average Cost (THB)</th>
        </tr>
      </thead>
      <tbody>`;
  
  const services = Object.keys(serviceData).sort((a, b) => serviceData[b].totalCost - serviceData[a].totalCost);
  
  for (const service of services) {
    const s = serviceData[service];
    const avgCost = s.count > 0 ? (s.totalCost / s.count).toFixed(2) : 0;
    html += `<tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${service}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${s.count}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${s.totalCost.toFixed(2)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${avgCost}</td>
    </tr>`;
  }
  
  html += `</tbody></table></div>`;
  
  const htmlOutput = HtmlService.createHtmlOutput(html);
  htmlOutput.setWidth(500);
  htmlOutput.setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Summary by Service Type');
}

// ============================================================
// openWebApp - Open the web app in a new browser tab
// ============================================================
function openWebApp() {
  const url = 'https://script.google.com/macros/s/AKfycbwhqM4DZKR3wPiym5DUn5nI3CV0_H7FMvQBPb5YhLeyBnCGUk7x8i4I0Scp8SfR9jXJ1A/exec';
  const htmlService = HtmlService.createHtmlOutput(`<script>window.open('${url}', '_blank');</script>`);
  SpreadsheetApp.getUi().showModalDialog(htmlService, 'Open Web App');
}

// ============================================================
// doGet - Web app endpoint for adding records via HTTP
// ============================================================
function doGet(e) {
  const action = e.parameter.action || '';
  
  if (action === 'add') {
    return addRecordViaWeb(e);
  }
  
  // Return HTML form for manual data entry
  return ContentService.createTextOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Vehicle Maintenance - Add Record</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select, textarea { width: 100%; padding: 8px; box-sizing: border-box; margin-bottom: 10px; }
        button { background: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; width: 100%; }
        .vehicle-select { width: 100%; }
      </style>
    </head>
    <body>
      <h2>Add Maintenance Record</h2>
      <form id="maintenanceForm">
        <div class="form-group">
          <label>Vehicle</label>
          <select class="vehicle-select" id="vehicleSelectWeb">
            <option value="">-- Select Vehicle --</option>
            ${getVehicleOptionsForWeb()}
          </select>
        </div>
        <div class="form-group">
          <label>Service Type</label>
          <input type="text" id="serviceTypeWeb" required>
        </div>
        <div class="form-group">
          <label>Mileage</label>
          <input type="number" id="mileageWeb" min="0" step="1">
        </div>
        <div class="form-group">
          <label>Cost (THB)</label>
          <input type="number" id="costWeb" min="0" step="10">
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea id="notesWeb" rows="3" placeholder="Additional notes..."></textarea>
        </div>
        <button type="submit">Submit</button>
      </form>
      <script>
        document.getElementById('maintenanceForm').addEventListener('submit', function(e) {
          e.preventDefault();
          const formData = {
            action: 'add',
            vehicle: document.getElementById('vehicleSelectWeb').value,
            serviceType: document.getElementById('serviceTypeWeb').value,
            mileage: document.getElementById('mileageWeb').value,
            cost: document.getElementById('costWeb').value,
            notes: document.getElementById('notesWeb').value
          };
          
          fetch('https://script.google.com/macros/s/AKfycbwhqM4DZKR3wPiym5DUn5nI3CV0_H7FMvQBPb5YhLeyBnCGUk7x8i4I0Scp8SfR9jXJ1A/exec', {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(formData)
          }).then(response => {
            alert('Record submitted successfully!');
            window.close();
          }).catch(error => {
            alert('Error submitting record: ' + error.message);
          });
        });
        
        // Load vehicle options
        function loadVehicleOptions() {
          fetch('https://script.google.com/macros/s/AKfycbwhqM4DZKR3wPiym5DUn5nI3CV0_H7FMvQBPb5YhLeyBnCGUk7x8i4I0Scp8SfR9jXJ1A/exec?action=getVehicles')
            .then(response => response.json())
            .then(data => {
              const select = document.getElementById('vehicleSelectWeb');
              data.vehicles.forEach(vehicle => {
                const option = document.createElement('option');
                option.value = vehicle;
                option.text = vehicle;
                select.appendChild(option);
              });
            });
        }
        loadVehicleOptions();
      </script>
    </body>
    </html>
  `).setMimeType(ContentService.MimeType.HTML);
}

// ============================================================
// getVehicleOptionsForWeb - Get vehicles for web form
// ============================================================
function getVehicleOptionsForWeb() {
  const vehicleSheet = SS.getSheetByName(VEHICLE_INFO_SHEET);
  if (!vehicleSheet) return '<option value="">Vehicle sheet not found</option>';
  
  const data = vehicleSheet.getDataRange().getValues();
  let options = '';
  
  if (data.length > 1) {
    const vehicles = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        vehicles.add(data[i][0]);
      }
    }
    for (const v of vehicles) {
      options += `<option value="${v}">${v}</option>`;
    }
  }
  
  return options;
}

// ============================================================
// addRecordViaWeb - Add record via web POST
// ============================================================
function addRecordViaWeb(e) {
  const vehicle = e.parameter.vehicle;
  const serviceType = e.parameter.serviceType;
  const mileage = e.parameter.mileage;
  const cost = e.parameter.cost;
  const notes = e.parameter.notes;
  
  if (!vehicle || !serviceType) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Missing required fields'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const sheet = SS.getSheetByName(MAINTENANCE_SHEET);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: 'Maintenance sheet not found'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const now = new Date();
  const row = [
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    vehicle,
    serviceType,
    parseInt(mileage) || 0,
    parseInt(cost) || 0,
    notes || '',
    now
  ];
  
  sheet.appendRow(row);
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// getVehicles - Get list of vehicles from vehicle info sheet
// ============================================================
function getVehicles() {
  const vehicleSheet = SS.getSheetByName(VEHICLE_INFO_SHEET);
  if (!vehicleSheet) return {};
  
  const data = vehicleSheet.getDataRange().getValues();
  const vehicles = [];
  
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        vehicles.push(data[i][0]);
      }
    }
  }
  
  return { vehicles };
}