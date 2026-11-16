/**
 * Vehicle Maintenance Tracking System - OPTIMIZED for Older Drivers
 * Features simplified UI, practical functions, and easy monitoring
 * Multi-device responsive design included
 */

/* ============================================================
// CONFIGURATION
// ============================================================*/
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

/* ============================================================
// onOpen - Add simplified custom menu when spreadsheet opens
// ============================================================*/
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚗 Vehicle Tracker')
    .addItem('➕ Add Quick Record', 'showQuickAddDialog')
    .addItem('📊 Dashboard', 'showDashboard')
    .addToUi();
}

/* ============================================================
// showQuickAddDialog - Simplified add record for older drivers
// Responsive: adapts to screen size via CSS
// ============================================================*/
function showQuickAddDialog() {
  const html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        /* Responsive container */
        .responsive-container { max-width: 100%; width: 100%; }
        
        /* Base styles - mobile first */
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; padding: 0; 
          background: #fafafa; 
        }
        .dialog-content { 
          background: white; 
          border-radius: 8px; 
          padding: 20px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        h3 { 
          color: #2c3e50; 
          margin: 0 0 15px 0; 
          padding-bottom: 8px; 
          border-bottom: 1px solid #eee; 
          font-size: 16px; 
        }
        
        label { 
          display: block; 
          font-weight: bold; 
          color: #555; 
          font-size: 13px; 
          margin-bottom: 5px; 
        }
        
        input, select { 
          width: 100%; 
          padding: 10px; 
          border: 1px solid #ddd; 
          border-radius: 4px; 
          font-size: 14px; 
          box-sizing: border-box; /* Ensures padding doesn't affect width */
        }
        
        input[type="number"] { 
          padding: 8px; 
        }
        
        button { 
          width: 100%; 
          background-color: #27ae60; 
          color: white; 
          padding: 12px; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
          font-size: 14px; 
          margin-top: 10px; 
        }
        
        .error { 
          color: #e74c3c; 
          font-size: 12px; 
          margin-bottom: 10px; 
          background: #fdf2f2; 
          padding: 8px; 
          border-radius: 4px; 
          display: none; 
        }
        
        .hint { 
          font-size: 11px; 
          color: #666; 
          margin-top: 5px; 
        }
        
        /* Reduce font size on very small screens */
        @media (max-width: 320px) {
          label { font-size: 12px; }
          input, select { font-size: 13px; padding: 8px; }
          button { font-size: 13px; padding: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="responsive-container dialog-content">
        <h3>Add Maintenance Record</h3>
        
        <!-- Vehicle selection -->
        <div style="margin-bottom: 15px;">
          <label>Vehicle</label>
          <select id="vehicleSelect" style="padding: 8px; font-size: 13px;">
            <option value="">Select vehicle...</option>
            ${getVehicleOptions()}
          </select>
        </div>
        
        <!-- Service Type -->
        <div style="margin-bottom: 15px;">
          <label>Service Type</label>
          <input type="text" id="serviceType" placeholder="e.g., Oil Change">
        </div>
        
        <!-- Mileage -->
        <div style="margin-bottom: 15px;">
          <label>Mileage</label>
          <input type="number" id="mileage" min="0" step="1000">
        </div>
        
        <!-- Cost -->
        <div style="margin-bottom: 20px;">
          <label>Cost (THB)</label>
          <input type="number" id="cost" min="0" step="100">
          <div class="hint">Typical: Oil Change ~${OIL_CHANGE_COST}, Major Service ~${MAJOR_SERVICE_COST} THB</div>
        </div>
        
        <!-- Error message -->
        <div id="errorMsg" class="error" style="display: none;"></div>
        
        <div style="text-align: right; margin-top: 20px;">
          <button onclick="submitQuickRecord()">Add Record</button>
        </div>
      </div>
    </body>
    </html>
  `);
  html.setWidth(400);
  html.setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Add Record');
}

/* ============================================================
// submitQuickRecord - Quick submission with minimal fields
// ============================================================*/
function submitQuickRecord() {
  const vehicle = document.getElementById('vehicleSelect').value;
  const serviceType = document.getElementById('serviceType').value;
  const mileage = document.getElementById('mileage').value;
  const cost = document.getElementById('cost').value;
  
  // Validation - only require service type and either vehicle or cost
  if (!serviceType) {
    showError('Please enter the service type');
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

/* ============================================================
// showError - Display error message in dialog
// ============================================================*/
function showError(message) {
  const errorDiv = document.getElementById('errorMsg');
  errorDiv.style.display = 'block';
  errorDiv.innerText = message;
}

/* ============================================================
// showDashboard - Simplified dashboard for vehicle health monitoring
// Responsive: adapts layout based on screen width
// ============================================================*/
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
  
  // Calculate responsive layout - determine if we're on mobile or desktop
  const isMobile = window.innerWidth < 600;
  
  let html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        /* Responsive container */
        .responsive-container { max-width: 100%; width: 100%; }
        
        /* Base styles - mobile first */
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; padding: 0; 
          background: #fafafa; 
          color: #333;
        }
        .dialog-content { 
          background: white; 
          border-radius: 8px; 
          padding: 20px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        h3 { 
          color: #2c3e50; 
          margin: 0 0 20px 0; 
          padding-bottom: 10px; 
          border-bottom: 1px solid #eee; 
          font-size: 18px; 
        }
        
        .stat-card { 
          background: white; 
          padding: 15px; 
          border-radius: 8px; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          text-align: center; 
          margin-bottom: 15px;
        }
        
        .stat-label { 
          font-size: 12px; 
          color: #888; 
          margin-bottom: 5px; 
          display: block;
        }
        
        .stat-value { 
          font-size: 20px; 
          font-weight: bold; 
          color: #2c3e50; 
        }
        
        .row { 
          margin: 10px 0; 
        }
        
        .row:after { content: ""; display: table; clear: both; }
        
        .col { 
          float: left; 
          width: 50%; 
          padding: 0 10px;
        }
        
        @media (max-width: 500px) {
          .col { width: 100%; }
        }
        
        .alert-card { 
          background: #faebc1; 
          border: 1px solid #f39c12; 
          padding: 15px; 
          border-radius: 8px; 
          margin: 20px 0;
        }
        
        .alert-title { 
          font-size: 13px; 
          font-weight: bold; 
          color: #e67e22; 
          margin-bottom: 10px;
        }
        
        .alert-item { 
          font-size: 12px; 
          margin: 8px 0; 
          padding: 8px; 
          background: #fff; 
          border-radius: 4px;
        }
        
        .vehicle-list { 
          margin: 20px 0; 
        }
        
        .vehicle-item { 
          font-size: 12px; 
          margin: 4px 0; 
        }
        
        .tip-box { 
          background: #e8f6ff; 
          padding: 15px; 
          border-radius: 8px; 
          font-size: 12px; 
          color: #555; 
          margin: 20px 0;
        }
        
        /* Reduce padding on very small screens */
        @media (max-width: 400px) {
          .dialog-content { padding: 15px; }
          .stat-value { font-size: 16px; }
          .alert-item { font-size: 11px; padding: 6px; }
        }
      </style>
    </head>
    <body>
      <div class="responsive-container dialog-content">
        <h3>📊 Vehicle Health Dashboard</h3>
        
        <!-- Health Score -->
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 14px; color: #555;">Vehicle Health Score</span>
            <span style="color: ${healthColor}; font-weight: bold; font-size: ${isMobile ? '20px' : '24px'}">${healthScore}/100</span>
          </div>
          <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
            <span style="font-size: 12px; color: #888;">Based on ${totalRecords} records across ${vehiclesCount.size} vehicle(s)</span>
          </div>
        </div>
        
        <!-- Summary Stats -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div class="stat-card">
            <div class="stat-label">Total Spent</div>
            <div class="stat-value">${totalCost.toLocaleString()} THB</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Records</div>
            <div class="stat-value">${totalRecords}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Vehicle(s)</div>
            <div class="stat-value">${vehiclesCount.size}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Last Service</div>
            <div class="stat-value">${lastServiceDate ? Utilities.formatDate(lastServiceDate, Session.getScriptTimeZone(), 'MMM d, yyyy') : 'No records'}</div>
          </div>
        </div>
        
        ${overdueItems.length > 0 ? `
        <div class="alert-card">
          <div class="alert-title">⚠️ Maintenance Alerts (${overdueItems.length})</div>
          ${overdueItems.map(item => `
            <div class="alert-item">
              ${item.vehicle}: Next service due at ${item.nextDue.toLocaleString()} miles (currently at ${item.currentMileage.toLocaleString()})
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${vehicleNames.length > 0 ? `
        <div style="margin: 20px 0;">
          <div style="font-size: 13px; color: #555; margin-bottom: 10px;">Your Vehicles</div>
          ${vehicleNames.map(v => `<div style="font-size: 12px; margin: 4px 0;">• ${v}</div>`).join('')}
          ${vehicleDetails ? `<div style="font-size: 11px; color: #888; margin-top: 5px;">${vehicleDetails}</div>` : ''}
        </div>
        ` : ''}
        
        <div class="tip-box">
          <strong>Tip:</strong> Add records regularly to keep your vehicle's health score accurate. 
          Consider oil changes every ${INTERVAL_MILEAGE} miles or every ${INTERVAL_MONTHS} months.
        </div>
      </div>
    </body>
    </html>`;
  
  const htmlOutput = HtmlService.createHtmlOutput(html);
  htmlOutput.setWidth(isMobile ? 350 : 650);
  htmlOutput.setHeight(isMobile ? 500 : 550);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Vehicle Dashboard');
}

/* ============================================================
// Add helper functions from original code
// ============================================================*/

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
    '',
    now
  ];
  
  sheet.appendRow(row);
  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}

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