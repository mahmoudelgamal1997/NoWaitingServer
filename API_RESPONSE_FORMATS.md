# API Response Formats - Web App vs Mobile

## Web App API Response Formats

### 1. GET /api/patients/doctor/:doctor_id
**Returns:** Direct array of patients
```json
[
  {
    "_id": "...",
    "patient_id": "pat-123",
    "patient_name": "Ahmed Mohamed",
    "patient_phone": "01234567890",
    "doctor_id": "doc-123",
    "visits": [...],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### 2. GET /api/patients
**Returns:** Direct array of all patients
```json
[
  {
    "_id": "...",
    "patient_id": "pat-123",
    "patient_name": "Ahmed Mohamed",
    ...
  }
]
```

### 3. GET /api/patients/visits?patient_id=xxx&doctor_id=xxx
**Returns:** Structured response with pagination
```json
{
  "message": "Patient visit history retrieved successfully",
  "patient_info": {
    "name": "Ahmed Mohamed",
    "phone": "01234567890",
    "age": "35",
    "address": "Cairo, Egypt"
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalVisits": 50
  },
  "visits": [...]
}
```

### 4. GET /api/patients/:identifier/doctor/:doctor_id
**Returns:** Patient object with message
```json
{
  "message": "Patient found",
  "patient": {
    "_id": "...",
    "patient_id": "pat-123",
    "patient_name": "Ahmed Mohamed",
    "visits": [...]
  }
}
```

---

## Mobile History API Response Formats

### 1. GET /api/history (Mobile - With Pagination)
**Returns:** Structured response with pagination
```json
{
  "message": "History retrieved successfully",
  "data": [
    {
      "patient_id": "pat-123",
      "patient_name": "Ahmed Mohamed",
      "patient_phone": "01234567890",
      "age": "35",
      "address": "Cairo, Egypt",
      "doctor_id": "doc-123",
      "doctor_name": "Dr. Ali",
      "status": "WAITING",
      "total_visits": 5,
      "last_visit_date": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-01T08:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "visits": [...]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  }
}
```

### 2. GET /api/history/web (Web App Compatible Format)
**Returns:** Direct array (same as getPatientsByDoctor)
```json
[
  {
    "_id": "...",
    "patient_id": "pat-123",
    "patient_name": "Ahmed Mohamed",
    "patient_phone": "01234567890",
    "doctor_id": "doc-123",
    "visits": [...],
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### 3. GET /api/history/summary
**Returns:** Summary statistics
```json
{
  "message": "History summary retrieved successfully",
  "summary": {
    "totalPatients": 150,
    "totalVisits": 450,
    "totalReceipts": 320,
    "averageVisitsPerPatient": "3.00",
    "visitsByType": {
      "كشف": 300,
      "متابعة": 100
    },
    "recentVisits": [...]
  }
}
```

### 4. GET /api/history/visits
**Returns:** Flat list of all visits
```json
{
  "message": "All visits retrieved successfully",
  "visits": [
    {
      "visit_id": "visit-456",
      "date": "2024-01-15T10:30:00.000Z",
      "visit_type": "كشف",
      "complaint": "Headache",
      "diagnosis": "Migraine",
      "patient": {
        "patient_id": "pat-123",
        "patient_name": "Ahmed Mohamed",
        "patient_phone": "01234567890"
      },
      "doctor_id": "doc-123"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 25,
    "totalItems": 500,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Key Differences

### Web App Format:
- **Simple arrays** for list endpoints
- **Direct patient objects** with all fields
- **Minimal structure** - just data

### Mobile Format:
- **Structured responses** with message and data
- **Pagination metadata** included
- **Processed/flattened data** for easier mobile consumption
- **Additional computed fields** (total_visits, last_visit_date, etc.)

---

## Which Endpoint to Use?

### For Web App Compatibility:
- Use: `GET /api/history/web?doctor_id=xxx`
- Returns: Same format as `GET /api/patients/doctor/:doctor_id`

### For Mobile App:
- Use: `GET /api/history?doctor_id=xxx&page=1&limit=20`
- Returns: Structured format with pagination

### For Summary/Statistics:
- Use: `GET /api/history/summary?doctor_id=xxx`
- Returns: Statistics and summary data

### For Flat Visit List:
- Use: `GET /api/history/visits?doctor_id=xxx&page=1&limit=20`
- Returns: All visits across all patients

---

## Migration Guide

If you're migrating from web app endpoints to mobile history API:

**Old (Web App):**
```javascript
GET /api/patients/doctor/doc-123
// Returns: Array of patients
```

**New (Mobile - Web Compatible):**
```javascript
GET /api/history/web?doctor_id=doc-123
// Returns: Same array format
```

**New (Mobile - With Pagination):**
```javascript
GET /api/history?doctor_id=doc-123&page=1&limit=20
// Returns: Structured response with pagination
```




