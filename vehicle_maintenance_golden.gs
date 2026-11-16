/**
 * Vehicle Maintenance Tracking System - OPTIMIZED for Older Drivers
 * Features simplified UI, practical functions, and easy monitoring
 */

// ============================================================
// CONFIGURATION
// ============================================================
const SS = SpreadsheetApp.getActiveSpreadsheet();
const MAINTENANCE_SHEET = 'Maintenance_Log';
const VEHICLE_INFO_SHEET = 'VehicleInfo';

// Maintenance interval constants (in months or miles)
const INTERVAL_MILEAGE = 5000;      // Check oil every 5,000 miles
const INTERVAL_MONTHS = 6;          // Full service every 6 months
const OIL_CHANGE_COST = 3000;       // Typical oil change in THB
const MAJOR_SERVICE_COST = 8000;    // Typical major service in THB

// Column indices for Maintenance_Log sheet (1-indexed)
const COL_DATE = 1;
const COL_VEHICLE = 2;
const COL_SERVICE_TYPE = 3;
const COL_MILEAGE = 4;
const COL_COST = 5;
const COL_NOTES = 6;
const COL_CREATED = 7;

// ============================================================
// onOpen - Add simplified custom menu when spreadsheet opens
// ============================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚗 Vehicle Tracker')
    .addItem('➕ Add Quick Record', 'showQuickAddDialog')
    .addItem('📊 Dashboard', 'showDashboard')
    .addToUi();
}

// ============================================================
// showQuickAddDialog - Simplified add record for older drivers
// ============================================================
function showQuickAddDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 350px;">
      <h3 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        Add Maintenance Record
      </h3>
      
      <!-- Vehicle selection - simplified -->
      <div style="margin-bottom: 15px;">
        <label style="display: block; font-weight: bold; color: #555; font-size: 13px; margin-bottom: 5px;">
          Vehicle
        </label>
        <select id="vehicleSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
          <option value="">Select vehicle...</</option>
          ${getVehicleOptions()}
        </select>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; font-weight: bold; color: #555; font-size: 13px; margin-bottom: 5px;">
          Service Type
        </label>
        <input type="text" id="serviceType" placeholder="e.g., Oil Change" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; font-weight: bold; color: #555; font-size: 13px; margin-bottom: 5px;">
          Mileage
        </label>
        <input type="number" id="mileage" min="0" step="1000" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-weight: bold; color: #555; font-size: 13px; margin-bottom: 5px;">
          Cost (THB)
        </label>
        <input type="number" id="cost" min="0" step="100" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
        <div style="margin-top: 5px; font-size: 11px; color: #666;">
          Typical: Oil Change ~${OIL_CHANGE_COST}, Major Service ~${MAJOR_SERVICE_COST} THB
        </div>
      </div>
      
      <div style="text-align: right; margin-top: 20px;">
        <button onclick="submitQuickRecord()" 
                style="background-color: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; width: 100%;">
          Add Record
        </button>
      </div>
    </div>
  `);
  html.setWidth(400);
  html.setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add Record');
}

// ============================================================
// submitQuickRecord - Quick submission with minimal fields
// ============================================================
function submitQuickRecord() {
  const vehicle = document.getElementById('vehicleSelect').value;
  const serviceType = document.getElementById('serviceType').value;
  const mileage = document.getElementById('mileage').value;
  const cost = document.getElementById('cost').value;
  
  // Validation - only require service type and either vehicle or cost
  if (!serviceType) {
    SpreadsheetApp.getUi().alert('Please enter the service type');
    return;
  }
  
  const sheet = SS.getSheetByName(MAINTENANCE_SHEET);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Maintenance log sheet not found');
    return;
  }
  
  // Use current vehicle or last used - simplify: if no vehicle selected, mark as "Unknown"
  const vehicleName = vehicle || 'Unknown';
  
  const now = new Date();
  const formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMM d, yyyy');
  const row = [
    formattedDate,
    vehicleName,
    serviceType,
    parseInt(mileage) || 0,
    parseInt(cost) || 0,
    '',
    now
  ];
  
  sheet.appendRow(row);
  SpreadsheetApp.getUi().alert('Record added successfully!');
  
  // Auto-close after short delay
  setTimeout(() => { google.script.host.close(); }, 1000);
}

// ============================================================
// showDashboard - Simplified dashboard for vehicle health monitoring
// ============================================================
function showDashboard() {
  const sheet = SS.getSheetByName(MAINTENANCE_SHEET);
  const vehicleSheet = SS.getSheetByName(VEHICLE_INFO_SHEET);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Maintenance log sheet not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  // Calculate statistics
  let totalRecords = 0;
  let totalCost = 0;
  let vehiclesCount = new Set();
  let lastServiceDate = null;
  let lastServiceCost = 0;
  let milesSinceLastService = 0;
  let overdueItems = [];
  
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const recordDate = new Date(row[0]);
      const serviceType = row[2] || '';
      const cost = (row[4] || 0) * 1;
      const mileage = row[3] || 0;
      const vehicle = row[1] || 'Unknown';
      
      totalRecords++;
      totalCost += cost;
      vehiclesCount.add(vehicle);
      
      // Track last service
      if (!lastServiceDate || recordDate > lastServiceDate) {
        lastServiceDate = recordDate;
        lastServiceCost = cost;
      }
      
      // Track miles since last service
      if (mileage > milesSinceLastService) {
        milesSinceLastService = mileage;
      }
      
      // Check for overdue items
      if (serviceType.toLowerCase().includes('oil') || serviceType.toLowerCase().includes('service')) {
        // Simple overdue check based on mileage interval
        if (mileage > 0 && mileage % INTERVAL_MILEAGE !== 0) {
          const lastOilMileage = Math.floor(mileage / INTERVAL_MILEAGE) * INTERVAL_MILEAGE;
          overdueItems.push({
            vehicle,
            type: serviceType,
            currentMileage: mileage,
            lastOilMileage: lastOilMileage,
            nextDue: lastOilMileage + INTERVAL_MILEAGE
          });
        }
      }
    }
  }
  
  // Get vehicle info for summaries
  let vehicleNames = [];
  let vehicleDetails = '';
  if (vehicleSheet) {
    const vData = vehicleSheet.getDataRange().getValues();
    if (vData.length > 1) {
      for (let i = 1; i < vData.length; i++) {
        if (vData[i][0]) {
          vehicleNames.push(vData[i][0]);
          // Build details string for first vehicle
          if (i === 1 && vData[i].length > 3) {
            vehicleDetails = `• ${vData[i][0]}: Model ${vData[i][1] || 'N/A'}, Year ${vData[i][2] || 'N/A'}`;
          }
        }
      }
    }
  }
  
  // Calculate health score (0-100)
  let healthScore = 100;
  if (overdueItems.length > 0) healthScore -= 15 * overdueItems.length;
  if (totalRecords === 0) healthScore = 0;
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  // Determine health color
  let healthColor = '#27ae60';
  if (healthScore < 40) healthColor = '#e74c3c';
  else if (healthScore < 70) healthColor = '#f39c12';
  
  let html = `<div style="padding: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px;">
    <h3 style="color: #2c3e50; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
      📊 Vehicle Health Dashboard
    </h3>
    
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 14px; color: #555;">Vehicle Health Score</span>
        <span style="color: ${healthColor}; font-weight: bold; font-size: 24px;">${healthScore}/100</span>
      </div>
      <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
        <span style="font-size: 12px; color: #888;">Based on ${totalRecords} records across ${vehiclesCount.size} vehicle(s)</span>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
      <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #888; margin-bottom: 5px;">Total Spent</div>
        <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${totalCost.toLocaleString()} THB</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #888; margin-bottom: 5;">Records</div>
        <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${totalRecords}</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #888; margin-bottom: 5;">Vehicle(s)</div>
        <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${vehiclesCount.size}</div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 12px; color: #888; margin-bottom: 5;">Last Service</div>
        <div style="font-size: 14px; color: #555;">${lastServiceDate ? Utilities.formatDate(lastServiceDate, Session.getScriptTimeZone(), 'MMM d, yyyy') : 'No records'}</div>
      </div>
    </div>
    
    ${overdueItems.length > 0 ? `
    <div style="background: #faebc1; border: 1px solid #f39c12; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: bold; color: #e67e22; margin-bottom: 10px;">
        ⚠️ Maintenance Alerts (${overdueItems.length})
      </div>
      ${overdueItems.map(item => `
        <div style="font-size: 12px; margin: 8px 0; padding: 8px; background: #fff; border-radius: 4px;">
          ${item.vehicle}: Next service due at ${item.nextDue.toLocaleString()} miles (currently at ${item.currentMileage.toLocaleString()})
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${vehicleNames.length > 0 ? `
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
      <div style="font-size: 13px; color: #555; margin-bottom: 10px;">Your Vehicles</div>
      ${vehicleNames.map(v => `<div style="font-size: 12px; margin: 4px 0;">• ${v}</div>`).join('')}
      ${vehicleDetails ? `<div style="font-size: 11px; color: #888; margin-top: 5px;">${vehicleDetails}</div>` : ''}
    </div>
    ` : ''}
    
    <div style="margin-top: 20px; padding: 15px; background: #e8f6ff; border-radius: 8px; font-size: 12px; color: #555;">
      <strong>Tip:</strong> Add records regularly to keep your vehicle's health score accurate. 
      Consider oil changes every ${INTERVAL_MILEAGE} miles or every ${INTERVAL_MONTHS} months.
    </div>
  </div>`;
  
  const htmlOutput = HtmlService.createHtmlOutput(html);
  htmlOutput.setWidth(650);
  htmlOutput.setHeight(550);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Vehicle Dashboard');
}

// ============================================================
// Add helper functions from original code (getVehicleOptions, etc.)
// ============================================================

function getVehicleOptions() {
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

function getVehicleOptionsForWeb() {
  return getVehicleOptions(); // Same logic
}

function addRecordViaWeb(e) {
  // Same as before but simplified
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

// Keep other utility functions...
function openWebApp() {
  const url = 'https://script.google.com/macros/s/AKfycbwhqM4DZKR3wPiym5DUn5nI3CV0_H7FMvQBPb5YhLeyBnCGUk7x8i4I0Scp8SfR9jXJ1A/exec';
  const htmlService = HtmlService.createHtmlOutput(`<script>window.open('${url}', '_blank');</script>`);
  SpreadsheetApp.getUi().showModalDialog(htmlService, 'Open Web App');
}

function doGet(e) {
  const action = e.parameter.action || '';
  
  if (action === 'add') {
    return addRecordViaWeb(e);
  }
  
  return ContentService.createTextOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Vehicle Maintenance - Quick Add</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #333; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        button { background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-size: 14px; }
        .vehicle-select { width: 100%; }
        .highlight { background: #e8f6ff; padding: 10px; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h2 style="color: #2c3e50; text-align: center;">Add Maintenance Record</h2>
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
          <input type="text" id="serviceTypeWeb" required placeholder="e.g., Oil Change">
        </div>
        <div class="form-group">
          <label>Mileage</label>
          <input type="number" id="mileageWeb" min="0" step="1000">
        </div>
        <div class="form-group">
          <label>Cost (THB)</label>
          <input type="number" id="costWeb" min="0" step="100">
        </div>
        <button type="submit">Add Record</button>
      </form>
      <script>
        document.getElementById('maintenanceForm').addEventListener('submit', function(e) {
          e.preventDefault();
          const formData = {
            action: 'add',
            vehicle: document.getElementById('vehicleSelectWeb').value,
            serviceType: document.getElementById('serviceTypeWeb').value,
            mileage: document.getElementById('mileageWeb').value,
            cost: document.getElementById('costWeb').value
          };
          
          fetch('https://script.google.com/macros/s/AKfycbwhqM4DZKR3wPiym5DUn5nI3CV0_H7FMvQBPb5YhLeyBnCGUk7x8i4I0Scp8SfR9jXJ1A/exec', {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(formData)
          }).then(response => {
            alert('Record submitted successfully!');
            window.close();
          }).catch(error => {
            alert('Error: ' + error.message);
          });
        });
        
        // Quick load vehicles
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
      </script>
    </body>
    </html>
  `).setMimeType(ContentService.MimeType.HTML);
}

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