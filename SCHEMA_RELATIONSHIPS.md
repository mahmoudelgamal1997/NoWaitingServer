# Database Schema & Relationships Documentation

## Overview
This project uses MongoDB with Mongoose ODM. The database consists of **2 main collections** with embedded sub-documents.

---

## Collections Overview

### 1. **Patient Collection** (`patients`)
Main collection for storing patient information and visit history.

### 2. **Doctor Collection** (`doctors`)
Collection for storing doctor information and settings.

---

## Detailed Schemas

### 📋 Patient Schema

**Collection Name:** `patients`  
**Model:** `Patient`

#### Core Patient Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `patient_name` | String | ✅ Yes | - | Full name of the patient |
| `patient_phone` | String | ✅ Yes | - | Phone number (used as identifier) |
| `patient_id` | String | ✅ Yes | - | Unique patient identifier (UUID) |
| `doctor_id` | String | ✅ Yes | - | Reference to doctor (string ID, not ObjectId) |
| `doctor_name` | String | No | `""` | Doctor name (cached for quick access) |
| `date` | String | No | Current date (YYYY-MM-DD) | Visit date |
| `time` | String | No | Current time (HH:mm) | Visit time |
| `status` | String | No | `"WAITING"` | Patient status (WAITING, IN_PROGRESS, COMPLETED, etc.) |
| `position` | Number | No | `0` | Queue position |
| `fcmToken` | String | No | `""` | Firebase Cloud Messaging token |
| `token` | String | No | `""` | Access token |
| `age` | String | No | `""` | Patient age |
| `address` | String | No | `""` | Patient address |
| `visit_type` | String | No | `"كشف"` | Type of visit (in Arabic) |
| `receipt` | String | No | `""` | Legacy receipt string (backward compatibility) |
| `all_visits` | Array[Visit] | No | `[]` | All visits array (alternative storage) |
| `user_order_in_queue` | Number | No | `0` | User's order in queue |
| `total_visits` | Number | No | `0` | Total number of visits |
| `user_uid` | String | No | `""` | User UID |
| `visit_speed` | String | No | `""` | Visit speed preference |
| `clinic_id` | String | No | `""` | Clinic identifier |
| `visits` | Array[Visit] | No | `[]` | **Main visits array** (embedded documents) |
| `createdAt` | Date | Auto | Current date | Creation timestamp |
| `updatedAt` | Date | Auto | Current date | Last update timestamp |

**Indexes:**
- `visits.visit_id`: Indexed for fast visit lookup

---

#### Visit Schema (Embedded in Patient)

**Nested in:** `Patient.visits[]` and `Patient.all_visits[]`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `visit_id` | String | No | - | Unique visit identifier (UUID) |
| `date` | Date | No | Current date | Visit date |
| `time` | String | No | Current time | Visit time (HH:mm format) |
| `visit_type` | String | No | `"كشف"` | Type of visit |
| `complaint` | String | No | `""` | Patient complaint |
| `diagnosis` | String | No | `""` | Doctor's diagnosis |
| `receipts` | Array[Receipt] | No | `[]` | **Receipts for this visit** (embedded) |
| `_id` | ObjectId | Auto | Generated | MongoDB document ID |

---

#### Receipt Schema (Embedded in Visit)

**Nested in:** `Visit.receipts[]`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `drugs` | Array[Drug] | No | `[]` | **Array of prescribed drugs** |
| `notes` | String | No | `""` | Additional notes |
| `date` | Date | No | Current date | Receipt creation date |
| `drugModel` | String | No | `"new"` | Drug model type |

---

#### Drug Schema (Embedded in Receipt)

**Nested in:** `Receipt.drugs[]`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `drug` | String | ✅ Yes | - | Drug name |
| `frequency` | String | ✅ Yes | - | Frequency of intake |
| `period` | String | ✅ Yes | - | Duration period |
| `timing` | String | ✅ Yes | - | Timing of intake |

---

### 👨‍⚕️ Doctor Schema

**Collection Name:** `doctors`  
**Model:** `Doctor`

#### Core Doctor Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `doctor_id` | String | ✅ Yes | - | Unique doctor identifier (indexed, unique) |
| `name` | String | No | `""` | Doctor's name |
| `email` | String | No | `""` | Doctor's email |
| `settings` | Object | No | `{}` | Doctor settings object (see below) |
| `createdAt` | Date | Auto | Current date | Creation timestamp |
| `updatedAt` | Date | Auto | Current date | Last update timestamp |

#### Settings Object (Nested in Doctor)

**Nested in:** `Doctor.settings`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `receiptHeader` | String | `""` | Header text for receipts |
| `receiptFooter` | String | `""` | Footer text for receipts |
| `clinicName` | String | `""` | Name of the clinic |
| `doctorTitle` | String | `""` | Doctor's title |
| `clinicAddress` | String | `""` | Clinic address |
| `clinicPhone` | String | `""` | Clinic phone number |
| `logoUrl` | String | `""` | Clinic logo URL |

**Indexes:**
- `doctor_id`: Unique index

---

## 🔗 Relationships

### Patient ↔ Doctor Relationship

```
Patient                    Doctor
--------                   ------
doctor_id (String) ──────→ doctor_id (String)
doctor_name (cached)       name
```

**Relationship Type:** 
- **Referential** (String reference, NOT MongoDB ObjectId reference)
- **One-to-Many**: One doctor can have many patients
- **Not enforced at database level** (no foreign key constraints)

**How it works:**
- `Patient.doctor_id` stores the doctor's ID as a string
- `Patient.doctor_name` is cached from `Doctor.name` for performance
- When saving a patient, if `doctor_name` is missing, the API looks up `Doctor.name` using `doctor_id`

---

### Embedded Document Relationships

```
Patient
  ├── visits[] (Array of Visit documents)
  │     ├── visit_id (String)
  │     ├── date, time, visit_type
  │     ├── complaint, diagnosis
  │     └── receipts[] (Array of Receipt documents)
  │           ├── drugs[] (Array of Drug documents)
  │           │     └── drug, frequency, period, timing
  │           ├── notes
  │           ├── date
  │           └── drugModel
  │
  └── all_visits[] (Alternative visits storage - same structure)
```

**Relationship Type:** 
- **Embedded Documents** (No separate collections)
- All nested data stored within the Patient document

---

## 📊 Data Structure Example

### Patient Document Example

```json
{
  "_id": ObjectId("..."),
  "patient_name": "mahmoud elgaml",
  "patient_phone": "01210187084",
  "patient_id": "mV6uoEHRu02juOcpfBYi",
  "doctor_id": "p9glvVX45eTZway7nOeS",
  "doctor_name": "Diaa Aglan",
  "date": "2026-1-17",
  "time": "١٣:٠٩",
  "status": "WAITING",
  "position": 24,
  "user_order_in_queue": 24,
  "total_visits": 0,
  "fcmToken": "fUZS23X6TwCBV5UIyjUE31:APA91b...",
  "token": "",
  "user_uid": "",
  "visit_speed": "عادي",
  "visit_type": "كشف",
  "age": "",
  "address": "",
  "clinic_id": "mx0BvggBOTQipRSnDqIi",
  "visits": [
    {
      "_id": ObjectId("..."),
      "visit_id": "abc-123-xyz",
      "date": ISODate("2026-01-17"),
      "time": "13:09",
      "visit_type": "كشف",
      "complaint": "Headache",
      "diagnosis": "Migraine",
      "receipts": [
        {
          "drugs": [
            {
              "drug": "Paracetamol",
              "frequency": "3 times daily",
              "period": "5 days",
              "timing": "After meals"
            }
          ],
          "notes": "Rest well",
          "date": ISODate("2026-01-17"),
          "drugModel": "new"
        }
      ]
    }
  ],
  "all_visits": [],
  "receipt": "",
  "createdAt": ISODate("2026-01-17"),
  "updatedAt": ISODate("2026-01-17"),
  "__v": 0
}
```

### Doctor Document Example

```json
{
  "_id": ObjectId("..."),
  "doctor_id": "p9glvVX45eTZway7nOeS",
  "name": "Diaa Aglan",
  "email": "doctor@example.com",
  "settings": {
    "receiptHeader": "Medical Clinic",
    "receiptFooter": "Thank you for visiting",
    "clinicName": "ABC Medical Center",
    "doctorTitle": "MD",
    "clinicAddress": "123 Main St",
    "clinicPhone": "0123456789",
    "logoUrl": "https://example.com/logo.png"
  },
  "createdAt": ISODate("2026-01-01"),
  "updatedAt": ISODate("2026-01-17")
}
```

---

## 🔍 Key Relationships Summary

| From | To | Relationship | Type | Key Field |
|------|----|--------------|------|-----------|
| Patient | Doctor | Many-to-One | Referential (String) | `doctor_id` |
| Patient | Visit | One-to-Many | Embedded | `visits[]` |
| Patient | Visit | One-to-Many | Embedded | `all_visits[]` |
| Visit | Receipt | One-to-Many | Embedded | `receipts[]` |
| Receipt | Drug | One-to-Many | Embedded | `drugs[]` |
| Doctor | Settings | One-to-One | Embedded | `settings` |

---

## 📌 Important Notes

1. **No Foreign Key Constraints**: The `doctor_id` in Patient is just a string reference. Database doesn't enforce referential integrity.

2. **Patient Uniqueness**: Patients are identified by `patient_phone` + `doctor_id` combination (not enforced by unique index, handled in application logic).

3. **Multiple Patient Records**: Same patient (same phone) can have multiple records for different doctors.

4. **Embedded vs Referenced**: All visit/receipt/drug data is embedded in Patient document, not stored in separate collections.

5. **Visit ID**: Each visit has a `visit_id` (UUID string) for identification, in addition to MongoDB's `_id`.

6. **Backward Compatibility**: The `receipt` string field exists for legacy support, but the primary data structure uses `visits[].receipts[]`.

7. **Data Aggregation**: The API can aggregate patient data across multiple doctors when querying by `patient_phone` or `patient_id`.

---

## 🎯 Query Patterns

### Common Queries

1. **Get patients by doctor:**
   ```javascript
   Patient.find({ doctor_id: "doctor123" })
   ```

2. **Get patient by phone and doctor:**
   ```javascript
   Patient.findOne({ patient_phone: "0123456789", doctor_id: "doctor123" })
   ```

3. **Get patient with specific visit:**
   ```javascript
   Patient.findOne({ "visits.visit_id": "visit123" })
   ```

4. **Get doctor by ID:**
   ```javascript
   Doctor.findOne({ doctor_id: "doctor123" })
   ```

5. **Get all patients across doctors (by phone):**
   ```javascript
   Patient.find({ patient_phone: "0123456789" })
   ```

---

## 📚 Related Files

- **Models:** `models/patient.js`, `models/doctor.js`
- **Controllers:** `controllers/patientController.js`, `controllers/doctorController.js`
- **Routes:** `routes/patientRoutes.js`, `routes/doctorRoutes.js`

---

*Last Updated: January 2026*

