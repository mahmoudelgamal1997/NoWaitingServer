# Patients API - Usage Guide

## Endpoint

```
GET /api/patients/doctor/:doctor_id
```

## Overview

This endpoint retrieves patients for a specific doctor with optional filtering, pagination, and search capabilities. All query parameters are optional, making it flexible for different use cases.

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | - | Page number (enables pagination when provided) |
| `limit` | number | No | - | Items per page (enables pagination when provided) |
| `search` | string | No | - | Search by patient name or phone number (case-insensitive) |
| `startDate` | string | No | - | Filter patients from this date (ISO format: YYYY-MM-DD) |
| `endDate` | string | No | - | Filter patients to this date (ISO format: YYYY-MM-DD) |
| `status` | string | No | - | Filter by patient status (e.g., 'WAITING', 'COMPLETED', etc.) |
| `sortBy` | string | No | 'date' | Sort by: 'date', 'name', or 'createdAt' |
| `sortOrder` | string | No | 'desc' | Sort order: 'asc' or 'desc' |

## Important Notes

- **Pagination is optional**: If you don't provide `page` or `limit`, all matching results will be returned.
- **Backward compatible**: The API maintains backward compatibility. If no query parameters are provided, it returns all patients (old behavior).

## Usage Examples

### 1. Get All Patients (No Filters, No Pagination)

```bash
GET /api/patients/doctor/p9glvVX45eTZway7nOeS
```

**Response:**
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [...],
  "totalItems": 150,
  "filters": {
    "doctor_id": "p9glvVX45eTZway7nOeS",
    "search": null,
    "startDate": null,
    "endDate": null,
    "status": null,
    "sortBy": "date",
    "sortOrder": "desc"
  }
}
```

### 2. Get Paginated Results

```bash
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [...],
  "totalItems": 150,
  "pagination": {
    "currentPage": 1,
    "totalPages": 8,
    "totalItems": 150,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "doctor_id": "p9glvVX45eTZway7nOeS",
    "search": null,
    "startDate": null,
    "endDate": null,
    "status": null,
    "sortBy": "date",
    "sortOrder": "desc"
  }
}
```

### 3. Search by Name

```bash
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?search=Ahmed
```

This will search for patients whose name or phone contains "Ahmed" (case-insensitive).

### 4. Filter by Date Range

```bash
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?startDate=2024-01-01&endDate=2024-01-31
```

### 5. Filter by Status

```bash
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?status=WAITING
```

### 6. Combined Filters with Pagination

```bash
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?page=1&limit=20&search=Ahmed&startDate=2024-01-01&endDate=2024-01-31&status=WAITING&sortBy=name&sortOrder=asc
```

### 7. Sort by Name (Ascending)

```bash
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?sortBy=name&sortOrder=asc
```

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
// Get all patients
const response = await fetch('https://nowaiting-076a4d0af321.herokuapp.com/api/patients/doctor/p9glvVX45eTZway7nOeS');
const data = await response.json();

// Get paginated results
const response = await fetch('https://nowaiting-076a4d0af321.herokuapp.com/api/patients/doctor/p9glvVX45eTZway7nOeS?page=1&limit=20');
const data = await response.json();

// Search by name
const response = await fetch('https://nowaiting-076a4d0af321.herokuapp.com/api/patients/doctor/p9glvVX45eTZway7nOeS?search=Ahmed');
const data = await response.json();

// Filter by date range
const response = await fetch('https://nowaiting-076a4d0af321.herokuapp.com/api/patients/doctor/p9glvVX45eTZway7nOeS?startDate=2024-01-01&endDate=2024-01-31');
const data = await response.json();
```

### Using Axios

```javascript
import axios from 'axios';

// Get all patients
const response = await axios.get('https://nowaiting-076a4d0af321.herokuapp.com/api/patients/doctor/p9glvVX45eTZway7nOeS');
const patients = response.data.data;

// Get paginated results with filters
const response = await axios.get('https://nowaiting-076a4d0af321.herokuapp.com/api/patients/doctor/p9glvVX45eTZway7nOeS', {
  params: {
    page: 1,
    limit: 20,
    search: 'Ahmed',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'WAITING',
    sortBy: 'date',
    sortOrder: 'desc'
  }
});
const { data, pagination, filters } = response.data;
```

### React Example with Hooks

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

function PatientsList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    status: '',
    page: 1,
    limit: 20
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = {
        page: filters.page,
        limit: filters.limit,
        sortBy: 'date',
        sortOrder: 'desc'
      };

      // Add optional filters
      if (filters.search) params.search = filters.search;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;

      const response = await axios.get(
        `https://nowaiting-076a4d0af321.herokuapp.com/api/patients/doctor/p9glvVX45eTZway7nOeS`,
        { params }
      );

      setPatients(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [filters]);

  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```

## Response Format

### Without Pagination

```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [...],
  "totalItems": 150,
  "filters": {
    "doctor_id": "p9glvVX45eTZway7nOeS",
    "search": null,
    "startDate": null,
    "endDate": null,
    "status": null,
    "sortBy": "date",
    "sortOrder": "desc"
  }
}
```

### With Pagination

```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [...],
  "totalItems": 150,
  "pagination": {
    "currentPage": 1,
    "totalPages": 8,
    "totalItems": 150,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "doctor_id": "p9glvVX45eTZway7nOeS",
    "search": "Ahmed",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "status": "WAITING",
    "sortBy": "date",
    "sortOrder": "desc"
  }
}
```

## Error Responses

```json
{
  "success": false,
  "message": "Error retrieving patients",
  "error": "Error details here"
}
```

## Best Practices

1. **Use pagination for large datasets**: Always use pagination when expecting many results to improve performance.

2. **Combine filters efficiently**: Use multiple filters together to narrow down results on the server side.

3. **Date format**: Always use ISO format (YYYY-MM-DD) for dates.

4. **Search performance**: The search is case-insensitive and searches both name and phone fields.

5. **Backward compatibility**: The API maintains backward compatibility - existing code will continue to work without changes.

