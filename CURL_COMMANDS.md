# CURL Commands for Testing Patient History API

## Base URL
Replace `YOUR_API_URL` with your actual API URL:
- Local: `http://localhost:6000`
- Heroku: `https://your-app-name.herokuapp.com`

---

## 1. Debug Endpoint - Check What Data Exists

### Check all patients
```bash
curl -X GET "http://localhost:6000/api/history/debug" \
  -H "Content-Type: application/json"
```

### Check patients for specific doctor
```bash
curl -X GET "http://localhost:6000/api/history/debug?doctor_id=doc-123" \
  -H "Content-Type: application/json"
```

---

## 2. Create Patient (This Adds Data to Database)

### Create new patient with visit
```bash
curl -X POST "http://localhost:6000/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Ahmed Mohamed",
    "patient_phone": "01234567890",
    "doctor_id": "doc-123",
    "doctor_name": "Dr. Ali",
    "age": "35",
    "address": "Cairo, Egypt",
    "visit_type": "كشف",
    "complaint": "Headache and fever",
    "diagnosis": "Common cold",
    "status": "WAITING"
  }'
```

### Create another patient
```bash
curl -X POST "http://localhost:6000/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Sara Ali",
    "patient_phone": "01123456789",
    "doctor_id": "doc-123",
    "doctor_name": "Dr. Ali",
    "age": "28",
    "address": "Alexandria, Egypt",
    "visit_type": "متابعة",
    "complaint": "Follow up visit",
    "diagnosis": "Recovery in progress"
  }'
```

---

## 3. Get All History

### Get all history (no filters)
```bash
curl -X GET "http://localhost:6000/api/history" \
  -H "Content-Type: application/json"
```

### Get history with pagination
```bash
curl -X GET "http://localhost:6000/api/history?page=1&limit=10" \
  -H "Content-Type: application/json"
```

### Get history for specific doctor
```bash
curl -X GET "http://localhost:6000/api/history?doctor_id=doc-123&page=1&limit=20" \
  -H "Content-Type: application/json"
```

### Get history with search
```bash
curl -X GET "http://localhost:6000/api/history?search=Ahmed&page=1&limit=20" \
  -H "Content-Type: application/json"
```

### Get history with date filter
```bash
curl -X GET "http://localhost:6000/api/history?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Content-Type: application/json"
```

### Get history sorted by name
```bash
curl -X GET "http://localhost:6000/api/history?sortBy=name&sortOrder=asc" \
  -H "Content-Type: application/json"
```

### Get history with all filters
```bash
curl -X GET "http://localhost:6000/api/history?doctor_id=doc-123&page=1&limit=20&sortBy=date&sortOrder=desc&search=Ahmed" \
  -H "Content-Type: application/json"
```

---

## 4. Get History Summary

### Get summary for all doctors
```bash
curl -X GET "http://localhost:6000/api/history/summary" \
  -H "Content-Type: application/json"
```

### Get summary for specific doctor
```bash
curl -X GET "http://localhost:6000/api/history/summary?doctor_id=doc-123" \
  -H "Content-Type: application/json"
```

### Get summary with date range
```bash
curl -X GET "http://localhost:6000/api/history/summary?doctor_id=doc-123&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Content-Type: application/json"
```

---

## 5. Get All Visits (Flat List)

### Get all visits
```bash
curl -X GET "http://localhost:6000/api/history/visits" \
  -H "Content-Type: application/json"
```

### Get visits with pagination
```bash
curl -X GET "http://localhost:6000/api/history/visits?page=1&limit=20" \
  -H "Content-Type: application/json"
```

### Get visits for specific doctor
```bash
curl -X GET "http://localhost:6000/api/history/visits?doctor_id=doc-123&page=1&limit=20" \
  -H "Content-Type: application/json"
```

### Get visits by type
```bash
curl -X GET "http://localhost:6000/api/history/visits?visit_type=كشف&page=1&limit=20" \
  -H "Content-Type: application/json"
```

### Get visits with date filter
```bash
curl -X GET "http://localhost:6000/api/history/visits?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Content-Type: application/json"
```

---

## 6. Add Visit to Existing Patient

### Create a new visit for existing patient
```bash
curl -X POST "http://localhost:6000/api/patients/visits" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "pat-123",
    "doctor_id": "doc-123",
    "visit_type": "كشف",
    "complaint": "New complaint",
    "diagnosis": "New diagnosis",
    "drugs": [
      {
        "drug": "Paracetamol",
        "frequency": "3 times daily",
        "period": "5 days",
        "timing": "After meals"
      }
    ]
  }'
```

---

## 7. Update Patient (Add Receipt)

### Update patient and add receipt
```bash
curl -X PUT "http://localhost:6000/api/patients/PATIENT_MONGODB_ID?doctor_id=doc-123" \
  -H "Content-Type: application/json" \
  -d '{
    "visit_id": "visit-456",
    "complaint": "Updated complaint",
    "diagnosis": "Updated diagnosis",
    "drugs": [
      {
        "drug": "Ibuprofen",
        "frequency": "2 times daily",
        "period": "7 days",
        "timing": "Before meals"
      }
    ],
    "notes": "Take with plenty of water"
  }'
```

---

## 8. Get Patient by ID or Phone

### Get patient by ID
```bash
curl -X GET "http://localhost:6000/api/patients/pat-123/doctor/doc-123" \
  -H "Content-Type: application/json"
```

### Get patient by phone
```bash
curl -X GET "http://localhost:6000/api/patients/01234567890/doctor/doc-123" \
  -H "Content-Type: application/json"
```

---

## 9. Get Patient Visit History

### Get visit history for a patient
```bash
curl -X GET "http://localhost:6000/api/patients/visits?patient_id=pat-123&doctor_id=doc-123&page=1&limit=10" \
  -H "Content-Type: application/json"
```

---

## Quick Test Sequence

### Step 1: Check if data exists
```bash
curl -X GET "http://localhost:6000/api/history/debug"
```

### Step 2: Create test patient (if no data)
```bash
curl -X POST "http://localhost:6000/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_name": "Test Patient",
    "patient_phone": "01000000000",
    "doctor_id": "test-doctor",
    "visit_type": "كشف",
    "complaint": "Test",
    "diagnosis": "Test"
  }'
```

### Step 3: Get history
```bash
curl -X GET "http://localhost:6000/api/history?doctor_id=test-doctor"
```

### Step 4: Get summary
```bash
curl -X GET "http://localhost:6000/api/history/summary?doctor_id=test-doctor"
```

---

## For Heroku Deployment

Replace `localhost:6000` with your Heroku URL:

```bash
# Example for Heroku
curl -X GET "https://your-app-name.herokuapp.com/api/history/debug"
```

---

## Pretty Print JSON (Optional)

Add `| python -m json.tool` or `| jq` to format JSON:

```bash
curl -X GET "http://localhost:6000/api/history" | python -m json.tool
```

Or with jq:
```bash
curl -X GET "http://localhost:6000/api/history" | jq
```

---

## Windows PowerShell Alternative

If curl doesn't work, use Invoke-WebRequest:

```powershell
# GET request
Invoke-WebRequest -Uri "http://localhost:6000/api/history/debug" -Method GET | Select-Object -ExpandProperty Content

# POST request
$body = @{
    patient_name = "Test Patient"
    patient_phone = "01000000000"
    doctor_id = "test-doctor"
    visit_type = "كشف"
    complaint = "Test"
    diagnosis = "Test"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:6000/api/patients" -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

---

## Troubleshooting

### If you get empty data:
1. First check debug endpoint: `GET /api/history/debug`
2. Create a patient: `POST /api/patients`
3. Then get history: `GET /api/history`

### If connection refused:
- Check if server is running: `node server.js`
- Check if port is correct (default: 6000)

### If authentication error:
- The authentication middleware is currently a placeholder
- It should allow all requests for now




