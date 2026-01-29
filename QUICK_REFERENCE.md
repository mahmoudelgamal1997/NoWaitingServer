# Patients API - Quick Reference

## Endpoint
```
GET /api/patients/doctor/:doctor_id
```

## Simple Usage Examples

### 1. Get All Patients (Original Behavior - Still Works!)
```
GET /api/patients/doctor/p9glvVX45eTZway7nOeS
```

### 2. Get Paginated Results
```
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?page=1&limit=20
```

### 3. Search by Name
```
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?search=Ahmed
```

### 4. Filter by Date Range
```
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?startDate=2024-01-01&endDate=2024-01-31
```

### 5. Filter by Status
```
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?status=WAITING
```

### 6. Sort by Name
```
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?sortBy=name&sortOrder=asc
```

### 7. Combine Everything
```
GET /api/patients/doctor/p9glvVX45eTZway7nOeS?page=1&limit=20&search=Ahmed&startDate=2024-01-01&endDate=2024-01-31&status=WAITING&sortBy=date&sortOrder=desc
```

## All Optional Parameters

- `page` - Page number (enables pagination)
- `limit` - Items per page (enables pagination)
- `search` - Search by name or phone
- `startDate` - Filter from date (YYYY-MM-DD)
- `endDate` - Filter to date (YYYY-MM-DD)
- `status` - Filter by status
- `sortBy` - Sort field: 'date', 'name', or 'createdAt'
- `sortOrder` - 'asc' or 'desc'

## Notes

✅ **All parameters are optional**  
✅ **Backward compatible** - existing code works without changes  
✅ **Pagination is optional** - omit page/limit to get all results


