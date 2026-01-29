# Mobile User API Documentation

This document describes the API endpoints designed for mobile app users (patients) to access their own data across all doctors.

## Base URL

```
Production: https://your-api-domain.com/api
Development: http://localhost:6000/api
```

## Authentication

All endpoints require authentication. Include your authentication token in the request headers:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Note:** The authentication middleware is currently a placeholder. Implement your actual authentication logic in the routes.

---

## Endpoints

### 1. Get Patient Profile

Get patient profile information aggregated across all doctors.

**Endpoint:** `GET /api/mobile/profile`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patient_id` | string | Yes* | Patient ID (*required if phone not provided) |
| `phone` | string | Yes* | Patient phone number (*required if patient_id not provided) |

**Example Request:**

```http
GET /api/mobile/profile?patient_id=pat123
Authorization: Bearer YOUR_TOKEN
```

or

```http
GET /api/mobile/profile?phone=01234567890
Authorization: Bearer YOUR_TOKEN
```

**Example Response:**

```json
{
  "success": true,
  "message": "Patient profile retrieved successfully",
  "data": {
    "patient_id": "pat123",
    "patient_name": "Ahmed Mohamed",
    "patient_phone": "01234567890",
    "age": "35",
    "address": "Cairo, Egypt",
    "fcmToken": "",
    "doctors": [
      {
        "doctor_id": "doc123",
        "doctor_name": "Dr. Ali"
      },
      {
        "doctor_id": "doc456",
        "doctor_name": "Dr. Sara"
      }
    ],
    "total_visits": 10,
    "total_receipts": 15,
    "created_at": "2024-01-01T08:00:00.000Z",
    "last_visit_date": "2024-01-20T14:30:00.000Z"
  }
}
```

---

### 2. Get Patient Visits

Get all visits for a patient across all doctors with pagination support.

**Endpoint:** `GET /api/mobile/visits`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `patient_id` | string | Yes* | - | Patient ID (*required if phone not provided) |
| `phone` | string | Yes* | - | Patient phone number (*required if patient_id not provided) |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page (max recommended: 50) |
| `startDate` | string | No | - | Filter visits from this date (ISO format: YYYY-MM-DD) |
| `endDate` | string | No | - | Filter visits to this date (ISO format: YYYY-MM-DD) |
| `doctor_id` | string | No | - | Filter by specific doctor ID |
| `visit_type` | string | No | - | Filter by visit type (e.g., "كشف") |
| `sortOrder` | string | No | "desc" | Sort order: "asc" or "desc" |

**Example Request:**

```http
GET /api/mobile/visits?patient_id=pat123&page=1&limit=20&sortOrder=desc
Authorization: Bearer YOUR_TOKEN
```

**Example Response:**

```json
{
  "success": true,
  "message": "Patient visits retrieved successfully",
  "data": [
    {
      "visit_id": "visit-456",
      "date": "2024-01-20T14:30:00.000Z",
      "time": "14:30",
      "visit_type": "كشف",
      "complaint": "Headache",
      "diagnosis": "Migraine",
      "receipts": [
        {
          "drugs": [
            {
              "drug": "Paracetamol",
              "frequency": "3 times",
              "period": "5 days",
              "timing": "After meals"
            }
          ],
          "notes": "Take with water",
          "date": "2024-01-20T14:30:00.000Z",
          "drugModel": "new"
        }
      ],
      "receipts_count": 1,
      "doctor_id": "doc123",
      "doctor_name": "Dr. Ali"
    },
    {
      "visit_id": "visit-789",
      "date": "2024-01-15T10:00:00.000Z",
      "time": "10:00",
      "visit_type": "متابعة",
      "complaint": "Follow-up",
      "diagnosis": "Stable condition",
      "receipts": [],
      "receipts_count": 0,
      "doctor_id": "doc456",
      "doctor_name": "Dr. Sara"
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
  },
  "filters": {
    "patient_id": "pat123",
    "phone": null,
    "startDate": null,
    "endDate": null,
    "doctor_id": null,
    "visit_type": null,
    "sortOrder": "desc"
  }
}
```

---

### 3. Get Patient Receipts

Get all receipts for a patient across all visits and doctors with pagination support.

**Endpoint:** `GET /api/mobile/receipts`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `patient_id` | string | Yes* | - | Patient ID (*required if phone not provided) |
| `phone` | string | Yes* | - | Patient phone number (*required if patient_id not provided) |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |
| `startDate` | string | No | - | Filter receipts from this date (ISO format) |
| `endDate` | string | No | - | Filter receipts to this date (ISO format) |
| `doctor_id` | string | No | - | Filter by specific doctor ID |
| `visit_id` | string | No | - | Filter by specific visit ID |
| `sortOrder` | string | No | "desc" | Sort order: "asc" or "desc" |

**Example Request:**

```http
GET /api/mobile/receipts?patient_id=pat123&page=1&limit=20
Authorization: Bearer YOUR_TOKEN
```

**Example Response:**

```json
{
  "success": true,
  "message": "Patient receipts retrieved successfully",
  "data": [
    {
      "receipt_id": "receipt-123",
      "visit_id": "visit-456",
      "visit_date": "2024-01-20T14:30:00.000Z",
      "visit_time": "14:30",
      "visit_type": "كشف",
      "complaint": "Headache",
      "diagnosis": "Migraine",
      "drugs": [
        {
          "drug": "Paracetamol",
          "frequency": "3 times",
          "period": "5 days",
          "timing": "After meals"
        },
        {
          "drug": "Ibuprofen",
          "frequency": "2 times",
          "period": "3 days",
          "timing": "With meals"
        }
      ],
      "notes": "Take with water",
      "date": "2024-01-20T14:30:00.000Z",
      "drugModel": "new",
      "doctor_id": "doc123",
      "doctor_name": "Dr. Ali"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 50,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "patient_id": "pat123",
    "phone": null,
    "startDate": null,
    "endDate": null,
    "doctor_id": null,
    "visit_id": null,
    "sortOrder": "desc"
  }
}
```

---

### 4. Get Patient Visit Dates

Get a summary of all visit dates grouped by doctor.

**Endpoint:** `GET /api/mobile/visit-dates`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patient_id` | string | Yes* | Patient ID (*required if phone not provided) |
| `phone` | string | Yes* | Patient phone number (*required if patient_id not provided) |
| `doctor_id` | string | No | Filter by specific doctor ID |
| `startDate` | string | No | Filter from date (ISO format) |
| `endDate` | string | No | Filter to date (ISO format) |

**Example Request:**

```http
GET /api/mobile/visit-dates?patient_id=pat123
Authorization: Bearer YOUR_TOKEN
```

**Example Response:**

```json
{
  "success": true,
  "message": "Patient visit dates retrieved successfully",
  "data": {
    "visits_by_doctor": [
      {
        "doctor_id": "doc123",
        "doctor_name": "Dr. Ali",
        "visits": [
          {
            "visit_id": "visit-456",
            "date": "2024-01-20T14:30:00.000Z",
            "time": "14:30",
            "visit_type": "كشف"
          },
          {
            "visit_id": "visit-123",
            "date": "2024-01-10T10:00:00.000Z",
            "time": "10:00",
            "visit_type": "متابعة"
          }
        ]
      },
      {
        "doctor_id": "doc456",
        "doctor_name": "Dr. Sara",
        "visits": [
          {
            "visit_id": "visit-789",
            "date": "2024-01-15T11:00:00.000Z",
            "time": "11:00",
            "visit_type": "كشف"
          }
        ]
      }
    ],
    "all_visit_dates": [
      {
        "visit_id": "visit-456",
        "date": "2024-01-20T14:30:00.000Z",
        "time": "14:30",
        "visit_type": "كشف",
        "doctor_id": "doc123",
        "doctor_name": "Dr. Ali"
      },
      {
        "visit_id": "visit-789",
        "date": "2024-01-15T11:00:00.000Z",
        "time": "11:00",
        "visit_type": "كشف",
        "doctor_id": "doc456",
        "doctor_name": "Dr. Sara"
      },
      {
        "visit_id": "visit-123",
        "date": "2024-01-10T10:00:00.000Z",
        "time": "10:00",
        "visit_type": "متابعة",
        "doctor_id": "doc123",
        "doctor_name": "Dr. Ali"
      }
    ],
    "total_visits": 3,
    "unique_doctors": 2
  },
  "filters": {
    "patient_id": "pat123",
    "phone": null,
    "doctor_id": null,
    "startDate": null,
    "endDate": null
  }
}
```

---

## Mobile App Integration Examples

### React Native Example

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:6000/api';

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get patient profile
export const getPatientProfile = async (patientId = null, phone = null) => {
  try {
    const params = {};
    if (patientId) params.patient_id = patientId;
    if (phone) params.phone = phone;
    
    const response = await apiClient.get('/mobile/profile', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};

// Get patient visits
export const getPatientVisits = async (params = {}) => {
  try {
    const response = await apiClient.get('/mobile/visits', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching visits:', error);
    throw error;
  }
};

// Get patient receipts
export const getPatientReceipts = async (params = {}) => {
  try {
    const response = await apiClient.get('/mobile/receipts', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching receipts:', error);
    throw error;
  }
};

// Get visit dates
export const getVisitDates = async (params = {}) => {
  try {
    const response = await apiClient.get('/mobile/visit-dates', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching visit dates:', error);
    throw error;
  }
};
```

### Usage in React Native Component

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { getPatientProfile, getPatientVisits } from './api';

const PatientProfileScreen = ({ patientId }) => {
  const [profile, setProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      // Load profile
      const profileData = await getPatientProfile(patientId);
      setProfile(profileData.data);

      // Load visits
      const visitsData = await getPatientVisits({ 
        patient_id: patientId, 
        page: 1, 
        limit: 20 
      });
      setVisits(visitsData.data);
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View>
      {profile && (
        <View>
          <Text>{profile.patient_name}</Text>
          <Text>Total Visits: {profile.total_visits}</Text>
          <Text>Total Receipts: {profile.total_receipts}</Text>
        </View>
      )}
      <FlatList
        data={visits}
        keyExtractor={(item) => item.visit_id}
        renderItem={({ item }) => (
          <View>
            <Text>Date: {new Date(item.date).toLocaleDateString()}</Text>
            <Text>Doctor: {item.doctor_name}</Text>
            <Text>Type: {item.visit_type}</Text>
          </View>
        )}
      />
    </View>
  );
};
```

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error information"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `400` - Bad Request (invalid parameters, missing required fields)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (patient not found)
- `500` - Internal Server Error

---

## Best Practices

1. **Pagination**: Always use pagination for large datasets. Recommended limit: 20-50 items per page.

2. **Caching**: Cache profile data and implement refresh mechanisms for better performance.

3. **Error Handling**: Always handle network errors and API errors gracefully.

4. **Loading States**: Show loading indicators while fetching data.

5. **Infinite Scroll**: Implement infinite scroll using `hasNextPage` from pagination metadata.

6. **Date Formatting**: Use ISO 8601 format (YYYY-MM-DD) for date parameters.

7. **Token Management**: Store authentication tokens securely and refresh them when expired.

---

## Testing with cURL

```bash
# Get patient profile
curl -X GET "http://localhost:6000/api/mobile/profile?patient_id=pat123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get patient visits
curl -X GET "http://localhost:6000/api/mobile/visits?patient_id=pat123&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get patient receipts
curl -X GET "http://localhost:6000/api/mobile/receipts?patient_id=pat123&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get visit dates
curl -X GET "http://localhost:6000/api/mobile/visit-dates?patient_id=pat123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Notes

- All endpoints aggregate data across all doctors for a given patient
- You can use either `patient_id` or `phone` to identify a patient
- Visits are sorted by date (most recent first) by default
- Receipts are nested within visits
- The profile endpoint provides a summary view of all patient data


