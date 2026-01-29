# Data Flow Documentation - Where Data Comes From

## Overview

The History API retrieves data from the **Patient** collection in MongoDB. This document explains which APIs save data and how the data flows.

## Data Structure

Data is stored in the `Patient` collection with the following structure:

```javascript
{
  patient_id: String,
  patient_name: String,
  patient_phone: String,
  doctor_id: String,
  doctor_name: String,
  age: String,
  address: String,
  status: String,
  visits: [  // Array of visit objects
    {
      visit_id: String,
      date: Date,
      time: String,
      visit_type: String,
      complaint: String,
      diagnosis: String,
      receipts: [
        {
          drugs: [...],
          notes: String,
          date: Date
        }
      ]
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## APIs That Save Data

### 1. **POST /api/patients** - Save Patient (Creates Patient + Visit)

**Endpoint:** `POST /api/patients`

**What it does:**
- Creates a new patient if patient doesn't exist (by phone + doctor_id)
- OR adds a new visit to existing patient
- Always creates at least one visit

**Request Body:**
```json
{
  "patient_name": "Ahmed Mohamed",
  "patient_phone": "01234567890",
  "patient_id": "pat-123",  // Optional, auto-generated if not provided
  "doctor_id": "doc-123",    // Required
  "doctor_name": "Dr. Ali",
  "age": "35",
  "address": "Cairo, Egypt",
  "visit_type": "كشف",
  "complaint": "Headache",
  "diagnosis": "Migraine",
  "status": "WAITING",
  "position": 1
}
```

**Response:**
- Creates patient with first visit, OR
- Adds new visit to existing patient

**This is the MAIN API that populates the history data!**

---

### 2. **POST /api/patients/visits** - Create Patient Visit

**Endpoint:** `POST /api/patients/visits`

**What it does:**
- Adds a new visit to an existing patient
- Requires patient_id and doctor_id

**Request Body:**
```json
{
  "patient_id": "pat-123",
  "doctor_id": "doc-123",
  "visit_type": "كشف",
  "complaint": "Headache",
  "diagnosis": "Migraine",
  "drugs": [
    {
      "drug": "Paracetamol",
      "frequency": "3 times",
      "period": "5 days",
      "timing": "After meals"
    }
  ]
}
```

---

### 3. **PUT /api/patients/:id** - Update Patient (Adds Receipt to Visit)

**Endpoint:** `PUT /api/patients/:id?doctor_id=xxx`

**What it does:**
- Updates patient information
- Adds receipts to visits
- Updates complaint/diagnosis

**Request Body:**
```json
{
  "visit_id": "visit-456",  // Optional, uses latest visit if not provided
  "complaint": "Updated complaint",
  "diagnosis": "Updated diagnosis",
  "drugs": [
    {
      "drug": "Medicine Name",
      "frequency": "2 times",
      "period": "7 days",
      "timing": "Before meals"
    }
  ],
  "notes": "Take with water"
}
```

---

## History API - How It Retrieves Data

### **GET /api/history** - Get All History

**What it does:**
- Queries the `Patient` collection
- Returns all patients with their visits
- Supports pagination, filtering, and sorting

**Query Parameters:**
- `doctor_id` - Filter by doctor (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `startDate` - Filter visits from date
- `endDate` - Filter visits to date
- `search` - Search by patient name or phone
- `sortBy` - Sort by: 'date', 'name', 'visitCount'
- `sortOrder` - 'asc' or 'desc'

**Example:**
```
GET /api/history?doctor_id=doc-123&page=1&limit=20
```

---

## Why You Might See Empty Data

### 1. **No Data in Database**
- Check if patients have been created using `POST /api/patients`
- Use debug endpoint: `GET /api/history/debug?doctor_id=xxx`

### 2. **Wrong doctor_id Filter**
- If you pass `doctor_id` but no patients exist for that doctor
- Try without `doctor_id` to see all patients: `GET /api/history`

### 3. **Date Filter Too Restrictive**
- If `startDate` or `endDate` filters out all visits
- Try without date filters first

### 4. **Database Connection Issue**
- Check MongoDB connection
- Verify `MONGO_URI` environment variable

---

## Testing Data Creation

### Step 1: Create a Patient (This creates the first visit)
```bash
POST /api/patients
{
  "patient_name": "Test Patient",
  "patient_phone": "01000000000",
  "doctor_id": "test-doctor-123",
  "visit_type": "كشف",
  "complaint": "Test complaint",
  "diagnosis": "Test diagnosis"
}
```

### Step 2: Check Debug Endpoint
```bash
GET /api/history/debug?doctor_id=test-doctor-123
```

### Step 3: Get History
```bash
GET /api/history?doctor_id=test-doctor-123
```

---

## Debug Endpoint

**GET /api/history/debug**

Use this to check:
- How many patients exist
- How many visits exist
- Sample data structure
- Query being used

**Example:**
```
GET /api/history/debug?doctor_id=doc-123
```

**Response:**
```json
{
  "success": true,
  "debug": {
    "query": { "doctor_id": "doc-123" },
    "totalPatients": 10,
    "samplePatients": 5,
    "totalVisitsInSample": 25,
    "sampleData": [...]
  }
}
```

---

## Summary

1. **Data is saved by:** `POST /api/patients` (main endpoint)
2. **Data is retrieved by:** `GET /api/history`
3. **Data structure:** Patients contain visits array
4. **If empty:** Check if patients exist using debug endpoint
5. **To populate:** Use `POST /api/patients` to create patients with visits

---

## Quick Checklist

- [ ] Is MongoDB connected? (Check server logs)
- [ ] Are there any patients in database? (Use `/api/history/debug`)
- [ ] Is `doctor_id` correct? (Try without it first)
- [ ] Have you created any patients? (Use `POST /api/patients`)
- [ ] Are date filters too restrictive? (Try without them)




