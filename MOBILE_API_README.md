# Patient History API - Mobile Integration Guide

This guide provides comprehensive documentation for integrating the Patient History API with your mobile application.

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

**Note:** Currently, the authentication middleware is a placeholder. Implement your actual authentication logic in the routes.

---

## History API Endpoints

### 1. Get All History (Paginated)

Retrieve comprehensive patient history with pagination support.

**Endpoint:** `GET /api/history`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `doctor_id` | string | No | - | Filter by doctor ID |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page (max recommended: 50) |
| `startDate` | string | No | - | Filter visits from this date (ISO format: YYYY-MM-DD) |
| `endDate` | string | No | - | Filter visits to this date (ISO format: YYYY-MM-DD) |
| `search` | string | No | - | Search by patient name or phone |
| `sortBy` | string | No | 'date' | Sort by: 'date', 'name', 'visitCount' |
| `sortOrder` | string | No | 'desc' | Sort order: 'asc' or 'desc' |

**Example Request:**

```http
GET /api/history?doctor_id=doc123&page=1&limit=20&sortBy=date&sortOrder=desc
Authorization: Bearer YOUR_TOKEN
```

**Example Response:**

```json
{
  "success": true,
  "message": "History retrieved successfully",
  "data": [
    {
      "patient_id": "pat-123",
      "patient_name": "Ahmed Mohamed",
      "patient_phone": "01234567890",
      "age": "35",
      "address": "Cairo, Egypt",
      "doctor_id": "doc123",
      "doctor_name": "Dr. Ali",
      "status": "WAITING",
      "total_visits": 5,
      "last_visit_date": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-01T08:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z",
      "visits": [
        {
          "visit_id": "visit-456",
          "date": "2024-01-15T10:30:00.000Z",
          "time": "10:30",
          "visit_type": "كشف",
          "complaint": "Headache",
          "diagnosis": "Migraine",
          "receipts_count": 2,
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
              "date": "2024-01-15T10:30:00.000Z",
              "drugModel": "new"
            }
          ]
        }
      ]
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
    "doctor_id": "doc123",
    "startDate": null,
    "endDate": null,
    "search": null,
    "sortBy": "date",
    "sortOrder": "desc"
  }
}
```

---

### 2. Get History Summary

Get statistics and summary of all history data.

**Endpoint:** `GET /api/history/summary`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doctor_id` | string | No | Filter by doctor ID |
| `startDate` | string | No | Filter from date (ISO format) |
| `endDate` | string | No | Filter to date (ISO format) |

**Example Request:**

```http
GET /api/history/summary?doctor_id=doc123
Authorization: Bearer YOUR_TOKEN
```

**Example Response:**

```json
{
  "success": true,
  "message": "History summary retrieved successfully",
  "summary": {
    "totalPatients": 150,
    "totalVisits": 450,
    "totalReceipts": 320,
    "averageVisitsPerPatient": "3.00",
    "visitsByType": {
      "كشف": 300,
      "متابعة": 100,
      "استشارة": 50
    },
    "recentVisits": [
      {
        "visit_id": "visit-789",
        "patient_name": "Sara Ali",
        "patient_phone": "01123456789",
        "date": "2024-01-20T14:00:00.000Z",
        "visit_type": "كشف",
        "doctor_id": "doc123"
      }
    ]
  },
  "filters": {
    "doctor_id": "doc123",
    "startDate": null,
    "endDate": null
  }
}
```

---

### 3. Get All Visits (Flat List)

Get a flat list of all visits across all patients with pagination.

**Endpoint:** `GET /api/history/visits`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `doctor_id` | string | No | - | Filter by doctor ID |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |
| `startDate` | string | No | - | Filter from date (ISO format) |
| `endDate` | string | No | - | Filter to date (ISO format) |
| `visit_type` | string | No | - | Filter by visit type |
| `search` | string | No | - | Search by patient name or phone |

**Example Request:**

```http
GET /api/history/visits?doctor_id=doc123&page=1&limit=20&visit_type=كشف
Authorization: Bearer YOUR_TOKEN
```

**Example Response:**

```json
{
  "success": true,
  "message": "All visits retrieved successfully",
  "data": [
    {
      "visit_id": "visit-456",
      "date": "2024-01-15T10:30:00.000Z",
      "time": "10:30",
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
          "date": "2024-01-15T10:30:00.000Z",
          "drugModel": "new"
        }
      ],
      "patient": {
        "patient_id": "pat-123",
        "patient_name": "Ahmed Mohamed",
        "patient_phone": "01234567890",
        "age": "35",
        "address": "Cairo, Egypt"
      },
      "doctor_id": "doc123",
      "doctor_name": "Dr. Ali"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 25,
    "totalItems": 500,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "filters": {
    "doctor_id": "doc123",
    "startDate": null,
    "endDate": null,
    "visit_type": "كشف",
    "search": null
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
apiClient.interceptors.request.use((config) => {
  const token = AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get all history with pagination
export const getHistory = async (params = {}) => {
  try {
    const response = await apiClient.get('/history', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
    throw error;
  }
};

// Get history summary
export const getHistorySummary = async (doctorId) => {
  try {
    const response = await apiClient.get('/history/summary', {
      params: { doctor_id: doctorId },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching summary:', error);
    throw error;
  }
};

// Get all visits
export const getAllVisits = async (params = {}) => {
  try {
    const response = await apiClient.get('/history/visits', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching visits:', error);
    throw error;
  }
};
```

### Usage in React Native Component

```javascript
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, ActivityIndicator } from 'react-native';
import { getHistory } from './api';

const HistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadHistory = async (pageNum = 1) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await getHistory({
        doctor_id: 'doc123',
        page: pageNum,
        limit: 20,
        sortBy: 'date',
        sortOrder: 'desc',
      });

      if (pageNum === 1) {
        setHistory(response.data);
      } else {
        setHistory([...history, ...response.data]);
      }

      setHasMore(response.pagination.hasNextPage);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, []);

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadHistory(nextPage);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.patientCard}>
      <Text style={styles.patientName}>{item.patient_name}</Text>
      <Text style={styles.patientPhone}>{item.patient_phone}</Text>
      <Text>Total Visits: {item.total_visits}</Text>
      <Text>Last Visit: {new Date(item.last_visit_date).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <FlatList
      data={history}
      renderItem={renderItem}
      keyExtractor={(item) => item.patient_id}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading && <ActivityIndicator />}
    />
  );
};
```

### Flutter/Dart Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class HistoryApiService {
  final String baseUrl = 'http://localhost:6000/api';
  String? authToken;

  Future<Map<String, dynamic>> getHistory({
    String? doctorId,
    int page = 1,
    int limit = 20,
    String? startDate,
    String? endDate,
    String? search,
    String sortBy = 'date',
    String sortOrder = 'desc',
  }) async {
    final uri = Uri.parse('$baseUrl/history').replace(queryParameters: {
      if (doctorId != null) 'doctor_id': doctorId,
      'page': page.toString(),
      'limit': limit.toString(),
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (search != null) 'search': search,
      'sortBy': sortBy,
      'sortOrder': sortOrder,
    });

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load history');
    }
  }

  Future<Map<String, dynamic>> getHistorySummary({
    String? doctorId,
    String? startDate,
    String? endDate,
  }) async {
    final uri = Uri.parse('$baseUrl/history/summary').replace(queryParameters: {
      if (doctorId != null) 'doctor_id': doctorId,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
    });

    final response = await http.get(
      uri,
      headers: {
        'Content-Type': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load summary');
    }
  }
}
```

### Swift/iOS Example

```swift
import Foundation

class HistoryAPIService {
    let baseURL = "http://localhost:6000/api"
    var authToken: String?
    
    func getHistory(
        doctorId: String? = nil,
        page: Int = 1,
        limit: Int = 20,
        startDate: String? = nil,
        endDate: String? = nil,
        search: String? = nil,
        sortBy: String = "date",
        sortOrder: String = "desc",
        completion: @escaping (Result<HistoryResponse, Error>) -> Void
    ) {
        var components = URLComponents(string: "\(baseURL)/history")!
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "sortBy", value: sortBy),
            URLQueryItem(name: "sortOrder", value: sortOrder)
        ]
        
        if let doctorId = doctorId {
            queryItems.append(URLQueryItem(name: "doctor_id", value: doctorId))
        }
        if let startDate = startDate {
            queryItems.append(URLQueryItem(name: "startDate", value: startDate))
        }
        if let endDate = endDate {
            queryItems.append(URLQueryItem(name: "endDate", value: endDate))
        }
        if let search = search {
            queryItems.append(URLQueryItem(name: "search", value: search))
        }
        
        components.queryItems = queryItems
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "No data", code: -1)))
                return
            }
            
            do {
                let historyResponse = try JSONDecoder().decode(HistoryResponse.self, from: data)
                completion(.success(historyResponse))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}

struct HistoryResponse: Codable {
    let success: Bool
    let message: String
    let data: [PatientHistory]
    let pagination: Pagination
    let filters: Filters
}

struct PatientHistory: Codable {
    let patientId: String
    let patientName: String
    let patientPhone: String
    let age: String
    let address: String
    let doctorId: String
    let doctorName: String
    let status: String
    let totalVisits: Int
    let lastVisitDate: String?
    let createdAt: String
    let updatedAt: String
    let visits: [Visit]
    
    enum CodingKeys: String, CodingKey {
        case patientId = "patient_id"
        case patientName = "patient_name"
        case patientPhone = "patient_phone"
        case age, address
        case doctorId = "doctor_id"
        case doctorName = "doctor_name"
        case status
        case totalVisits = "total_visits"
        case lastVisitDate = "last_visit_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case visits
    }
}

struct Pagination: Codable {
    let currentPage: Int
    let totalPages: Int
    let totalItems: Int
    let itemsPerPage: Int
    let hasNextPage: Bool
    let hasPrevPage: Bool
    let nextPage: Int?
    let prevPage: Int?
}
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
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Best Practices

1. **Pagination**: Always use pagination for large datasets. Recommended limit: 20-50 items per page.

2. **Caching**: Cache summary data and implement refresh mechanisms for better performance.

3. **Error Handling**: Always handle network errors and API errors gracefully.

4. **Loading States**: Show loading indicators while fetching data.

5. **Infinite Scroll**: Implement infinite scroll using `hasNextPage` from pagination metadata.

6. **Date Formatting**: Use ISO 8601 format (YYYY-MM-DD) for date parameters.

7. **Search Debouncing**: Implement debouncing for search queries to reduce API calls.

8. **Token Management**: Store authentication tokens securely and refresh them when expired.

---

## Testing

### Using cURL

```bash
# Get history
curl -X GET "http://localhost:6000/api/history?doctor_id=doc123&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get summary
curl -X GET "http://localhost:6000/api/history/summary?doctor_id=doc123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get all visits
curl -X GET "http://localhost:6000/api/history/visits?doctor_id=doc123&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Using Postman

1. Create a new GET request
2. Set URL: `http://localhost:6000/api/history`
3. Add query parameters
4. Add header: `Authorization: Bearer YOUR_TOKEN`
5. Send request

---

## Support

For issues or questions, please contact the development team or create an issue in the repository.

---

## Changelog

### Version 1.0.0
- Initial release
- History API with pagination
- Summary endpoint
- All visits endpoint

